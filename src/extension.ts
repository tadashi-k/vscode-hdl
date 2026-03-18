// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import AntlrVerilogParser = require('./antlr-parser');
import { parseHdlIgnore, regexScanModules } from './verilog-scanner';
import { computeSemanticTokens, TOKEN_TYPES, TOKEN_MODIFIERS } from './semantic-tokens';
import { Module, ModuleDatabase } from './database';

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
    if (document.languageId !== 'verilog') {
        return;
    }

    const uri = document.uri.toString();

    const currentModules = moduleDatabase.getModulesByUri(uri);
    verilogParser.parseSymbols(document, moduleDatabase, fsFileReader);

    // Remove modules that were previously parsed from this file but are no longer present after re-parsing
    for (const mod of currentModules) {
        if (!moduleDatabase.getModule(mod.name)) {
            moduleDatabase.removeModule(mod.name);
        }
    }
}

function updateDocumentModules(document: vscode.TextDocument) {
    if (document.languageId !== 'verilog') {
        return;
    }

    const uri = document.uri.toString();

    const currentModules = moduleDatabase.getModulesByUri(uri);
    verilogParser.parseModules(document, moduleDatabase, fsFileReader);

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
function ensureInstanceDependenciesParsed(document: vscode.TextDocument) {
    if (document.languageId !== 'verilog') return;
    // Instance data is tracked internally by the parser visitor.
    // Get the instances recorded in the last parse of this document.
    const visitor = verilogParser._lastVisitor;
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
                const depFsPath = vscode.Uri.parse(mod.uri).fsPath;
                const content = fs.readFileSync(depFsPath, 'utf8');
                const depDoc: any = {
                    getText: () => content,
                    uri: { toString: () => mod.uri },
                    languageId: 'verilog'
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
        verilogParser.parseSymbols(document, moduleDatabase, fsFileReader);

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
    const verilogFiles = await vscode.workspace.findFiles('**/*.v', '**/node_modules/**');
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

    // --- Step 3: ANTLR-parse currently open Verilog files ---
    const openUris = new Set<string>();
    for (const document of vscode.workspace.textDocuments) {
        if (document.languageId === 'verilog') {
            updateDocumentSymbols(document);
            openUris.add(document.uri.toString());
        }
    }

    // --- Step 4: resolve instances from open files and ANTLR-parse their deps ---
    // Collect instantiated module names from the last-parsed visitors
    const neededModuleNames = new Set<string>();
    if (verilogParser._lastVisitor) {
        for (const moduleName of verilogParser._lastVisitor.allModuleRefs) {
            neededModuleNames.add(moduleName);
        }
    }

    for (const moduleName of neededModuleNames) {
        const mod = moduleDatabase.getModule(moduleName);
        if (mod && !mod.scanned && mod.uri && !openUris.has(mod.uri)) {
            try {
                const depUri = vscode.Uri.parse(mod.uri);
                const document = await vscode.workspace.openTextDocument(depUri);
                updateDocumentModules(document); // simple ANTLR parse to populate ports/parameters for go-to-definition and diagnostics
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
 * Update diagnostics for a document by parsing for syntax errors
 * @param {vscode.TextDocument} document 
 * @param {vscode.DiagnosticCollection} diagnosticCollection 
 */
function updateDiagnostics(document: vscode.TextDocument, diagnosticCollection: vscode.DiagnosticCollection) {
    if (document.languageId !== 'verilog') {
        return;
    }

    verilogParser.parseSymbols(document, moduleDatabase, fsFileReader);
    const errors = verilogParser.getDiagnostics(moduleDatabase);
    const diagnostics: vscode.Diagnostic[] = [];
    for (const error of errors) {
        const range = new vscode.Range(
            new vscode.Position(error.line, error.character),
            new vscode.Position(error.line, error.character + error.length)
        );
        
        const diagnostic = new vscode.Diagnostic(
            range,
            error.message,
            error.severity
        );
        
        diagnostic.source = 'verilog-parser';
        diagnostics.push(diagnostic);
    }

    diagnosticCollection.set(document.uri, diagnostics);
    console.log(`Updated diagnostics for ${document.uri}: ${diagnostics.length} issues found`);
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
        vscode.workspace.onDidOpenTextDocument(document => {
            if (document.languageId !== 'verilog') return;
            updateDocumentSymbols(document);
            ensureInstanceDependenciesParsed(document);
            updateDiagnostics(document, diagnosticCollection);
            semanticTokensProvider.notifyChanged();
        })
    );

    // Listen for document change events
    let changed: boolean = false;
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.languageId !== 'verilog') return;
            changed = true;
        })
    );

    // Listen for cursor selection changes
    let lastCursorLine : number = 0;
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(event => {
            const doc = event.textEditor.document;
            if (doc.languageId !== 'verilog') return;

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
            verilogParser.dirty();
            updateDocumentSymbols(doc);
            ensureInstanceDependenciesParsed(doc);
            updateDiagnostics(doc, diagnosticCollection);
            semanticTokensProvider.notifyChanged();
        })
    );

    // Listen for document close events
    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument(document => {
            if (document.languageId === 'verilog') {
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

    // Scan workspace for all Verilog modules on activation, then run diagnostics
    // on open documents using the now-complete module database
    scanWorkspaceForModules().then(() => {
        vscode.workspace.textDocuments.forEach(document => {
            updateDiagnostics(document, diagnosticCollection);
        });
    });

    // Re-scan workspace when files are created or deleted
    context.subscriptions.push(
        vscode.workspace.onDidCreateFiles(() => {
            scanWorkspaceForModules();
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidDeleteFiles(() => {
            scanWorkspaceForModules();
        })
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
                                const range = port.bitRange ? port.bitRange.toString() : '';
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

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
