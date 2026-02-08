// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// Internal symbol database
class SymbolDatabase {
    constructor() {
        // Map of file URI -> symbols array
        this.symbols = new Map();
    }

    /**
     * Update symbols for a document
     * @param {string} uri - Document URI
     * @param {Array} symbols - Array of symbol objects
     */
    updateSymbols(uri, symbols) {
        this.symbols.set(uri, symbols);
    }

    /**
     * Get symbols for a document
     * @param {string} uri - Document URI
     * @returns {Array} Array of symbol objects
     */
    getSymbols(uri) {
        return this.symbols.get(uri) || [];
    }

    /**
     * Remove symbols for a document
     * @param {string} uri - Document URI
     */
    removeSymbols(uri) {
        this.symbols.delete(uri);
    }

    /**
     * Get all symbols from all documents
     * @returns {Array} Array of all symbol objects
     */
    getAllSymbols() {
        const allSymbols = [];
        for (const symbols of this.symbols.values()) {
            allSymbols.push(...symbols);
        }
        return allSymbols;
    }
}

// Create global symbol database instance
const symbolDatabase = new SymbolDatabase();

/**
 * Parse Verilog document and extract symbols
 * @param {vscode.TextDocument} document 
 * @returns {Array} Array of symbol objects
 */
function parseVerilogSymbols(document) {
    const text = document.getText();
    const symbols = [];

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
        symbols.push({
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
                const lineStartOffset = document.positionAt(document.lineAt(nameLine).range.start).line;
                const lineText = document.lineAt(nameLine).text;
                // Calculate character position within the line
                const charIndex = nameOffset - text.lastIndexOf('\n', nameOffset) - 1;
                
                symbols.push({
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
                const lineStartOffset = document.positionAt(document.lineAt(nameLine).range.start).line;
                const lineText = document.lineAt(nameLine).text;
                // Calculate character position within the line
                const charIndex = nameOffset - text.lastIndexOf('\n', nameOffset) - 1;
                
                symbols.push({
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

    return symbols;
}

/**
 * Update symbols for a document
 * @param {vscode.TextDocument} document 
 */
function updateDocumentSymbols(document) {
    if (document.languageId !== 'verilog') {
        return;
    }

    const symbols = parseVerilogSymbols(document);
    symbolDatabase.updateSymbols(document.uri.toString(), symbols);
    
    console.log(`Updated symbols for ${document.uri.toString()}: ${symbols.length} symbols found`);
}

/**
 * Document Symbol Provider for Verilog
 */
class VerilogDocumentSymbolProvider {
    provideDocumentSymbols(document, token) {
        const symbols = parseVerilogSymbols(document);
        
        return symbols.map(symbol => {
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
        
        // First, check for signal definitions (wire/reg) in the current document
        const currentDocSymbols = symbolDatabase.getSymbols(document.uri.toString());
        const localSymbol = currentDocSymbols.find(s => 
            s.name === word && (s.type === 'wire' || s.type === 'reg')
        );
        
        if (localSymbol) {
            const uri = vscode.Uri.parse(localSymbol.uri);
            const pos = new vscode.Position(localSymbol.line, localSymbol.character || 0);
            return new vscode.Location(uri, pos);
        }
        
        // Check for module definitions across all files
        const allSymbols = symbolDatabase.getAllSymbols();
        const moduleSymbol = allSymbols.find(s => 
            s.name === word && s.type === 'module'
        );
        
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
                symbolDatabase.removeSymbols(document.uri.toString());
                console.log(`Removed symbols for ${document.uri.toString()}`);
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
            const allSymbols = symbolDatabase.getAllSymbols();
            const symbolInfo = allSymbols.map(s => `${s.type}: ${s.name} (line ${s.line + 1})`).join('\n');
            const preview = symbolInfo.length > MAX_PREVIEW_LENGTH 
                ? symbolInfo.substring(0, MAX_PREVIEW_LENGTH) + '...' 
                : symbolInfo;
            vscode.window.showInformationMessage(
                `Found ${allSymbols.length} symbols:\n${preview}`,
                { modal: false }
            );
            console.log('All symbols in database:', allSymbols);
        })
    );

    // Register hover provider for Verilog
    context.subscriptions.push(
        vscode.languages.registerHoverProvider('verilog', {
            provideHover(document, position, token) {
                const wordRange = document.getWordRangeAtPosition(position);
                const word = document.getText(wordRange);

                // Fetch symbols for the current document
                const symbols = symbolDatabase.getSymbols(document.uri.toString());

                // Find the symbol matching the hovered word
                const symbol = symbols.find(s => s.name === word);

                if (symbol) {
                    // Build hover content
                    let hoverContent = `**${symbol.name}**\n\n`;
                    if (symbol.direction) {
                        hoverContent += `${symbol.direction}\n`;
                    }
                    if (symbol.type) {
                        hoverContent += `${symbol.type}\n`;
                    }
                    if (symbol.bitWidth) {
                        hoverContent += `${symbol.bitWidth}\n`;
                    }
                    hoverContent += `at line ${symbol.line + 1}`;

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
