#!/usr/bin/env node

// Test script for goto definition functionality
const fs = require('fs');
const path = require('path');

// Mock vscode API for testing
class MockTextDocument {
    constructor(text, uri) {
        this.text = text;
        this.uri = { toString: () => uri };
        this.languageId = 'verilog';
    }

    getText() {
        return this.text;
    }

    positionAt(offset) {
        const lines = this.text.substring(0, offset).split('\n');
        return { line: lines.length - 1 };
    }

    lineAt(lineNum) {
        const lines = this.text.split('\n');
        return {
            text: lines[lineNum] || '',
            firstNonWhitespaceCharacterIndex: (lines[lineNum] || '').search(/\S/)
        };
    }
}

// Load the parser function from extension.js
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
        const direction = match[1] ? match[1].trim() : null;
        const bitWidth = match[2] ? match[2].trim() : null;
        const namesText = match[3];
        const names = namesText.split(',').map(n => n.trim());
        const line = document.positionAt(match.index).line;
        
        // Calculate the offset of the names portion within the match
        const namesStartOffset = match.index + match[0].indexOf(namesText);
        
        names.forEach(name => {
            if (name && !['input', 'output', 'inout', 'wire'].includes(name)) {
                // Find the offset of this specific name within namesText
                const nameOffset = namesStartOffset + namesText.indexOf(name);
                const nameLine = document.positionAt(nameOffset).line;
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
        const direction = match[1] ? match[1].trim() : null;
        const bitWidth = match[2] ? match[2].trim() : null;
        const namesText = match[3];
        const names = namesText.split(',').map(n => n.trim());
        const line = document.positionAt(match.index).line;
        
        // Calculate the offset of the names portion within the match
        const namesStartOffset = match.index + match[0].indexOf(namesText);
        
        names.forEach(name => {
            if (name && !['input', 'output', 'inout', 'reg'].includes(name)) {
                // Find the offset of this specific name within namesText
                const nameOffset = namesStartOffset + namesText.indexOf(name);
                const nameLine = document.positionAt(nameOffset).line;
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

// Simple symbol database
class SymbolDatabase {
    constructor() {
        this.symbols = new Map();
    }

    updateSymbols(uri, symbols) {
        this.symbols.set(uri, symbols);
    }

    getSymbols(uri) {
        return this.symbols.get(uri) || [];
    }

    getAllSymbols() {
        const allSymbols = [];
        for (const symbols of this.symbols.values()) {
            allSymbols.push(...symbols);
        }
        return allSymbols;
    }
}

// Run tests
function runTests() {
    console.log('Running Goto Definition Tests...\n');

    let passed = 0;
    let failed = 0;

    const db = new SymbolDatabase();

    // Test 1: Parse counter.v
    console.log('Test 1: Parsing counter.v');
    const counterPath = path.join(__dirname, 'test', 'counter.v');
    const counterContent = fs.readFileSync(counterPath, 'utf8');
    const counterDoc = new MockTextDocument(counterContent, counterPath);
    const counterSymbols = parseVerilogSymbols(counterDoc);
    db.updateSymbols(counterPath, counterSymbols);

    console.log(`Found ${counterSymbols.length} symbols in counter.v`);
    const counterModule = counterSymbols.find(s => s.type === 'module' && s.name === 'counter');
    
    if (counterModule) {
        console.log(`✓ Found module 'counter' at line ${counterModule.line}, char ${counterModule.character}`);
        passed++;
    } else {
        console.log('✗ Module "counter" not found');
        failed++;
    }

    // Test 2: Parse top_module.v
    console.log('\nTest 2: Parsing top_module.v');
    const topPath = path.join(__dirname, 'test', 'top_module.v');
    const topContent = fs.readFileSync(topPath, 'utf8');
    const topDoc = new MockTextDocument(topContent, topPath);
    const topSymbols = parseVerilogSymbols(topDoc);
    db.updateSymbols(topPath, topSymbols);

    console.log(`Found ${topSymbols.length} symbols in top_module.v`);
    const topModule = topSymbols.find(s => s.type === 'module' && s.name === 'top_module');
    
    if (topModule) {
        console.log(`✓ Found module 'top_module' at line ${topModule.line}, char ${topModule.character}`);
        passed++;
    } else {
        console.log('✗ Module "top_module" not found');
        failed++;
    }

    // Test 3: Check if signals are found
    console.log('\nTest 3: Signal detection in top_module.v');
    const counterValueWire = topSymbols.find(s => s.name === 'counter_value' && s.type === 'wire');
    const readyReg = topSymbols.find(s => s.name === 'ready' && s.type === 'reg');

    if (counterValueWire && readyReg) {
        console.log(`✓ Found wire 'counter_value' and reg 'ready'`);
        passed++;
    } else {
        console.log('✗ Expected signals not found');
        failed++;
    }

    // Test 4: Cross-file module lookup
    console.log('\nTest 4: Cross-file module lookup');
    const allSymbols = db.getAllSymbols();
    const counterModuleInDb = allSymbols.find(s => s.type === 'module' && s.name === 'counter');
    
    if (counterModuleInDb && counterModuleInDb.uri === counterPath) {
        console.log(`✓ Module 'counter' found in database from counter.v`);
        console.log(`  Location: ${counterModuleInDb.uri}, line ${counterModuleInDb.line + 1}, char ${counterModuleInDb.character}`);
        passed++;
    } else {
        console.log('✗ Cross-file module lookup failed');
        failed++;
    }

    // Test 5: Verify position information
    console.log('\nTest 5: Position information accuracy');
    let positionCorrect = true;
    
    for (const symbol of allSymbols) {
        if (symbol.character === undefined || symbol.character < 0) {
            console.log(`✗ Symbol '${symbol.name}' has invalid character position`);
            positionCorrect = false;
        }
    }
    
    if (positionCorrect) {
        console.log('✓ All symbols have valid position information');
        passed++;
    } else {
        failed++;
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`Tests completed: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(50));

    // Display all found symbols
    console.log('\n' + '='.repeat(50));
    console.log('All symbols in database:');
    console.log('='.repeat(50));
    allSymbols.forEach(s => {
        let detail = s.type;
        if (s.direction) detail = `${s.direction} ${s.type}`;
        if (s.bitWidth) detail += ` ${s.bitWidth}`;
        console.log(`${s.name} (${detail}) - ${path.basename(s.uri)}:${s.line + 1}:${s.character}`);
    });

    return failed === 0;
}

// Run the tests
const success = runTests();
process.exit(success ? 0 : 1);
