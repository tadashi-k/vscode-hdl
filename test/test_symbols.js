#!/usr/bin/env node

// Simple test script to validate symbol extraction using the ANTLR-based parser
const fs = require('fs');
const path = require('path');

// Mock vscode API for testing
const vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};
global.vscode = vscode;

const AntlrVerilogParser = require('../src/antlr-parser');
const parser = new AntlrVerilogParser();

class MockTextDocument {
    constructor(text, uri) {
        this.text = text;
        this.uri = { toString: () => uri };
        this.languageId = 'verilog';
    }

    getText() {
        return this.text;
    }
}

// Run tests
function runTests() {
    console.log('Running Verilog Symbol Extraction Tests...\n');

    let passed = 0;
    let failed = 0;

    // Test 1: full_adder.v
    console.log('Test 1: full_adder.v');
    const test1Path = path.join(__dirname, '../contents', 'full_adder.v');
    const test1Content = fs.readFileSync(test1Path, 'utf8');
    const test1Doc = new MockTextDocument(test1Content, test1Path);
    const { modules: modules1, signals: signals1 } = parser.parseSymbols(test1Doc);

    const moduleCount = modules1.length;
    const wireCount = signals1.filter(s => s.type === 'wire').length;
    const regCount = signals1.filter(s => s.type === 'reg').length;

    console.log(`Found ${modules1.length} modules, ${signals1.length} signals:`);
    console.log(`  - Modules: ${moduleCount}`);
    console.log(`  - Wires: ${wireCount}`);
    console.log(`  - Regs: ${regCount}`);

    if (moduleCount === 2 && wireCount >= 3 && regCount >= 1) {
        console.log('✓ Test 1 PASSED\n');
        passed++;
    } else {
        console.log(`✗ Test 1 FAILED (expected 2 modules, >=3 wires, >=1 regs, got ${moduleCount} modules, ${wireCount} wires, ${regCount} regs)\n`);
        failed++;
    }

    // Test 2: test_symbols.v
    console.log('Test 2: test_symbols.v');
    const test2Path = path.join(__dirname, '../contents', 'test_symbols.v');
    const test2Content = fs.readFileSync(test2Path, 'utf8');
    const test2Doc = new MockTextDocument(test2Content, test2Path);
    const { modules: modules2, signals: signals2 } = parser.parseSymbols(test2Doc);

    const module2Count = modules2.length;
    const wire2Count = signals2.filter(s => s.type === 'wire').length;
    const reg2Count = signals2.filter(s => s.type === 'reg').length;

    console.log(`Found ${modules2.length} modules, ${signals2.length} signals:`);
    console.log(`  - Modules: ${module2Count}`);
    console.log(`  - Wires: ${wire2Count}`);
    console.log(`  - Regs: ${reg2Count}`);

    signals2.forEach(s => {
        let displayName = s.name;
        if (s.bitWidth) {
            displayName = `${s.name}${s.bitWidth}`;
        }
        let detail = s.direction ? ` (${s.direction} ${s.type})` : ` (${s.type})`;
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

