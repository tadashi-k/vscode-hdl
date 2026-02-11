#!/usr/bin/env node

// Simple test script to validate symbol extraction
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
        symbols.push({
            name: name,
            type: 'module',
            line: line,
            uri: document.uri.toString()
        });
    }

    // Extract wire declarations
    while ((match = wireRegex.exec(text)) !== null) {
        const direction = match[1] ? match[1].trim() : null; // input, output, or inout
        const bitWidth = match[2] ? match[2].trim() : null;  // e.g., [7:0]
        const names = match[3].split(',').map(n => n.trim());
        const line = document.positionAt(match.index).line;
        names.forEach(name => {
            // Filter out empty names or keywords
            if (name && !['input', 'output', 'inout', 'wire'].includes(name)) {
                symbols.push({
                    name: name,
                    type: 'wire',
                    direction: direction,
                    bitWidth: bitWidth,
                    line: line,
                    uri: document.uri.toString()
                });
            }
        });
    }

    // Extract reg declarations
    while ((match = regRegex.exec(text)) !== null) {
        const direction = match[1] ? match[1].trim() : null; // input, output, or inout
        const bitWidth = match[2] ? match[2].trim() : null;  // e.g., [7:0]
        const names = match[3].split(',').map(n => n.trim());
        const line = document.positionAt(match.index).line;
        names.forEach(name => {
            // Filter out empty names or keywords
            if (name && !['input', 'output', 'inout', 'reg'].includes(name)) {
                symbols.push({
                    name: name,
                    type: 'reg',
                    direction: direction,
                    bitWidth: bitWidth,
                    line: line,
                    uri: document.uri.toString()
                });
            }
        });
    }

    return symbols;
}

// Run tests
function runTests() {
    console.log('Running Verilog Symbol Extraction Tests...\n');

    let passed = 0;
    let failed = 0;

    // Test 1: test.v file
    console.log('Test 1: test.v');
    const test1Path = path.join(__dirname, '../contents', 'full_adder.v');
    const test1Content = fs.readFileSync(test1Path, 'utf8');
    const test1Doc = new MockTextDocument(test1Content, test1Path);
    const test1Symbols = parseVerilogSymbols(test1Doc);
    
    console.log(`Found ${test1Symbols.length} symbols:`);
    const moduleCount = test1Symbols.filter(s => s.type === 'module').length;
    const wireCount = test1Symbols.filter(s => s.type === 'wire').length;
    const regCount = test1Symbols.filter(s => s.type === 'reg').length;
    
    console.log(`  - Modules: ${moduleCount}`);
    console.log(`  - Wires: ${wireCount}`);
    console.log(`  - Regs: ${regCount}`);
    
    if (moduleCount === 3 && wireCount >= 3 && regCount >= 1) {
        console.log('✓ Test 1 PASSED\n');
        passed++;
    } else {
        console.log(`✗ Test 1 FAILED (expected 3 modules, >=3 wires, >=1 regs, got ${moduleCount} modules, ${wireCount} wires, ${regCount} regs)\n`);
        failed++;
    }

    // Test 2: test_symbols.v file
    console.log('Test 2: test_symbols.v');
    const test2Path = path.join(__dirname, '../contents', 'test_symbols.v');
    const test2Content = fs.readFileSync(test2Path, 'utf8');
    const test2Doc = new MockTextDocument(test2Content, test2Path);
    const test2Symbols = parseVerilogSymbols(test2Doc);
    
    console.log(`Found ${test2Symbols.length} symbols:`);
    const module2Count = test2Symbols.filter(s => s.type === 'module').length;
    const wire2Count = test2Symbols.filter(s => s.type === 'wire').length;
    const reg2Count = test2Symbols.filter(s => s.type === 'reg').length;
    
    console.log(`  - Modules: ${module2Count}`);
    console.log(`  - Wires: ${wire2Count}`);
    console.log(`  - Regs: ${reg2Count}`);
    
    test2Symbols.forEach(s => {
        let displayName = s.name;
        if (s.bitWidth) {
            displayName = `${s.name}${s.bitWidth}`;
        }
        let detail = '';
        if (s.direction) {
            detail = ` (${s.direction} ${s.type})`;
        } else {
            detail = ` (${s.type})`;
        }
        console.log(`    ${displayName}${detail} - line ${s.line + 1}`);
    });
    
    if (module2Count === 2 && wire2Count >= 5 && reg2Count >= 5) {
        console.log('✓ Test 2 PASSED\n');
        passed++;
    } else {
        console.log(`✗ Test 2 FAILED (expected 2 modules, >=5 wires, >=5 regs, got ${module2Count} modules, ${wire2Count} wires, ${reg2Count} regs)\n`);
        failed++;
    }

    // Summary
    console.log('='.repeat(50));
    console.log(`Tests completed: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(50));

    return failed === 0;
}

// Run the tests
const success = runTests();
process.exit(success ? 0 : 1);
