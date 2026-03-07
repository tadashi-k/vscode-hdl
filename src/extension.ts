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
    const modules = verilogParser.parseSymbols(document, fsFileReader);

    // Remove existing entries for this file before adding fresh ones
    moduleDatabase.removeModulesFromFile(uri);

    // parseSymbols returns fully-populated Module objects; add them directly
    for (const mod of modules) {
        moduleDatabase.addModule(mod);
    }

    const signals = modules.reduce((acc, m) => acc + m.signalList.length, 0);
    const instances = modules.reduce((acc, m) => acc + m.instanceList.length, 0);
    const parameters = modules.reduce((acc, m) => acc + m.parameterList.length, 0);
    console.log(`Updated symbols for ${uri}: ${modules.length} modules, ${signals} signals, ${instances} instances, ${parameters} parameters found`);
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
    const uri = document.uri.toString();
    const instances = moduleDatabase.getInstancesByUri(uri);

    for (const instance of instances) {
        const mod = moduleDatabase.getModule(instance.moduleName);
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
                console.error(`Error parsing dependency ${instance.moduleName} from ${mod.uri}:`, error);
            }
        }
    }
}

/**
 * Document Symbol Provider for Verilog
 */
class VerilogDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.DocumentSymbol[] {
        const modules = verilogParser.parseSymbols(document, fsFileReader);
        const signals = modules.flatMap((m: any) => m.signalList);

        const moduleSymbols = modules.map((module: any) => {
            const line = document.lineAt(module.line);
            const range = new vscode.Range(
                new vscode.Position(module.line, line.firstNonWhitespaceCharacterIndex),
                new vscode.Position(module.line, line.text.length)
            );
            return new vscode.DocumentSymbol(module.name, 'module', vscode.SymbolKind.Module, range, range);
        });

        const signalSymbols = signals.map((signal: any) => {
            const line = document.lineAt(signal.line);
            const range = new vscode.Range(
                new vscode.Position(signal.line, line.firstNonWhitespaceCharacterIndex),
                new vscode.Position(signal.line, line.text.length)
            );

            const displayName = signal.bitWidth ? `${signal.name}${signal.bitWidth}` : signal.name;
            const detail = signal.direction ? `${signal.direction} ${signal.type}` : signal.type;

            return new vscode.DocumentSymbol(displayName, detail, vscode.SymbolKind.Variable, range, range);
        });

        return [...moduleSymbols, ...signalSymbols];
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
                            new Module(entry.name, entry.uri, entry.line, entry.character, false)
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
    const neededModuleNames = new Set<string>();
    for (const uri of openUris) {
        for (const instance of moduleDatabase.getInstancesByUri(uri)) {
            neededModuleNames.add(instance.moduleName);
        }
    }

    for (const moduleName of neededModuleNames) {
        const mod = moduleDatabase.getModule(moduleName);
        if (mod && !mod.scanned && mod.uri && !openUris.has(mod.uri)) {
            try {
                const depUri = vscode.Uri.parse(mod.uri);
                const document = await vscode.workspace.openTextDocument(depUri);
                updateDocumentSymbols(document);
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
        
        // First, check for signal definitions (wire/reg) in all modules of the current document
        const currentDocSignals = moduleDatabase.getSignalsByUri(document.uri.toString());
        const localSignal = currentDocSignals.find((s: any) => s.name === word);
        
        if (localSignal) {
            const uri = vscode.Uri.parse(localSignal.uri);
            const pos = new vscode.Position(localSignal.line, localSignal.character || 0);
            return new vscode.Location(uri, pos);
        }

        // Check for parameter/localparam definitions in the current document
        const currentDocParams = moduleDatabase.getParametersByUri(document.uri.toString());
        const localParam = currentDocParams.find((p: any) => p.name === word);

        if (localParam) {
            const uri = vscode.Uri.parse(localParam.uri);
            const pos = new vscode.Position(localParam.line, localParam.character || 0);
            return new vscode.Location(uri, pos);
        }
        
        // Check for module definitions in the module database (workspace-wide)
        const moduleSymbol = moduleDatabase.getModule(word);
        
        if (moduleSymbol) {
            const uri = vscode.Uri.parse(moduleSymbol.uri);
            const pos = new vscode.Position(moduleSymbol.line, moduleSymbol.character || 0);
            return new vscode.Location(uri, pos);
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

    const errors = verilogParser.generateErrors(document, moduleDatabase, fsFileReader);
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

    // Track line counts per document for edit optimization.
    // Only re-scan with ANTLR when line count changes (line added/deleted).
    const documentLineCounts = new Map<string, number>();

    // Listen for document open events
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(document => {
            if (document.languageId === 'verilog') {
                documentLineCounts.set(document.uri.toString(), document.lineCount);
            }
            updateDocumentSymbols(document);
            ensureInstanceDependenciesParsed(document);
            updateDiagnostics(document, diagnosticCollection);
            semanticTokensProvider.notifyChanged();
        })
    );

    // Listen for document change events
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.languageId !== 'verilog') return;

            const uri = event.document.uri.toString();
            const previousLineCount = documentLineCounts.get(uri);
            const currentLineCount = event.document.lineCount;
            documentLineCounts.set(uri, currentLineCount);

            // Only re-scan with ANTLR when lines are added or deleted.
            // In-line edits (same line count) are skipped for performance.
            if (previousLineCount !== undefined && previousLineCount === currentLineCount) {
                return;
            }

            updateDocumentSymbols(event.document);
            ensureInstanceDependenciesParsed(event.document);
            updateDiagnostics(event.document, diagnosticCollection);
            semanticTokensProvider.notifyChanged();
        })
    );

    // Listen for document close events
    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument(document => {
            if (document.languageId === 'verilog') {
                const uri = document.uri.toString();
                moduleDatabase.removeModulesFromFile(uri);
                diagnosticCollection.delete(document.uri);

                // Restore lightweight regex-scanned entries so that
                // go-to-definition still works for the closed file.
                const regexEntries = regexModuleMap.get(uri);
                if (regexEntries) {
                    for (const entry of regexEntries) {
                        if (!moduleDatabase.getModule(entry.name)) {
                            moduleDatabase.addModule(
                                new Module(entry.name, entry.uri, entry.line, entry.character, false)
                            );
                        }
                    }
                }

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
            const allSignals = moduleDatabase.getAllSignals();
            const totalSymbols = allModules.length + allSignals.length;
            
            const moduleInfo = allModules.map((m: any) => `module: ${m.name} (line ${m.line + 1})`).join('\n');
            const signalInfo = allSignals.map((s: any) => `${s.type}: ${s.name} (line ${s.line + 1})`).join('\n');
            
            let symbolInfo = '';
            if (moduleInfo) symbolInfo += moduleInfo;
            if (moduleInfo && signalInfo) symbolInfo += '\n';
            if (signalInfo) symbolInfo += signalInfo;
            
            const preview = symbolInfo.length > MAX_PREVIEW_LENGTH 
                ? symbolInfo.substring(0, MAX_PREVIEW_LENGTH) + '...' 
                : symbolInfo;
            vscode.window.showInformationMessage(
                `Found ${totalSymbols} symbols (${allModules.length} modules, ${allSignals.length} signals):\n${preview}`,
                { modal: false }
            );
            console.log('Module database:', allModules);
            console.log('Signals:', allSignals);
        })
    );

    // Register hover provider for Verilog
    context.subscriptions.push(
        vscode.languages.registerHoverProvider('verilog', {
            provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
                const wordRange = document.getWordRangeAtPosition(position);
                const word = document.getText(wordRange);

                // Check for parameter/localparam first
                const params = moduleDatabase.getParametersByUri(document.uri.toString());
                const param = params.find((p: any) => p.name === word);

                if (param) {
                    let hoverContent = `**${param.name}** (${param.kind})\n\n`;
                    if (param.exprText !== null && param.exprText !== undefined) {
                        hoverContent += `= ${param.exprText}`;
                        if (param.value !== null && param.value !== undefined && String(param.value) !== param.exprText) {
                            hoverContent += ` = ${param.value}`;
                        }
                    }
                    hoverContent += `\n\nat line ${param.line + 1}`;
                    return new vscode.Hover(hoverContent);
                }

                // Check if hovered word is a port_identifier in a named_port_connection
                // Pattern: ".portName(" preceded by an instance context
                if (wordRange) {
                    const lineText = document.lineAt(position.line).text;
                    const charBefore = wordRange.start.character > 0 ? lineText[wordRange.start.character - 1] : '';
                    if (charBefore === '.') {
                        // This looks like a named port connection: .portName(...)
                        // Find which instance this belongs to by scanning instances in this file
                        const uri = document.uri.toString();
                        const instances = moduleDatabase.getInstancesByUri(uri);
                        for (const inst of instances) {
                            if (!inst.namedPortNames || !inst.namedPortNames.includes(word)) continue;
                            // Use port connection line position to match the correct instance
                            // when multiple instances have the same port name
                            const connOnLine = inst.portConnections.some((pc: any) =>
                                pc.portName === word && pc.line === position.line);
                            const emptyConn = !inst.portConnections.some((pc: any) => pc.portName === word);
                            if (!connOnLine && !emptyConn) continue;
                            const mod = moduleDatabase.getModule(inst.moduleName);
                            if (mod && mod.ports) {
                                const port = mod.ports.find((p: any) => p.name === word);
                                if (port) {
                                    // Evaluate port width with parameter overrides
                                    const instModParams = moduleDatabase.getParameters(inst.moduleName);
                                    const portWidth = AntlrVerilogParser.evaluatePortWidth(port, instModParams, inst.parameterOverrides);
                                    const widthStr = portWidth !== null && portWidth > 1
                                        ? `[${portWidth - 1}:0]`
                                        : (portWidth === 1 ? '' : (port.bitWidth || ''));
                                    const dirStr = port.direction || '';
                                    let hoverContent = `**${port.name}**\n\n`;
                                    hoverContent += `${dirStr}${widthStr ? widthStr : ''}\n`;
                                    hoverContent += `module ${inst.moduleName}`;
                                    return new vscode.Hover(hoverContent);
                                }
                            }
                        }
                    }
                }

                // Fetch signals for the current document from signal database
                const signals = moduleDatabase.getSignalsByUri(document.uri.toString());

                // Find the signal matching the hovered word
                const signal = signals.find((s: any) => s.name === word);

                if (signal) {
                    // Build hover content
                    let hoverContent = `**${signal.name}**\n\n`;
                    if (signal.direction) {
                        hoverContent += `${signal.direction}\n`;
                    }
                    if (signal.type) {
                        hoverContent += `${signal.type}\n`;
                    }
                    if (signal.bitWidth) {
                        hoverContent += `${signal.bitWidth}\n`;
                    }
                    hoverContent += `at line ${signal.line + 1}`;

                    return new vscode.Hover(hoverContent);
                }

                return null;
            }
        })
    );

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
