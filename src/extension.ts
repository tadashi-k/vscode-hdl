// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import AntlrVerilogParser = require('./verilog-parser');
import { parseHdlIgnore, regexScanModules } from './verilog-scanner';
import AntlrVhdlParser = require('./vhdl-parser');
import { regexScanEntities } from './vhdl-scanner';
import { computeSemanticTokens, TOKEN_TYPES, TOKEN_MODIFIERS } from './semantic-tokens';
import { Module, ModuleDatabase } from './database';
import { buildInstantiationSnippet, buildVhdlInstantiationSnippet } from './instantiation-snippet';
import { isInsideProceduralBlock } from './context-detector';
import { formatVerilog } from './verilog-formatter';

/**
 * File reader for `include directive expansion in the VS Code extension context.
 * Returns the file content as a string, or null if the file cannot be read.
 */
function fsFileReader(resolvedPath: string): string | null {
    try {
        return fs.readFileSync(resolvedPath, 'utf8');
    } catch (_) {
        return null;
    }
}

// Create a single unified module database and parser instance
const moduleDatabase = new ModuleDatabase();
const verilogParser = new AntlrVerilogParser();
const vhdlParser = new AntlrVhdlParser();

/**
 * Persists the lightweight module entries obtained from the regex scan so
 * that they can be restored into the module database when a document is
 * closed (and its ANTLR-parsed symbols are removed).
 * Key: file URI string  →  Value: array of lightweight module descriptors
 */
const regexModuleMap = new Map<string, Array<{ name: string; uri: string; line: number; character: number }>>();

/**
 * Load .hdlignore files from every workspace folder and return a predicate
 * that returns true when an absolute file-system path should be excluded
 * from scanning.
 */
async function loadHdlIgnoreFilter(): Promise<(fsPath: string) => boolean> {
    const filters: Array<{ rootPath: string; test: (relPath: string) => boolean }> = [];

    if (vscode.workspace.workspaceFolders) {
        for (const folder of vscode.workspace.workspaceFolders) {
            const hdlIgnoreUri = vscode.Uri.joinPath(folder.uri, '.hdlignore');
            try {
                const bytes = await vscode.workspace.fs.readFile(hdlIgnoreUri);
                const content = Buffer.from(bytes).toString('utf8');
                filters.push({
                    rootPath: folder.uri.fsPath.replace(/\\/g, '/'),
                    test: parseHdlIgnore(content),
                });
                console.log(`Loaded .hdlignore from ${folder.uri.fsPath}`);
            } catch {
                // .hdlignore not present in this folder – that is fine.
            }
        }
    }

    if (filters.length === 0) {
        return () => false;
    }

    return (fsPath: string) => {
        const normalised = fsPath.replace(/\\/g, '/');
        for (const { rootPath, test } of filters) {
            const prefix = rootPath.endsWith('/') ? rootPath : rootPath + '/';
            if (!normalised.startsWith(prefix)) {
                // File is not under this workspace folder – skip this filter.
                continue;
            }
            const relPath = normalised.slice(prefix.length);
            if (test(relPath)) {
                return true;
            }
        }
        return false;
    };
}

/**
 * Update symbols for a document using the ANTLR-based parser.
 * Populates the unified ModuleDatabase with scanned Module objects.
 * @param {vscode.TextDocument} document 
 */
function updateDocumentSymbols(document: vscode.TextDocument) {
    const lang = document.languageId;
    if (lang !== 'verilog' && lang !== 'vhdl') return;

    const uri = document.uri.toString();

    const currentModules = moduleDatabase.getModulesByUri(uri);

    if (lang === 'vhdl') {
        vhdlParser.parseSymbols(document, moduleDatabase, fsFileReader);
    } else {
        verilogParser.parseSymbols(document, moduleDatabase, fsFileReader);
    }

    // Remove modules that were previously parsed from this file but are no longer present after re-parsing
    for (const mod of currentModules) {
        if (!moduleDatabase.getModule(mod.name)) {
            moduleDatabase.removeModule(mod.name);
        }
    }
}

function updateDocumentModules(document: vscode.TextDocument) {
    const lang = document.languageId;
    if (lang !== 'verilog' && lang !== 'vhdl') return;

    const uri = document.uri.toString();

    const currentModules = moduleDatabase.getModulesByUri(uri);

    if (lang === 'vhdl') {
        vhdlParser.parseModules(document, moduleDatabase, fsFileReader);
    } else {
        verilogParser.parseModules(document, moduleDatabase, fsFileReader);
    }

    // Remove modules that were previously parsed from this file but are no longer present after re-parsing
    for (const mod of currentModules) {
        if (!moduleDatabase.getModule(mod.name)) {
            moduleDatabase.removeModule(mod.name);
        }
    }
}

/**
 * Ensure that port information for all modules instantiated in the given
 * document is available in the module database.  When a module only has a
 * lightweight regex-scanned entry (scanned === false), its source file is
 * read and ANTLR-parsed so that full port information becomes available for
 * downstream diagnostics (signal warning generation).
 */
async function ensureInstanceDependenciesParsed(document: vscode.TextDocument) {
    if (document.languageId !== 'verilog' && document.languageId !== 'vhdl') return;
    // Instance data is tracked internally by the parser visitor.
    // Get the instances recorded in the last parse of this document.
    const visitor = document.languageId === 'vhdl' ? vhdlParser._lastVisitor : verilogParser._lastVisitor;
    if (!visitor) return;

    const instanced = new Set<string>();
    for (const moduleName of visitor.allModuleRefs) {
        instanced.add(moduleName);
    }

    const uri = document.uri.toString();
    for (const moduleName of instanced) {
        const mod = moduleDatabase.getModule(moduleName);
        if (mod && !mod.scanned && mod.uri && mod.uri !== uri) {
            try {
                const depUri = vscode.Uri.parse(mod.uri);
                const bytes = await vscode.workspace.fs.readFile(depUri);
                const content = Buffer.from(bytes).toString('utf8');
                const depDoc: any = {
                    getText: () => content,
                    uri: { toString: () => mod.uri },
                    languageId: (mod.uri.endsWith('.vhd') || mod.uri.endsWith('.vhdl')) ? 'vhdl' : 'verilog',
                };
                updateDocumentSymbols(depDoc);
            } catch (error) {
                console.error(`Error parsing dependency ${moduleName} from ${mod.uri}:`, error);
            }
        }
    }
}

/**
 * Document Symbol Provider for Verilog
 */
class VerilogDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.DocumentSymbol[] {
        if (document.languageId === 'vhdl') {
            vhdlParser.parseSymbols(document, moduleDatabase, fsFileReader);
        } else {
            verilogParser.parseSymbols(document, moduleDatabase, fsFileReader);
        }

        const modules = moduleDatabase.getModulesByUri(document.uri.toString());
        return modules.map((module: any) => {
            const line = document.lineAt(module.line);
            const moduleRange = new vscode.Range(
                new vscode.Position(module.line, line.firstNonWhitespaceCharacterIndex),
                new vscode.Position(module.endLine >= 0 ? module.endLine : module.line, 0)
            );
            const moduleSelectionRange = new vscode.Range(
                new vscode.Position(module.line, line.firstNonWhitespaceCharacterIndex),
                new vscode.Position(module.line, line.text.length)
            );
            const moduleSym = new vscode.DocumentSymbol(module.name, 'module', vscode.SymbolKind.Module, moduleRange, moduleSelectionRange);

            moduleSym.children = module.instanceList.map((inst: any) => {
                const instLine = document.lineAt(inst.line);
                const instRange = new vscode.Range(
                    new vscode.Position(inst.line, inst.character),
                    new vscode.Position(inst.line, instLine.text.length)
                );
                return new vscode.DocumentSymbol(inst.instanceName, inst.moduleName, vscode.SymbolKind.Module, instRange, instRange);
            });

            return moduleSym;
        });
    }
}

/**
 * Scan workspace for all .v files and parse their modules.
 *
 * Strategy (to keep startup fast for large projects):
 * 1. Read .hdlignore and build a filter for excluded paths.
 * 2. Regex-scan ALL .v files to build a lightweight module-name → location
 *    index.  This is fast because it uses a simple regex, not a full parse.
 * 3. ANTLR-parse the currently open files so that their full symbol
 *    information (signals, instances, parameters, ports) is available.
 * 4. From the instance lists of those open files, collect the set of
 *    instantiated module names and ANTLR-parse only the files that define
 *    those modules (if they are not already open).
 *
 * @returns {Promise<void>}
 */
async function scanWorkspaceForModules() {
    console.log('Scanning workspace for Verilog modules...');

    // --- Step 1: build the .hdlignore filter ---
    const isIgnored = await loadHdlIgnoreFilter();

    // --- Step 2: regex-scan all .v files ---
    // Do not pass an explicit exclude — omitting it makes VS Code apply the
    // workspace's "files.exclude" (and "search.exclude") settings, so
    // generated directories (out/, build/, sim/, …) are skipped automatically.
    const verilogFiles = await vscode.workspace.findFiles('**/*.v');
    const filteredFiles = verilogFiles.filter(f => !isIgnored(f.fsPath));
    console.log(`Found ${filteredFiles.length} Verilog files (after .hdlignore filtering)`);

    regexModuleMap.clear();
    for (const fileUri of filteredFiles) {
        try {
            const bytes = await vscode.workspace.fs.readFile(fileUri);
            const content = Buffer.from(bytes).toString('utf8');
            const uri = fileUri.toString();
            const found = regexScanModules(content, uri);
            if (found.length > 0) {
                regexModuleMap.set(uri, found);
                for (const entry of found) {
                    // Only add if not already present (ANTLR entry takes priority).
                    if (!moduleDatabase.getModule(entry.name)) {
                        moduleDatabase.addModule(
                            new Module(entry.name, entry.uri, entry.line, entry.character, -1, false)
                        );
                    }
                }
            }
        } catch (error) {
            console.error(`Error in regex scan of ${fileUri.toString()}:`, error);
        }
    }
    console.log(`Regex scan complete: ${regexModuleMap.size} files with modules indexed`);

    // --- Step 2b: regex-scan all VHDL files ---
    const vhdlFiles = await vscode.workspace.findFiles('**/*.{vhd,vhdl}');
    const filteredVhdlFiles = vhdlFiles.filter((f: vscode.Uri) => !isIgnored(f.fsPath));
    console.log(`Found ${filteredVhdlFiles.length} VHDL files (after .hdlignore filtering)`);

    for (const fileUri of filteredVhdlFiles) {
        try {
            const bytes = await vscode.workspace.fs.readFile(fileUri);
            const content = Buffer.from(bytes).toString('utf8');
            const uri = fileUri.toString();
            const found = regexScanEntities(content, uri);
            if (found.length > 0) {
                regexModuleMap.set(uri, found);
                for (const entry of found) {
                    if (!moduleDatabase.getModule(entry.name)) {
                        moduleDatabase.addModule(
                            new Module(entry.name, entry.uri, entry.line, entry.character, -1, false)
                        );
                    }
                }
            }
        } catch (error) {
            console.error(`Error in regex scan of ${fileUri.toString()}:`, error);
        }
    }

    // --- Step 3: ANTLR-parse currently open HDL documents + collect instance refs ---
    const openUris = new Set<string>();
    const neededModuleNames = new Set<string>();
    for (const document of vscode.workspace.textDocuments) {
        if (document.languageId === 'verilog' || document.languageId === 'vhdl') {
            updateDocumentSymbols(document);
            openUris.add(document.uri.toString());
            const vis: any = document.languageId === 'vhdl'
                ? vhdlParser._lastVisitor
                : verilogParser._lastVisitor;
            if (vis) {
                for (const name of vis.allModuleRefs ?? []) {
                    neededModuleNames.add(name);
                }
            }
        }
    }

    // --- Step 4: resolve instances from open files and ANTLR-parse their deps ---

    for (const moduleName of neededModuleNames) {
        const mod = moduleDatabase.getModule(moduleName);
        if (mod && !mod.scanned && mod.uri && !openUris.has(mod.uri)) {
            try {
                // Read the file directly instead of opening it as a VS Code
                // TextDocument.  openTextDocument() would fire onDidOpenTextDocument
                // which calls ensureInstanceDependenciesParsed again, causing a
                // cascade of synchronous parses during startup.
                const depUri = vscode.Uri.parse(mod.uri);
                const bytes = await vscode.workspace.fs.readFile(depUri);
                const content = Buffer.from(bytes).toString('utf8');
                const depDoc: any = {
                    getText: () => content,
                    uri: { toString: () => mod.uri },
                    languageId: (mod.uri.endsWith('.vhd') || mod.uri.endsWith('.vhdl')) ? 'vhdl' : 'verilog',
                };
                updateDocumentModules(depDoc);
                openUris.add(mod.uri);
            } catch (error) {
                console.error(`Error parsing dependency ${mod.uri}:`, error);
            }
        }
    }

    console.log('Workspace scan complete');
}

/**
 * Definition Provider for Verilog
 */
class VerilogDefinitionProvider implements vscode.DefinitionProvider {
    provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.Location | null {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return null;
        }
        
        const word = document.getText(wordRange);
        
        // Check for module definitions in the module database (workspace-wide)
        const moduleSymbol = moduleDatabase.getModule(word);
        
        if (moduleSymbol) {
            const uri = vscode.Uri.parse(moduleSymbol.uri);
            const pos = new vscode.Position(moduleSymbol.line, moduleSymbol.character || 0);
            return new vscode.Location(uri, pos);
        }

        // Check for signal/parameter definitions in the current module
        const docUri = document.uri.toString();
        const currentModule = moduleDatabase.getModuleByUriPosition(docUri, position.line);
        if (currentModule) {
            const def = currentModule.definitionMap.get(word);
            if (def) {
                const uri = vscode.Uri.parse(currentModule.uri);
                const pos = new vscode.Position(def.line, def.character);
                return new vscode.Location(uri, pos);
            }
        }
        
        return null;
    }
}

/**
 * Semantic Token Provider for Verilog
 *
 * Uses the signal and parameter databases to provide semantic tokens for
 * identifiers, enabling color-coding based on signal type (reg, wire,
 * integer) rather than relying solely on regex-based TextMate grammars.
 */
const semanticTokensLegend = new vscode.SemanticTokensLegend(TOKEN_TYPES, TOKEN_MODIFIERS);

class VerilogSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
    private _onDidChangeSemanticTokens = new vscode.EventEmitter<void>();
    readonly onDidChangeSemanticTokens = this._onDidChangeSemanticTokens.event;

    /** Notify VS Code that semantic tokens may have changed. */
    notifyChanged() {
        this._onDidChangeSemanticTokens.fire();
    }

    provideDocumentSemanticTokens(document: vscode.TextDocument): vscode.SemanticTokens {
        const uri = document.uri.toString();
        const modules = moduleDatabase.getModulesByUri(uri);
        const tokenData = computeSemanticTokens(document.getText(), modules);

        const builder = new vscode.SemanticTokensBuilder(semanticTokensLegend);
        for (const t of tokenData) {
            builder.push(
                new vscode.Range(
                    new vscode.Position(t.line, t.character),
                    new vscode.Position(t.line, t.character + t.length),
                ),
                t.tokenType,
                t.tokenModifiers,
            );
        }
        return builder.build();
    }
}

/**
 * Completion Item Provider for Verilog.
 *
 * Context-aware behaviour:
 *  - Inside an `always` or `initial` block: suggests the wire, reg, integer,
 *    parameter, and localparam signals defined in the enclosing module.
 *  - Outside procedural blocks (module body): suggests module instantiation
 *    snippets for every module in the workspace database.
 */
class VerilogCompletionItemProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken,
        _context: vscode.CompletionContext
    ): vscode.CompletionItem[] {
        const offset = document.offsetAt(position);

        if (isInsideProceduralBlock(document.getText(), offset)) {
            return this._signalCompletions(document, position);
        }

        return this._instantiationCompletions(document);
    }

    /** Completions for signals inside always/initial blocks. */
    private _signalCompletions(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];
        const docUri = document.uri.toString();
        const mod = moduleDatabase.getModuleByUriPosition(docUri, position.line);
        if (!mod) {
            return items;
        }

        const kindMap: Record<string, vscode.CompletionItemKind> = {
            wire:       vscode.CompletionItemKind.Variable,
            reg:        vscode.CompletionItemKind.Variable,
            integer:    vscode.CompletionItemKind.Variable,
            parameter:  vscode.CompletionItemKind.Constant,
            localparam: vscode.CompletionItemKind.Constant,
        };

        for (const def of mod.definitionMap.values()) {
            if (def.type in kindMap) {
                const item = new vscode.CompletionItem(def.name, kindMap[def.type]);
                item.detail = def.description;
                items.push(item);
            }
        }

        return items;
    }

    /** Completions for module instantiation outside procedural blocks. */
    private _instantiationCompletions(document: vscode.TextDocument): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];
        const docUri = document.uri.toString();

        for (const mod of moduleDatabase.getAllModules()) {
            // Skip modules defined in the same file (avoid self-instantiation suggestions)
            if (mod.uri === docUri) {
                continue;
            }

            const item = new vscode.CompletionItem(mod.name, vscode.CompletionItemKind.Module);
            item.detail = 'module instantiation';
            item.documentation = new vscode.MarkdownString(`Instantiate module \`${mod.name}\``);
            const snippet = document.languageId === 'vhdl'
                ? buildVhdlInstantiationSnippet(mod)
                : buildInstantiationSnippet(mod);
            item.insertText = new vscode.SnippetString(snippet);
            items.push(item);
        }

        return items;
    }
}

/**
 * Update diagnostics for a document by parsing for syntax errors
 * @param {vscode.TextDocument} document 
 * @param {vscode.DiagnosticCollection} diagnosticCollection 
 */
function updateDiagnostics(document: vscode.TextDocument, diagnosticCollection: vscode.DiagnosticCollection) {
    const lang = document.languageId;
    if (lang !== 'verilog' && lang !== 'vhdl') return;

    if (lang === 'vhdl') {
        vhdlParser.parseSymbols(document, moduleDatabase, fsFileReader);
    } else {
        verilogParser.parseSymbols(document, moduleDatabase, fsFileReader);
    }

    const parser = lang === 'vhdl' ? vhdlParser : verilogParser;
    const errors = parser.getDiagnostics(moduleDatabase);
    const diagnostics: vscode.Diagnostic[] = [];
    for (const error of errors) {
        const range = new vscode.Range(
            new vscode.Position(error.line, error.character),
            new vscode.Position(error.line, error.character + (error.length ?? 1))
        );
        const diagnostic = new vscode.Diagnostic(range, error.message, error.severity);
        diagnostic.source = lang === 'vhdl' ? 'vhdl-parser' : 'verilog-parser';
        diagnostics.push(diagnostic);
    }
    diagnosticCollection.set(document.uri, diagnostics);
    console.log(`Updated diagnostics for ${document.uri}: ${diagnostics.length} issues found`);
}

/**
 * Document Formatting Provider for Verilog.
 *
 * Formats the entire document by re-indenting block structures.
 */
class VerilogDocumentFormattingEditProvider implements vscode.DocumentFormattingEditProvider {
    provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions
    ): vscode.TextEdit[] {
        const text = document.getText();
        const indentSize = options.insertSpaces ? options.tabSize : 4;
        const formatted = formatVerilog(text, indentSize);

        if (formatted === text) {
            return [];
        }

        const fullRange = new vscode.Range(
            document.lineAt(0).range.start,
            document.lineAt(document.lineCount - 1).range.end
        );
        return [vscode.TextEdit.replace(fullRange, formatted)];
    }
}

/**
 * Document Range Formatting Provider for Verilog.
 *
 * Formats only the lines covered by the selected range.  The full document is
 * formatted internally so that indentation context from preceding lines is
 * taken into account; only the edits that fall within the requested range are
 * then returned.
 */
class VerilogDocumentRangeFormattingEditProvider implements vscode.DocumentRangeFormattingEditProvider {
    provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        range: vscode.Range,
        options: vscode.FormattingOptions
    ): vscode.TextEdit[] {
        const text = document.getText();
        const indentSize = options.insertSpaces ? options.tabSize : 4;
        const formatted = formatVerilog(text, indentSize);

        if (formatted === text) {
            return [];
        }

        const formattedLines = formatted.split('\n');
        const startLine = range.start.line;
        const endLine = Math.min(range.end.line, document.lineCount - 1, formattedLines.length - 1);

        const rangeStart = new vscode.Position(startLine, 0);
        const rangeEnd = document.lineAt(endLine).range.end;
        const replaceRange = new vscode.Range(rangeStart, rangeEnd);

        const replacement = formattedLines.slice(startLine, endLine + 1).join('\n');
        const original = document.getText(replaceRange);

        if (original === replacement) {
            return [];
        }

        return [vscode.TextEdit.replace(replaceRange, replacement)];
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Verilog language support extension is now active!');

    // Create diagnostic collection for Verilog syntax errors
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('verilog');
    context.subscriptions.push(diagnosticCollection);

    // Register a command for Verilog files
    let disposable = vscode.commands.registerCommand('verilog.helloWorld', function () {
        vscode.window.showInformationMessage('Verilog extension is active!');
    });

    // Create semantic token provider (needs to be referenced from event handlers)
    const semanticTokensProvider = new VerilogSemanticTokensProvider();

    // Listen for document open events
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(async document => {
            if (document.languageId !== 'verilog' && document.languageId !== 'vhdl') return;
            updateDocumentSymbols(document);
            await ensureInstanceDependenciesParsed(document);
            updateDiagnostics(document, diagnosticCollection);
            semanticTokensProvider.notifyChanged();
        })
    );

    // Listen for document change events
    let changed: boolean = false;
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.languageId !== 'verilog' && event.document.languageId !== 'vhdl') return;
            changed = true;
        })
    );

    // Listen for cursor selection changes
    let lastCursorLine : number = 0;
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(async event => {
            const doc = event.textEditor.document;
            if (doc.languageId !== 'verilog' && doc.languageId !== 'vhdl') return;

            const pos = event.selections && event.selections[0] ? event.selections[0].active : null;
            if (!pos) return;

            if (lastCursorLine === pos.line) {
                return;
            }
            lastCursorLine = pos.line;

            if (!changed) {
                return;
            }
            changed = false;
            const lang = doc.languageId;
            if (lang === 'vhdl') {
                vhdlParser.dirty();
            } else {
                verilogParser.dirty();
            }
            updateDocumentSymbols(doc);
            await ensureInstanceDependenciesParsed(doc);
            updateDiagnostics(doc, diagnosticCollection);
            semanticTokensProvider.notifyChanged();
        })
    );

    // Listen for document close events
    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument(document => {
            if (document.languageId === 'verilog' || document.languageId === 'vhdl') {
                const uri = document.uri.toString();
/*
                moduleDatabase.removeModulesFromFile(uri);
                diagnosticCollection.delete(document.uri);

                // Restore lightweight regex-scanned entries so that
                // go-to-definition still works for the closed file.
                const regexEntries = regexModuleMap.get(uri);
                if (regexEntries) {
                    for (const entry of regexEntries) {
                        if (!moduleDatabase.getModule(entry.name)) {
                            moduleDatabase.addModule(
                                new Module(entry.name, entry.uri, entry.line, entry.character, -1, false)
                            );
                        }
                    }
                }
*/
                console.log(`Removed symbols for ${uri}`);
            }
        })
    );

    // Register document symbol provider
    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(
            { language: 'verilog' },
            new VerilogDocumentSymbolProvider()
        )
    );

    // Register definition provider for Verilog
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(
            { language: 'verilog' },
            new VerilogDefinitionProvider()
        )
    );

    // Register semantic token provider for Verilog
    context.subscriptions.push(
        vscode.languages.registerDocumentSemanticTokensProvider(
            { language: 'verilog' },
            semanticTokensProvider,
            semanticTokensLegend
        )
    );

    // Register completion provider for module instantiation
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { language: 'verilog' },
            new VerilogCompletionItemProvider()
        )
    );

    // Register document formatting provider for Verilog
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider(
            { language: 'verilog' },
            new VerilogDocumentFormattingEditProvider()
        )
    );

    // Register document range formatting provider for Verilog (Format Selection)
    context.subscriptions.push(
        vscode.languages.registerDocumentRangeFormattingEditProvider(
            { language: 'verilog' },
            new VerilogDocumentRangeFormattingEditProvider()
        )
    );

    // Scan workspace for all Verilog modules on activation, then run diagnostics
    // on open documents using the now-complete module database
    scanWorkspaceForModules().then(() => {
        vscode.workspace.textDocuments.forEach(document => {
            updateDiagnostics(document, diagnosticCollection);
        });
    });

    // Re-scan workspace when files are created or deleted.
    // Debounced so that bulk file operations (e.g. a build) only trigger one scan.
    let rescanTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRescan = () => {
        if (rescanTimer) clearTimeout(rescanTimer);
        rescanTimer = setTimeout(() => {
            rescanTimer = undefined;
            scanWorkspaceForModules();
        }, 2000);
    };

    context.subscriptions.push(
        vscode.workspace.onDidCreateFiles(() => scheduleRescan())
    );

    context.subscriptions.push(
        vscode.workspace.onDidDeleteFiles(() => scheduleRescan())
    );

    // Register command to show symbols
    context.subscriptions.push(
        vscode.commands.registerCommand('verilog.showSymbols', function () {
            const MAX_PREVIEW_LENGTH = 200;
            const allModules = moduleDatabase.getAllModules();
            
            const moduleInfo = allModules.map((m: any) => `module: ${m.name} (line ${m.line + 1})`).join('\n');
            
            const preview = moduleInfo.length > MAX_PREVIEW_LENGTH 
                ? moduleInfo.substring(0, MAX_PREVIEW_LENGTH) + '...' 
                : moduleInfo;
            vscode.window.showInformationMessage(
                `Found ${allModules.length} modules:\n${preview}`,
                { modal: false }
            );
            console.log('Module database:', allModules);
        })
    );

    // Register hover provider for Verilog
    context.subscriptions.push(
        vscode.languages.registerHoverProvider('verilog', {
            provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
                const wordRange = document.getWordRangeAtPosition(position);
                const word = document.getText(wordRange);

                // Check if hovered word is a port_identifier in a named_port_connection
                // Pattern: ".portName(" preceded by an instance context
                if (wordRange) {
                    const lineText = document.lineAt(position.line).text;
                    const charBefore = wordRange.start.character > 0 ? lineText[wordRange.start.character - 1] : '';
                    if (charBefore === '.') {
                        // This looks like a named port connection: .portName(...)
                        // Look up all known modules for a port with this name
                        for (const mod of moduleDatabase.getAllModules()) {
                            const port = mod.getPort(word);
                            if (port) {
                                const dirStr = port.direction || '';
                                let hoverContent = `**${port.name}**\n\n`;
                                const range = port.bitRange ? port.bitRange.toExprString() : '';
                                hoverContent += `${dirStr}${range}\n`;
                                hoverContent += `module ${mod.name}`;
                                return new vscode.Hover(hoverContent);
                            }
                        }
                    }

                    // Check for signal/parameter definitions in the current module
                    const docUri = document.uri.toString();
                    const currentModule = moduleDatabase.getModuleByUriPosition(docUri, position.line);
                    if (currentModule) {
                        const def = currentModule.definitionMap.get(word);
                        if (def) {
                            return new vscode.Hover(new vscode.MarkdownString(`\`\`\`verilog\n${def.description}\n\`\`\``));
                        }
                    }
                }

                return null;
            }
        })
    );

    // ── VHDL provider registrations ──────────────────────────────────────────────

    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(
            { language: 'vhdl' },
            new VerilogDocumentSymbolProvider()
        )
    );

    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(
            { language: 'vhdl' },
            new VerilogDefinitionProvider()
        )
    );

    context.subscriptions.push(
        vscode.languages.registerDocumentSemanticTokensProvider(
            { language: 'vhdl' },
            semanticTokensProvider,
            semanticTokensLegend
        )
    );

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { language: 'vhdl' },
            new VerilogCompletionItemProvider()
        )
    );

    context.subscriptions.push(
        vscode.languages.registerHoverProvider('vhdl', {
            provideHover(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken) {
                const wordRange = document.getWordRangeAtPosition(position);
                if (!wordRange) return null;
                const word = document.getText(wordRange);

                const lineText = document.lineAt(position.line).text;
                const charBefore = wordRange.start.character > 0 ? lineText[wordRange.start.character - 1] : '';
                if (charBefore === '.') {
                    for (const mod of moduleDatabase.getAllModules()) {
                        const port = mod.getPort(word);
                        if (port) {
                            const hoverContent = `**${port.name}**\n\nentity ${mod.name}`;
                            return new vscode.Hover(hoverContent);
                        }
                    }
                }
                const docUri = document.uri.toString();
                const currentModule = moduleDatabase.getModuleByUriPosition(docUri, position.line);
                if (currentModule) {
                    const def = currentModule.definitionMap.get(word);
                    if (def) {
                        return new vscode.Hover(new vscode.MarkdownString(`\`\`\`vhdl\n${def.description}\n\`\`\``));
                    }
                }
                return null;
            }
        })
    );

    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider(
            { language: 'vhdl' },
            {
                provideDocumentFormattingEdits(_document: vscode.TextDocument, _options: vscode.FormattingOptions): vscode.TextEdit[] {
                    return [];
                }
            }
        )
    );

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
