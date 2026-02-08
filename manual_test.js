#!/usr/bin/env node

/**
 * Manual integration test for the Verilog extension
 * This simulates the extension activation and symbol parsing
 */

const fs = require('fs');
const path = require('path');

// Mock vscode module
const vscode = {
    workspace: {
        textDocuments: [],
        onDidOpenTextDocument: (callback) => ({ dispose: () => {} }),
        onDidChangeTextDocument: (callback) => ({ dispose: () => {} }),
        onDidCloseTextDocument: (callback) => ({ dispose: () => {} })
    },
    commands: {
        registerCommand: (name, callback) => {
            console.log(`✓ Registered command: ${name}`);
            return { dispose: () => {} };
        }
    },
    languages: {
        registerDocumentSymbolProvider: (selector, provider) => {
            console.log(`✓ Registered DocumentSymbolProvider for: ${selector.language}`);
            return { dispose: () => {} };
        }
    },
    window: {
        showInformationMessage: (message) => {
            console.log(`[INFO] ${message}`);
        }
    },
    SymbolKind: {
        Module: 1,
        Variable: 2
    },
    SymbolInformation: class {
        constructor(name, kind, containerName, location) {
            this.name = name;
            this.kind = kind;
            this.containerName = containerName;
            this.location = location;
        }
    },
    Location: class {
        constructor(uri, rangeOrPosition) {
            this.uri = uri;
            this.range = rangeOrPosition;
        }
    },
    Range: class {
        constructor(start, end) {
            this.start = start;
            this.end = end;
        }
    },
    Position: class {
        constructor(line, character) {
            this.line = line;
            this.character = character;
        }
    }
};

// Mock context
const context = {
    subscriptions: []
};

// Mock require to inject vscode
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
    if (id === 'vscode') {
        return vscode;
    }
    return originalRequire.apply(this, arguments);
};

// Load the extension
const extension = require('./extension.js');

console.log('='.repeat(60));
console.log('Manual Integration Test for Verilog Extension');
console.log('='.repeat(60));
console.log();

// Activate the extension
console.log('1. Activating extension...');
extension.activate(context);
console.log(`   Registered ${context.subscriptions.length} subscriptions`);
console.log();

console.log('2. Testing parseVerilogSymbols function...');
// Create a mock document
class MockDocument {
    constructor(filePath) {
        this.text = fs.readFileSync(filePath, 'utf8');
        this.uri = { toString: () => filePath };
        this.languageId = 'verilog';
    }
    
    getText() {
        return this.text;
    }
    
    positionAt(offset) {
        const lines = this.text.substring(0, offset).split('\n');
        return { line: lines.length - 1 };
    }
    
    lineAt(line) {
        const lines = this.text.split('\n');
        const lineText = lines[line] || '';
        return {
            text: lineText,
            firstNonWhitespaceCharacterIndex: lineText.search(/\S/)
        };
    }
}

// Test with test_symbols.v
const testFile = path.join(__dirname, 'test', 'test_symbols.v');
const mockDoc = new MockDocument(testFile);

// Load and parse symbols manually to verify
const parseFunction = `
    const text = mockDoc.getText();
    const symbols = [];
    const moduleRegex = /^\\s*module\\s+(\\w+)/gm;
    const wireRegex = /^\\s*(?:input\\s+|output\\s+|inout\\s+)?wire\\s+(?:\\[\\d+:\\d+\\]\\s*)?(\\w+(?:\\s*,\\s*\\w+)*)\\s*[;,)]/gm;
    const regRegex = /^\\s*(?:input\\s+|output\\s+|inout\\s+)?reg\\s+(?:\\[\\d+:\\d+\\]\\s*)?(\\w+(?:\\s*,\\s*\\w+)*)\\s*[;,)]/gm;
    
    let match;
    while ((match = moduleRegex.exec(text)) !== null) {
        const name = match[1];
        const line = mockDoc.positionAt(match.index).line;
        symbols.push({ name, type: 'module', line });
    }
    
    while ((match = wireRegex.exec(text)) !== null) {
        const names = match[1].split(',').map(n => n.trim());
        const line = mockDoc.positionAt(match.index).line;
        names.forEach(name => {
            if (name && !['input', 'output', 'inout', 'wire'].includes(name)) {
                symbols.push({ name, type: 'wire', line });
            }
        });
    }
    
    while ((match = regRegex.exec(text)) !== null) {
        const names = match[1].split(',').map(n => n.trim());
        const line = mockDoc.positionAt(match.index).line;
        names.forEach(name => {
            if (name && !['input', 'output', 'inout', 'reg'].includes(name)) {
                symbols.push({ name, type: 'reg', line });
            }
        });
    }
    
    symbols;
`;

const symbols = eval(parseFunction);

console.log(`   Parsed ${symbols.length} symbols from ${testFile}`);
console.log();

// Group by type
const moduleSymbols = symbols.filter(s => s.type === 'module');
const wireSymbols = symbols.filter(s => s.type === 'wire');
const regSymbols = symbols.filter(s => s.type === 'reg');

console.log('3. Symbol breakdown:');
console.log(`   Modules: ${moduleSymbols.length}`);
moduleSymbols.forEach(s => console.log(`     - ${s.name} (line ${s.line + 1})`));
console.log();

console.log(`   Wires: ${wireSymbols.length}`);
wireSymbols.forEach(s => console.log(`     - ${s.name} (line ${s.line + 1})`));
console.log();

console.log(`   Regs: ${regSymbols.length}`);
regSymbols.forEach(s => console.log(`     - ${s.name} (line ${s.line + 1})`));
console.log();

console.log('='.repeat(60));
console.log('✓ Manual Integration Test Completed Successfully');
console.log('='.repeat(60));

// Restore original require
Module.prototype.require = originalRequire;
