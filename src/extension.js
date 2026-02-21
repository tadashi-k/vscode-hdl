// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const AntlrVerilogParser = require('./antlr-parser');

// Signal database - stores signals (wire/reg) per module
class SignalDatabase {
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
    updateSignals(moduleName, uri, signals) {
        this.signals.set(moduleName, signals);
        if (!this._modulesByUri.has(uri)) {
            this._modulesByUri.set(uri, []);
        }
        const list = this._modulesByUri.get(uri);
        if (!list.includes(moduleName)) {
            list.push(moduleName);
        }
    }

    /**
     * Get signals for a module
     * @param {string} moduleName - Module name
     * @returns {Array} Array of signal objects
     */
    getSignals(moduleName) {
        return this.signals.get(moduleName) || [];
    }

    /**
     * Get all signals from all modules in a file
     * @param {string} uri - Document URI
     * @returns {Array} Array of signal objects
     */
    getSignalsByUri(uri) {
        const moduleNames = this._modulesByUri.get(uri) || [];
        const result = [];
        for (const name of moduleNames) {
            result.push(...(this.signals.get(name) || []));
        }
        return result;
    }

    /**
     * Remove signals for all modules defined in a document
     * @param {string} uri - Document URI
     */
    removeSignalsByUri(uri) {
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
        const allSignals = [];
        for (const signals of this.signals.values()) {
            allSignals.push(...signals);
        }
        return allSignals;
    }
}

// Instance database - stores module instantiations per parent module
class InstanceDatabase {
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
    updateInstances(parentModuleName, uri, instances) {
        this.instances.set(parentModuleName, instances);
        if (!this._modulesByUri.has(uri)) {
            this._modulesByUri.set(uri, []);
        }
        const list = this._modulesByUri.get(uri);
        if (!list.includes(parentModuleName)) {
            list.push(parentModuleName);
        }
    }

    /**
     * Get instances for a parent module
     * @param {string} parentModuleName - Parent module name
     * @returns {Array} Array of instance objects
     */
    getInstances(parentModuleName) {
        return this.instances.get(parentModuleName) || [];
    }

    /**
     * Get all instances from all parent modules in a file
     * @param {string} uri - Document URI
     * @returns {Array} Array of instance objects
     */
    getInstancesByUri(uri) {
        const moduleNames = this._modulesByUri.get(uri) || [];
        const result = [];
        for (const name of moduleNames) {
            result.push(...(this.instances.get(name) || []));
        }
        return result;
    }

    /**
     * Remove instances for all modules defined in a document
     * @param {string} uri - Document URI
     */
    removeInstancesByUri(uri) {
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
        const allInstances = [];
        for (const instances of this.instances.values()) {
            allInstances.push(...instances);
        }
        return allInstances;
    }
}

class ModuleDatabase {
    constructor() {
        // Map of module name -> module symbol
        this.modules = new Map();
    }

    /**
     * Add or update a module in the database
     * @param {Object} module - Module symbol object
     */
    addModule(module) {
        this.modules.set(module.name, module);
    }

    /**
     * Get a module by name
     * @param {string} name - Module name
     * @returns {Object|undefined} Module symbol object or undefined
     */
    getModule(name) {
        return this.modules.get(name);
    }

    /**
     * Remove modules from a specific file
     * @param {string} uri - Document URI
     */
    removeModulesFromFile(uri) {
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

// Create global database instances
const signalDatabase = new SignalDatabase();
const moduleDatabase = new ModuleDatabase();
const instanceDatabase = new InstanceDatabase();
const verilogParser = new AntlrVerilogParser();

/**
 * Update symbols for a document using the ANTLR-based parser.
 * @param {vscode.TextDocument} document 
 */
function updateDocumentSymbols(document) {
    if (document.languageId !== 'verilog') {
        return;
    }

    const uri = document.uri.toString();
    const { modules, signals, instances } = verilogParser.parseSymbols(document);

    // Remove existing entries for this file before adding fresh ones
    signalDatabase.removeSignalsByUri(uri);
    moduleDatabase.removeModulesFromFile(uri);
    instanceDatabase.removeInstancesByUri(uri);

    // Group signals by module and update the per-module signal database
    const signalsByModule = new Map();
    for (const signal of signals) {
        if (!signalsByModule.has(signal.moduleName)) {
            signalsByModule.set(signal.moduleName, []);
        }
        signalsByModule.get(signal.moduleName).push(signal);
    }

    // Group instances by parent module
    const instancesByModule = new Map();
    for (const instance of instances) {
        if (!instancesByModule.has(instance.parentModuleName)) {
            instancesByModule.set(instance.parentModuleName, []);
        }
        instancesByModule.get(instance.parentModuleName).push(instance);
    }

    // Update module database (workspace-wide), signal database (per-module),
    // and instance database (per-module)
    for (const module of modules) {
        moduleDatabase.addModule(module);
        const moduleSignals = signalsByModule.get(module.name) || [];
        signalDatabase.updateSignals(module.name, uri, moduleSignals);
        const moduleInstances = instancesByModule.get(module.name) || [];
        instanceDatabase.updateInstances(module.name, uri, moduleInstances);
    }

    console.log(`Updated symbols for ${uri}: ${modules.length} modules, ${signals.length} signals, ${instances.length} instances found`);
}

/**
 * Document Symbol Provider for Verilog
 */
class VerilogDocumentSymbolProvider {
    provideDocumentSymbols(document, token) {
        const { modules, signals } = verilogParser.parseSymbols(document);

        const moduleSymbols = modules.map(module => {
            const line = document.lineAt(module.line);
            const range = new vscode.Range(
                new vscode.Position(module.line, line.firstNonWhitespaceCharacterIndex),
                new vscode.Position(module.line, line.text.length)
            );
            return new vscode.DocumentSymbol(module.name, 'module', vscode.SymbolKind.Module, range, range);
        });

        const signalSymbols = signals.map(signal => {
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
 * Scan workspace for all .v files and parse their modules
 * @returns {Promise<void>}
 */
async function scanWorkspaceForModules() {
    console.log('Scanning workspace for Verilog modules...');
    
    // Find all .v files in the workspace
    const verilogFiles = await vscode.workspace.findFiles('**/*.v', '**/node_modules/**');
    
    console.log(`Found ${verilogFiles.length} Verilog files in workspace`);
    
    // Parse each file and update symbol database
    for (const fileUri of verilogFiles) {
        try {
            const document = await vscode.workspace.openTextDocument(fileUri);
            updateDocumentSymbols(document);
        } catch (error) {
            console.error(`Error parsing ${fileUri.toString()}:`, error);
        }
    }
    
    console.log('Workspace scan complete');
}

/**
 * Definition Provider for Verilog
 */
class VerilogDefinitionProvider {
    provideDefinition(document, position, token) {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return null;
        }
        
        const word = document.getText(wordRange);
        
        // First, check for signal definitions (wire/reg) in all modules of the current document
        const currentDocSignals = signalDatabase.getSignalsByUri(document.uri.toString());
        const localSignal = currentDocSignals.find(s => s.name === word);
        
        if (localSignal) {
            const uri = vscode.Uri.parse(localSignal.uri);
            const pos = new vscode.Position(localSignal.line, localSignal.character || 0);
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
function updateDiagnostics(document, diagnosticCollection) {
    if (document.languageId !== 'verilog') {
        return;
    }

    const errors = verilogParser.parse(document, moduleDatabase);
    const diagnostics = [];

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

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
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
                diagnosticCollection.delete(document.uri);
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
            
            const moduleInfo = allModules.map(m => `module: ${m.name} (line ${m.line + 1})`).join('\n');
            const signalInfo = allSignals.map(s => `${s.type}: ${s.name} (line ${s.line + 1})`).join('\n');
            
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
            provideHover(document, position, token) {
                const wordRange = document.getWordRangeAtPosition(position);
                const word = document.getText(wordRange);

                // Fetch signals for the current document from signal database
                const signals = signalDatabase.getSignalsByUri(document.uri.toString());

                // Find the signal matching the hovered word
                const signal = signals.find(s => s.name === word);

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
function deactivate() {}

module.exports = {
    activate,
    deactivate
}
