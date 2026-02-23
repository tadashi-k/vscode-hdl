// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import AntlrVerilogParser = require('./antlr-parser');
import { parseHdlIgnore, regexScanModules } from './verilog-scanner';

// Signal database - stores signals (wire/reg) per module
class SignalDatabase {
    signals: Map<string, any[]>;
    _modulesByUri: Map<string, string[]>;

    constructor() {
        // Map of module name -> signals array
        this.signals = new Map();
        // Map of file URI -> module names (for cleanup when file changes)
        this._modulesByUri = new Map();
    }

    /**
     * Update signals for a module
     * @param {string} moduleName - Module name
     * @param {string} uri - Document URI (for cleanup tracking)
     * @param {Array} signals - Array of signal objects
     */
    updateSignals(moduleName: string, uri: string, signals: any[]) {
        this.signals.set(moduleName, signals);
        if (!this._modulesByUri.has(uri)) {
            this._modulesByUri.set(uri, []);
        }
        const list = this._modulesByUri.get(uri)!;
        if (!list.includes(moduleName)) {
            list.push(moduleName);
        }
    }

    /**
     * Get signals for a module
     * @param {string} moduleName - Module name
     * @returns {Array} Array of signal objects
     */
    getSignals(moduleName: string) {
        return this.signals.get(moduleName) || [];
    }

    /**
     * Get all signals from all modules in a file
     * @param {string} uri - Document URI
     * @returns {Array} Array of signal objects
     */
    getSignalsByUri(uri: string) {
        const moduleNames = this._modulesByUri.get(uri) || [];
        const result: any[] = [];
        for (const name of moduleNames) {
            result.push(...(this.signals.get(name) || []));
        }
        return result;
    }

    /**
     * Remove signals for all modules defined in a document
     * @param {string} uri - Document URI
     */
    removeSignalsByUri(uri: string) {
        const moduleNames = this._modulesByUri.get(uri) || [];
        for (const name of moduleNames) {
            this.signals.delete(name);
        }
        this._modulesByUri.delete(uri);
    }

    /**
     * Get all signals from all modules
     * @returns {Array} Array of all signal objects
     */
    getAllSignals() {
        const allSignals: any[] = [];
        for (const signals of this.signals.values()) {
            allSignals.push(...signals);
        }
        return allSignals;
    }
}

// Instance database - stores module instantiations per parent module
class InstanceDatabase {
    instances: Map<string, any[]>;
    _modulesByUri: Map<string, string[]>;

    constructor() {
        // Map of parent module name -> instances array
        this.instances = new Map();
        // Map of file URI -> parent module names (for cleanup when file changes)
        this._modulesByUri = new Map();
    }

    /**
     * Update instances for a parent module
     * @param {string} parentModuleName - Parent module name
     * @param {string} uri - Document URI (for cleanup tracking)
     * @param {Array} instances - Array of instance objects
     */
    updateInstances(parentModuleName: string, uri: string, instances: any[]) {
        this.instances.set(parentModuleName, instances);
        if (!this._modulesByUri.has(uri)) {
            this._modulesByUri.set(uri, []);
        }
        const list = this._modulesByUri.get(uri)!;
        if (!list.includes(parentModuleName)) {
            list.push(parentModuleName);
        }
    }

    /**
     * Get instances for a parent module
     * @param {string} parentModuleName - Parent module name
     * @returns {Array} Array of instance objects
     */
    getInstances(parentModuleName: string) {
        return this.instances.get(parentModuleName) || [];
    }

    /**
     * Get all instances from all parent modules in a file
     * @param {string} uri - Document URI
     * @returns {Array} Array of instance objects
     */
    getInstancesByUri(uri: string) {
        const moduleNames = this._modulesByUri.get(uri) || [];
        const result: any[] = [];
        for (const name of moduleNames) {
            result.push(...(this.instances.get(name) || []));
        }
        return result;
    }

    /**
     * Remove instances for all modules defined in a document
     * @param {string} uri - Document URI
     */
    removeInstancesByUri(uri: string) {
        const moduleNames = this._modulesByUri.get(uri) || [];
        for (const name of moduleNames) {
            this.instances.delete(name);
        }
        this._modulesByUri.delete(uri);
    }

    /**
     * Get all instances from all parent modules
     * @returns {Array} Array of all instance objects
     */
    getAllInstances() {
        const allInstances: any[] = [];
        for (const instances of this.instances.values()) {
            allInstances.push(...instances);
        }
        return allInstances;
    }
}

class ModuleDatabase {
    modules: Map<string, any>;

    constructor() {
        // Map of module name -> module symbol
        this.modules = new Map();
    }

    /**
     * Add or update a module in the database
     * @param {Object} module - Module symbol object
     */
    addModule(module: any) {
        this.modules.set(module.name, module);
    }

    /**
     * Get a module by name
     * @param {string} name - Module name
     * @returns {Object|undefined} Module symbol object or undefined
     */
    getModule(name: string) {
        return this.modules.get(name);
    }

    /**
     * Remove modules from a specific file
     * @param {string} uri - Document URI
     */
    removeModulesFromFile(uri: string) {
        for (const [name, module] of this.modules.entries()) {
            if (module.uri === uri) {
                this.modules.delete(name);
            }
        }
    }

    /**
     * Get all modules
     * @returns {Array} Array of all module objects
     */
    getAllModules() {
        return Array.from(this.modules.values());
    }
}

// Parameter database - stores parameter/localparam declarations per module
class ParameterDatabase {
    params: Map<string, any[]>;
    _modulesByUri: Map<string, string[]>;

    constructor() {
        // Map of module name -> parameters array
        this.params = new Map();
        // Map of file URI -> module names (for cleanup when file changes)
        this._modulesByUri = new Map();
    }

    /**
     * Update parameters for a module
     * @param {string} moduleName - Module name
     * @param {string} uri - Document URI (for cleanup tracking)
     * @param {Array} parameters - Array of parameter objects
     */
    updateParameters(moduleName: string, uri: string, parameters: any[]) {
        this.params.set(moduleName, parameters);
        if (!this._modulesByUri.has(uri)) {
            this._modulesByUri.set(uri, []);
        }
        const list = this._modulesByUri.get(uri)!;
        if (!list.includes(moduleName)) {
            list.push(moduleName);
        }
    }

    /**
     * Get parameters for a module
     * @param {string} moduleName - Module name
     * @returns {Array} Array of parameter objects
     */
    getParameters(moduleName: string) {
        return this.params.get(moduleName) || [];
    }

    /**
     * Get all parameters from all modules in a file
     * @param {string} uri - Document URI
     * @returns {Array} Array of parameter objects
     */
    getParametersByUri(uri: string) {
        const moduleNames = this._modulesByUri.get(uri) || [];
        const result: any[] = [];
        for (const name of moduleNames) {
            result.push(...(this.params.get(name) || []));
        }
        return result;
    }

    /**
     * Remove parameters for all modules defined in a document
     * @param {string} uri - Document URI
     */
    removeParametersByUri(uri: string) {
        const moduleNames = this._modulesByUri.get(uri) || [];
        for (const name of moduleNames) {
            this.params.delete(name);
        }
        this._modulesByUri.delete(uri);
    }

    /**
     * Get all parameters from all modules
     * @returns {Array} Array of all parameter objects
     */
    getAllParameters() {
        const all: any[] = [];
        for (const params of this.params.values()) {
            all.push(...params);
        }
        return all;
    }
}

// Create global database instances
const signalDatabase = new SignalDatabase();
const moduleDatabase = new ModuleDatabase();
const instanceDatabase = new InstanceDatabase();
const parameterDatabase = new ParameterDatabase();
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
 * @param {vscode.TextDocument} document 
 */
function updateDocumentSymbols(document: vscode.TextDocument) {
    if (document.languageId !== 'verilog') {
        return;
    }

    const uri = document.uri.toString();
    const { modules, signals, instances, parameters } = verilogParser.parseSymbols(document);

    // Remove existing entries for this file before adding fresh ones
    signalDatabase.removeSignalsByUri(uri);
    moduleDatabase.removeModulesFromFile(uri);
    instanceDatabase.removeInstancesByUri(uri);
    parameterDatabase.removeParametersByUri(uri);

    // Group signals by module and update the per-module signal database
    const signalsByModule = new Map<string, any[]>();
    for (const signal of signals) {
        if (!signalsByModule.has(signal.moduleName)) {
            signalsByModule.set(signal.moduleName, []);
        }
        signalsByModule.get(signal.moduleName)!.push(signal);
    }

    // Group instances by parent module
    const instancesByModule = new Map<string, any[]>();
    for (const instance of instances) {
        if (!instancesByModule.has(instance.parentModuleName)) {
            instancesByModule.set(instance.parentModuleName, []);
        }
        instancesByModule.get(instance.parentModuleName)!.push(instance);
    }

    // Group parameters by module
    const paramsByModule = new Map<string, any[]>();
    for (const param of parameters) {
        if (!paramsByModule.has(param.moduleName)) {
            paramsByModule.set(param.moduleName, []);
        }
        paramsByModule.get(param.moduleName)!.push(param);
    }

    // Update module database (workspace-wide), signal database (per-module),
    // instance database (per-module), and parameter database (per-module)
    for (const module of modules) {
        moduleDatabase.addModule(module);
        const moduleSignals = signalsByModule.get(module.name) || [];
        signalDatabase.updateSignals(module.name, uri, moduleSignals);
        const moduleInstances = instancesByModule.get(module.name) || [];
        instanceDatabase.updateInstances(module.name, uri, moduleInstances);
        const moduleParams = paramsByModule.get(module.name) || [];
        parameterDatabase.updateParameters(module.name, uri, moduleParams);
    }

    console.log(`Updated symbols for ${uri}: ${modules.length} modules, ${signals.length} signals, ${instances.length} instances, ${parameters.length} parameters found`);
}

/**
 * Document Symbol Provider for Verilog
 */
class VerilogDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.DocumentSymbol[] {
        const { modules, signals } = verilogParser.parseSymbols(document);

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
                for (const mod of found) {
                    // Only add if not already present (ANTLR entry takes priority).
                    if (!moduleDatabase.getModule(mod.name)) {
                        moduleDatabase.addModule({ ...mod, ports: [] });
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
        for (const instance of instanceDatabase.getInstancesByUri(uri)) {
            neededModuleNames.add(instance.moduleName);
        }
    }

    for (const moduleName of neededModuleNames) {
        const mod = moduleDatabase.getModule(moduleName);
        if (mod && mod.uri && !openUris.has(mod.uri)) {
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
        const currentDocSignals = signalDatabase.getSignalsByUri(document.uri.toString());
        const localSignal = currentDocSignals.find((s: any) => s.name === word);
        
        if (localSignal) {
            const uri = vscode.Uri.parse(localSignal.uri);
            const pos = new vscode.Position(localSignal.line, localSignal.character || 0);
            return new vscode.Location(uri, pos);
        }

        // Check for parameter/localparam definitions in the current document
        const currentDocParams = parameterDatabase.getParametersByUri(document.uri.toString());
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
 * Update diagnostics for a document by parsing for syntax errors
 * @param {vscode.TextDocument} document 
 * @param {vscode.DiagnosticCollection} diagnosticCollection 
 */
function updateDiagnostics(document: vscode.TextDocument, diagnosticCollection: vscode.DiagnosticCollection) {
    if (document.languageId !== 'verilog') {
        return;
    }

    const errors = verilogParser.parse(document, moduleDatabase);
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

    // Listen for document open events
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(document => {
            updateDocumentSymbols(document);
            updateDiagnostics(document, diagnosticCollection);
        })
    );

    // Listen for document change events
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            updateDocumentSymbols(event.document);
            updateDiagnostics(event.document, diagnosticCollection);
        })
    );

    // Listen for document close events
    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument(document => {
            if (document.languageId === 'verilog') {
                const uri = document.uri.toString();
                signalDatabase.removeSignalsByUri(uri);
                moduleDatabase.removeModulesFromFile(uri);
                instanceDatabase.removeInstancesByUri(uri);
                parameterDatabase.removeParametersByUri(uri);
                diagnosticCollection.delete(document.uri);

                // Restore lightweight regex-scanned entries so that
                // go-to-definition still works for the closed file.
                const regexEntries = regexModuleMap.get(uri);
                if (regexEntries) {
                    for (const mod of regexEntries) {
                        if (!moduleDatabase.getModule(mod.name)) {
                            moduleDatabase.addModule({ ...mod, ports: [] });
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
            const allSignals = signalDatabase.getAllSignals();
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
            console.log('Signal database:', allSignals);
        })
    );

    // Register hover provider for Verilog
    context.subscriptions.push(
        vscode.languages.registerHoverProvider('verilog', {
            provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
                const wordRange = document.getWordRangeAtPosition(position);
                const word = document.getText(wordRange);

                // Check for parameter/localparam first
                const params = parameterDatabase.getParametersByUri(document.uri.toString());
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

                // Fetch signals for the current document from signal database
                const signals = signalDatabase.getSignalsByUri(document.uri.toString());

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
