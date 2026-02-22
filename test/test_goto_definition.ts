#!/usr/bin/env node

// Test script for goto definition functionality using the ANTLR-based parser
import * as fs from 'fs';
import * as path from 'path';

// Mock vscode API for testing
const vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};
(global as any).vscode = vscode;

import AntlrVerilogParser = require('../src/antlr-parser');
const parser = new AntlrVerilogParser();

class MockTextDocument {
    text: any;
    uri: any;
    languageId: any;
    constructor(text, uri) {
        this.text = text;
        this.uri = { toString: () => uri };
        this.languageId = 'verilog';
    }

    getText() {
        return this.text;
    }

    lineAt(lineNum) {
        const lines = this.text.split('\n');
        return {
            text: lines[lineNum] || '',
            firstNonWhitespaceCharacterIndex: (lines[lineNum] || '').search(/\S/)
        };
    }
}

// Simple per-module symbol database (matches extension.js behaviour)
class SymbolDatabase {
    modules: any;
    signals: any;
    _modulesByUri: any;
    constructor() {
        this.modules = new Map<string, any>();         // moduleName -> module
        this.signals = new Map<string, any>();         // moduleName -> signals[]
        this._modulesByUri = new Map<string, any>();   // uri -> moduleNames[]
    }

    update(doc) {
        const uri = doc.uri.toString();
        const { modules, signals } = parser.parseSymbols(doc);

        // Clear stale entries
        const staleNames = this._modulesByUri.get(uri) || [];
        for (const name of staleNames) {
            this.modules.delete(name);
            this.signals.delete(name);
        }
        this._modulesByUri.set(uri, []);

        const signalsByModule = new Map<string, any>();
        for (const s of signals) {
            if (!signalsByModule.has(s.moduleName)) signalsByModule.set(s.moduleName, []);
            signalsByModule.get(s.moduleName).push(s);
        }

        for (const mod of modules) {
            this.modules.set(mod.name, mod);
            this.signals.set(mod.name, signalsByModule.get(mod.name) || []);
            this._modulesByUri.get(uri).push(mod.name);
        }
    }

    getSignalsByUri(uri) {
        const names = this._modulesByUri.get(uri) || [];
        const result = [];
        for (const n of names) result.push(...(this.signals.get(n) || []));
        return result;
    }

    getAllSymbols() {
        const result = [];
        for (const mod of this.modules.values()) result.push({ ...mod, type: 'module' });
        for (const sigs of this.signals.values()) result.push(...sigs);
        return result;
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
    const counterPath = path.join(__dirname, '..', 'contents', 'counter.v');
    const counterContent = fs.readFileSync(counterPath, 'utf8');
    const counterDoc = new MockTextDocument(counterContent, counterPath);
    db.update(counterDoc);

    const counterModule = db.modules.get('counter');
    const counterSignals = db.signals.get('counter') || [];

    console.log(`Found 1 module, ${counterSignals.length} signals in counter.v`);
    if (counterModule) {
        console.log(`✓ Found module 'counter' at line ${counterModule.line + 1}, char ${counterModule.character}`);
        passed++;
    } else {
        console.log('✗ Module "counter" not found');
        failed++;
    }

    // Test 2: Parse top_module.v
    console.log('\nTest 2: Parsing top_module.v');
    const topPath = path.join(__dirname, '..', 'contents', 'top_module.v');
    const topContent = fs.readFileSync(topPath, 'utf8');
    const topDoc = new MockTextDocument(topContent, topPath);
    db.update(topDoc);

    const topModule = db.modules.get('top_module');
    const topSignals = db.signals.get('top_module') || [];

    console.log(`Found 1 module, ${topSignals.length} signals in top_module.v`);
    if (topModule) {
        console.log(`✓ Found module 'top_module' at line ${topModule.line + 1}, char ${topModule.character}`);
        passed++;
    } else {
        console.log('✗ Module "top_module" not found');
        failed++;
    }

    // Test 3: Check if signals are found
    console.log('\nTest 3: Signal detection in top_module.v');
    const counterValueWire = topSignals.find(s => s.name === 'counter_value' && s.type === 'wire');
    const readyReg = topSignals.find(s => s.name === 'ready' && s.type === 'reg');

    if (counterValueWire && readyReg) {
        console.log(`✓ Found wire 'counter_value' and reg 'ready'`);
        passed++;
    } else {
        console.log('✗ Expected signals not found');
        failed++;
    }

    // Test 4: Cross-file module lookup
    console.log('\nTest 4: Cross-file module lookup');
    const counterModuleInDb = db.modules.get('counter');

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
    const allSymbols = db.getAllSymbols();
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

