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
    // Improved wire regex - more specific patterns
    const wireRegex = /^\s*(?:input\s+|output\s+|inout\s+)?wire\s+(?:\[\d+:\d+\]\s*)?(\w+(?:\s*,\s*\w+)*)\s*[;,)]/gm;
    // Improved reg regex - more specific patterns
    const regRegex = /^\s*(?:input\s+|output\s+|inout\s+)?reg\s+(?:\[\d+:\d+\]\s*)?(\w+(?:\s*,\s*\w+)*)\s*[;,)]/gm;

    // Extract module names
    let match;
    while ((match = moduleRegex.exec(text)) !== null) {
        const name = match[1];
        const line = document.positionAt(match.index).line;
        symbols.push({
            name: name,
            type: 'module',
            line: line,
            uri: document.uri.toString()
        });
    }

    // Extract wire declarations
    while ((match = wireRegex.exec(text)) !== null) {
        const names = match[1].split(',').map(n => n.trim());
        const line = document.positionAt(match.index).line;
        names.forEach(name => {
            // Filter out empty names or keywords
            if (name && !['input', 'output', 'inout', 'wire'].includes(name)) {
                symbols.push({
                    name: name,
                    type: 'wire',
                    line: line,
                    uri: document.uri.toString()
                });
            }
        });
    }

    // Extract reg declarations
    while ((match = regRegex.exec(text)) !== null) {
        const names = match[1].split(',').map(n => n.trim());
        const line = document.positionAt(match.index).line;
        names.forEach(name => {
            // Filter out empty names or keywords
            if (name && !['input', 'output', 'inout', 'reg'].includes(name)) {
                symbols.push({
                    name: name,
                    type: 'reg',
                    line: line,
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

            return new vscode.SymbolInformation(
                symbol.name,
                kind,
                '',
                new vscode.Location(document.uri, range)
            );
        });
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

    // Register command to show symbols
    context.subscriptions.push(
        vscode.commands.registerCommand('verilog.showSymbols', function () {
            const allSymbols = symbolDatabase.getAllSymbols();
            const symbolInfo = allSymbols.map(s => `${s.type}: ${s.name} (line ${s.line + 1})`).join('\n');
            vscode.window.showInformationMessage(
                `Found ${allSymbols.length} symbols:\n${symbolInfo.substring(0, 200)}${symbolInfo.length > 200 ? '...' : ''}`,
                { modal: false }
            );
            console.log('All symbols in database:', allSymbols);
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
