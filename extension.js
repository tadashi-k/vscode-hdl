// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// Signal database - stores signals (wire/reg) per file
class SignalDatabase {
    constructor() {
        // Map of file URI -> signals array
        this.signals = new Map();
    }

    /**
     * Update signals for a document
     * @param {string} uri - Document URI
     * @param {Array} signals - Array of signal objects
     */
    updateSignals(uri, signals) {
        this.signals.set(uri, signals);
    }

    /**
     * Get signals for a document
     * @param {string} uri - Document URI
     * @returns {Array} Array of signal objects
     */
    getSignals(uri) {
        return this.signals.get(uri) || [];
    }

    /**
     * Remove signals for a document
     * @param {string} uri - Document URI
     */
    removeSignals(uri) {
        this.signals.delete(uri);
    }

    /**
     * Get all signals from all documents
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

// Module database - stores modules for entire workspace
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

/**
 * Parse Verilog document and extract symbols
 * @param {vscode.TextDocument} document 
 * @returns {Object} Object with modules and signals arrays
 */
function parseVerilogSymbols(document) {
    const text = document.getText();
    const modules = [];
    const signals = [];

    // Regular expressions for matching Verilog constructs
    const moduleRegex = /^\s*module\s+(\w+)/gm;
    // Enhanced wire regex - capture direction, bit width, and names
    const wireRegex = /^\s*(input\s+|output\s+|inout\s+)?wire\s+(\[\d+:\d+\]\s*)?(\w+(?:\s*,\s*\w+)*)\s*[;,)]/gm;
    // Enhanced reg regex - capture direction, bit width, and names
    const regRegex = /^\s*(input\s+|output\s+|inout\s+)?reg\s+(\[\d+:\d+\]\s*)?(\w+(?:\s*,\s*\w+)*)\s*[;,)]/gm;

    // Extract module names
    let match;
    while ((match = moduleRegex.exec(text)) !== null) {
        const name = match[1];
        const line = document.positionAt(match.index).line;
        const lineText = document.lineAt(line).text;
        const charIndex = lineText.indexOf(name);
        modules.push({
            name: name,
            type: 'module',
            line: line,
            character: charIndex,
            uri: document.uri.toString()
        });
    }

    // Extract wire declarations
    while ((match = wireRegex.exec(text)) !== null) {
        const direction = match[1] ? match[1].trim() : null; // input, output, or inout
        const bitWidth = match[2] ? match[2].trim() : null;  // e.g., [7:0]
        const namesText = match[3];
        const names = namesText.split(',').map(n => n.trim());
        const line = document.positionAt(match.index).line;
        
        // Calculate the offset of the names portion within the match
        const namesStartOffset = match.index + match[0].indexOf(namesText);
        
        names.forEach(name => {
            // Filter out empty names or keywords
            if (name && !['input', 'output', 'inout', 'wire'].includes(name)) {
                // Find the offset of this specific name within namesText
                const nameOffset = namesStartOffset + namesText.indexOf(name);
                const nameLine = document.positionAt(nameOffset).line;
                const lineText = document.lineAt(nameLine).text;
                // Calculate character position within the line
                const charIndex = nameOffset - text.lastIndexOf('\n', nameOffset) - 1;
                
                signals.push({
                    name: name,
                    type: 'wire',
                    direction: direction,
                    bitWidth: bitWidth,
                    line: nameLine,
                    character: charIndex >= 0 ? charIndex : 0,
                    uri: document.uri.toString()
                });
            }
        });
    }

    // Extract reg declarations
    while ((match = regRegex.exec(text)) !== null) {
        const direction = match[1] ? match[1].trim() : null; // input, output, or inout
        const bitWidth = match[2] ? match[2].trim() : null;  // e.g., [7:0]
        const namesText = match[3];
        const names = namesText.split(',').map(n => n.trim());
        const line = document.positionAt(match.index).line;
        
        // Calculate the offset of the names portion within the match
        const namesStartOffset = match.index + match[0].indexOf(namesText);
        
        names.forEach(name => {
            // Filter out empty names or keywords
            if (name && !['input', 'output', 'inout', 'reg'].includes(name)) {
                // Find the offset of this specific name within namesText
                const nameOffset = namesStartOffset + namesText.indexOf(name);
                const nameLine = document.positionAt(nameOffset).line;
                const lineText = document.lineAt(nameLine).text;
                // Calculate character position within the line
                const charIndex = nameOffset - text.lastIndexOf('\n', nameOffset) - 1;
                
                signals.push({
                    name: name,
                    type: 'reg',
                    direction: direction,
                    bitWidth: bitWidth,
                    line: nameLine,
                    character: charIndex >= 0 ? charIndex : 0,
                    uri: document.uri.toString()
                });
            }
        });
    }

    return { modules, signals };
}

/**
 * Update symbols for a document
 * @param {vscode.TextDocument} document 
 */
function updateDocumentSymbols(document) {
    if (document.languageId !== 'verilog') {
        return;
    }

    const { modules, signals } = parseVerilogSymbols(document);
    const uri = document.uri.toString();
    
    // Update signal database (per-file)
    signalDatabase.updateSignals(uri, signals);
    
    // Remove existing modules from this file before adding new ones
    // to prevent stale entries if modules were renamed or deleted
    moduleDatabase.removeModulesFromFile(uri);
    
    // Update module database (workspace-wide)
    modules.forEach(module => moduleDatabase.addModule(module));
    
    console.log(`Updated symbols for ${uri}: ${modules.length} modules, ${signals.length} signals found`);
}

/**
 * Document Symbol Provider for Verilog
 */
class VerilogDocumentSymbolProvider {
    provideDocumentSymbols(document, token) {
        const { modules, signals } = parseVerilogSymbols(document);
        const allSymbols = [...modules, ...signals];
        
        return allSymbols.map(symbol => {
            const line = document.lineAt(symbol.line);
            const range = new vscode.Range(
                new vscode.Position(symbol.line, line.firstNonWhitespaceCharacterIndex),
                new vscode.Position(symbol.line, line.text.length)
            );

            let kind;
            switch (symbol.type) {
                case 'module':
                    kind = vscode.SymbolKind.Module;
                    break;
                case 'wire':
                    kind = vscode.SymbolKind.Variable;
                    break;
                case 'reg':
                    kind = vscode.SymbolKind.Variable;
                    break;
                default:
                    kind = vscode.SymbolKind.Variable;
            }

            // Build display name with bit width if available
            let displayName = symbol.name;
            if (symbol.bitWidth) {
                displayName = `${symbol.name}${symbol.bitWidth}`;
            }

            // Build detail string for hover (e.g., "input wire", "output reg", "wire")
            let detail = '';
            if (symbol.direction) {
                detail = `${symbol.direction} ${symbol.type}`;
            } else {
                detail = symbol.type;
            }

            // Use DocumentSymbol instead of SymbolInformation for better detail support
            const docSymbol = new vscode.DocumentSymbol(
                displayName,
                detail,
                kind,
                range,
                range
            );

            return docSymbol;
        });
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
        
        // First, check for signal definitions (wire/reg) in the current document using signal database
        const currentDocSignals = signalDatabase.getSignals(document.uri.toString());
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
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Verilog language support extension is now active!');

    // Register a command for Verilog files
    let disposable = vscode.commands.registerCommand('verilog.helloWorld', function () {
        vscode.window.showInformationMessage('Verilog extension is active!');
    });

    // Parse all open Verilog documents on activation
    vscode.workspace.textDocuments.forEach(document => {
        updateDocumentSymbols(document);
    });

    // Listen for document open events
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(document => {
            updateDocumentSymbols(document);
        })
    );

    // Listen for document change events
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            updateDocumentSymbols(event.document);
        })
    );

    // Listen for document close events
    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument(document => {
            if (document.languageId === 'verilog') {
                const uri = document.uri.toString();
                signalDatabase.removeSignals(uri);
                moduleDatabase.removeModulesFromFile(uri);
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

    // Scan workspace for all Verilog modules on activation
    scanWorkspaceForModules();

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
                const signals = signalDatabase.getSignals(document.uri.toString());

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
