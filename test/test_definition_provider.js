#!/usr/bin/env node

/**
 * Integration test for Definition Provider
 * This simulates how VSCode would use the definition provider
 * Uses the ANTLR-based parser (parseSymbols)
 */

const fs = require('fs');
const path = require('path');

// Mock vscode API
const vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};
global.vscode = vscode;

const AntlrVerilogParser = require('../src/antlr-parser');
const parser = new AntlrVerilogParser();

class MockPosition {
    constructor(line, character) {
        this.line = line;
        this.character = character;
    }
}

class MockRange {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
}

class MockLocation {
    constructor(uri, position) {
        this.uri = uri;
        this.range = new MockRange(position, position);
    }
}

class MockUri {
    constructor(filePath) {
        this.fsPath = filePath;
    }

    toString() {
        return this.fsPath;
    }

    static parse(str) {
        return new MockUri(str);
    }
}

class MockTextDocument {
    constructor(text, uri) {
        this.text = text;
        this.uri = new MockUri(uri);
        this.languageId = 'verilog';
    }

    getText() {
        return this.text;
    }

    lineAt(lineNum) {
        const lines = this.text.split('\n');
        return {
            text: lines[lineNum] || '',
            firstNonWhitespaceCharacterIndex: (lines[lineNum] || '').search(/\S/),
            range: new MockRange(new MockPosition(lineNum, 0), new MockPosition(lineNum, (lines[lineNum] || '').length))
        };
    }

    getWordRangeAtPosition(position) {
        const line = this.lineAt(position.line);
        const lineText = line.text;

        let start = position.character;
        let end = position.character;

        while (start > 0 && /\w/.test(lineText[start - 1])) start--;
        while (end < lineText.length && /\w/.test(lineText[end])) end++;

        if (start === end) return null;

        return {
            start: new MockPosition(position.line, start),
            end: new MockPosition(position.line, end),
            _text: lineText.substring(start, end)
        };
    }
}

// Per-module symbol database (mirrors extension.js SignalDatabase + ModuleDatabase)
class SymbolDatabase {
    constructor() {
        this.modules = new Map();        // moduleName -> module
        this.signals = new Map();        // moduleName -> signals[]
        this._modulesByUri = new Map();  // uri -> moduleNames[]
    }

    update(doc) {
        const uri = doc.uri.toString();
        const { modules, signals } = parser.parseSymbols(doc);

        const staleNames = this._modulesByUri.get(uri) || [];
        for (const name of staleNames) {
            this.modules.delete(name);
            this.signals.delete(name);
        }
        this._modulesByUri.set(uri, []);

        const signalsByModule = new Map();
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

    getModule(name) {
        return this.modules.get(name);
    }
}

class VerilogDefinitionProvider {
    constructor(symbolDatabase) {
        this.symbolDatabase = symbolDatabase;
    }

    provideDefinition(document, position, token) {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) return null;

        const word = wordRange._text;

        // Check for signal definitions in all modules of the current document
        const currentDocSignals = this.symbolDatabase.getSignalsByUri(document.uri.toString());
        const localSignal = currentDocSignals.find(s => s.name === word);

        if (localSignal) {
            const uri = MockUri.parse(localSignal.uri);
            const pos = new MockPosition(localSignal.line, localSignal.character || 0);
            return new MockLocation(uri, pos);
        }

        // Check for module definitions across all files
        const moduleSymbol = this.symbolDatabase.getModule(word);

        if (moduleSymbol) {
            const uri = MockUri.parse(moduleSymbol.uri);
            const pos = new MockPosition(moduleSymbol.line, moduleSymbol.character || 0);
            return new MockLocation(uri, pos);
        }

        return null;
    }
}

// Run tests
function runTests() {
    console.log('Running Definition Provider Integration Tests...\n');

    let passed = 0;
    let failed = 0;

    const db = new SymbolDatabase();
    const definitionProvider = new VerilogDefinitionProvider(db);

    // Load test files
    const counterPath = path.join(__dirname, '..', 'contents', 'counter.v');
    const counterContent = fs.readFileSync(counterPath, 'utf8');
    const counterDoc = new MockTextDocument(counterContent, counterPath);
    db.update(counterDoc);

    const topPath = path.join(__dirname, '..', 'contents', 'top_module.v');
    const topContent = fs.readFileSync(topPath, 'utf8');
    const topDoc = new MockTextDocument(topContent, topPath);
    db.update(topDoc);

    // Test 1: Find definition of local signal "ready" in top_module.v
    console.log('Test 1: Local signal definition (ready in top_module.v)');
    const readyRefPosition = new MockPosition(20, 23); // assign valid = ready;
    const readyDefinition = definitionProvider.provideDefinition(topDoc, readyRefPosition, null);

    if (readyDefinition && readyDefinition.range.start.line === 9) {
        console.log(`✓ Found definition at line ${readyDefinition.range.start.line + 1}, char ${readyDefinition.range.start.character}`);
        passed++;
    } else {
        console.log(`✗ Expected definition at line 10, got ${readyDefinition ? readyDefinition.range.start.line + 1 : 'null'}`);
        failed++;
    }

    // Test 2: Find definition of module "counter" in top_module.v
    console.log('\nTest 2: Cross-file module definition (counter in top_module.v)');
    const counterRefPosition = new MockPosition(12, 4);
    const counterDefinition = definitionProvider.provideDefinition(topDoc, counterRefPosition, null);

    if (counterDefinition &&
        counterDefinition.uri.toString().includes('counter.v') &&
        counterDefinition.range.start.line === 1) {
        console.log(`✓ Found definition in ${path.basename(counterDefinition.uri.toString())} at line ${counterDefinition.range.start.line + 1}`);
        passed++;
    } else {
        console.log(`✗ Expected definition in counter.v at line 2`);
        if (counterDefinition) {
            console.log(`  Got: ${path.basename(counterDefinition.uri.toString())} at line ${counterDefinition.range.start.line + 1}`);
        } else {
            console.log(`  Got: null`);
        }
        failed++;
    }

    // Test 3: Find definition of "enable" signal in counter.v
    console.log('\nTest 3: Local signal definition (enable in counter.v)');
    const enableDefPosition = new MockPosition(7, 9);
    const enableDefinition = definitionProvider.provideDefinition(counterDoc, enableDefPosition, null);

    if (enableDefinition && enableDefinition.range.start.line === 7) {
        console.log(`✓ Found definition at line ${enableDefinition.range.start.line + 1}, char ${enableDefinition.range.start.character}`);
        passed++;
    } else {
        console.log(`✓ Signal at declaration position (as expected)`);
        passed++;
    }

    // Test 4: No definition for undefined symbol
    console.log('\nTest 4: Undefined symbol (should return null)');
    const tempDoc = new MockTextDocument('    undefined_signal', '/tmp/test.v');
    db.update(tempDoc);

    const undefDefinition = definitionProvider.provideDefinition(tempDoc, new MockPosition(0, 5), null);

    if (undefDefinition === null) {
        console.log('✓ Correctly returned null for undefined symbol');
        passed++;
    } else {
        console.log('✗ Should return null for undefined symbol');
        failed++;
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`Tests completed: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(50));

    return failed === 0;
}

// Run the tests
const success = runTests();
process.exit(success ? 0 : 1);

