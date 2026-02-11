#!/usr/bin/env node

/**
 * Test for verifying the separation of signal and module databases
 */

const fs = require('fs');
const path = require('path');

// Mock vscode API
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

    getText(range) {
        if (range) {
            return this.text;
        }
        return this.text;
    }

    positionAt(offset) {
        const lines = this.text.substring(0, offset).split('\n');
        return new MockPosition(lines.length - 1, 0);
    }

    lineAt(lineNum) {
        const lines = this.text.split('\n');
        return {
            text: lines[lineNum] || '',
            firstNonWhitespaceCharacterIndex: (lines[lineNum] || '').search(/\S/),
            range: new MockRange(new MockPosition(lineNum, 0), new MockPosition(lineNum, (lines[lineNum] || '').length))
        };
    }
}

// Implementation of parsing function
function parseVerilogSymbols(document) {
    const text = document.getText();
    const modules = [];
    const signals = [];

    const moduleRegex = /^\s*module\s+(\w+)/gm;
    const wireRegex = /^\s*(input\s+|output\s+|inout\s+)?wire\s+(\[\d+:\d+\]\s*)?(\w+(?:\s*,\s*\w+)*)\s*[;,)]/gm;
    const regRegex = /^\s*(input\s+|output\s+|inout\s+)?reg\s+(\[\d+:\d+\]\s*)?(\w+(?:\s*,\s*\w+)*)\s*[;,)]/gm;

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

    while ((match = wireRegex.exec(text)) !== null) {
        const direction = match[1] ? match[1].trim() : null;
        const bitWidth = match[2] ? match[2].trim() : null;
        const namesText = match[3];
        const names = namesText.split(',').map(n => n.trim());
        
        const namesStartOffset = match.index + match[0].indexOf(namesText);
        
        names.forEach(name => {
            if (name && !['input', 'output', 'inout', 'wire'].includes(name)) {
                const nameOffset = namesStartOffset + namesText.indexOf(name);
                const nameLine = document.positionAt(nameOffset).line;
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

    while ((match = regRegex.exec(text)) !== null) {
        const direction = match[1] ? match[1].trim() : null;
        const bitWidth = match[2] ? match[2].trim() : null;
        const namesText = match[3];
        const names = namesText.split(',').map(n => n.trim());
        
        const namesStartOffset = match.index + match[0].indexOf(namesText);
        
        names.forEach(name => {
            if (name && !['input', 'output', 'inout', 'reg'].includes(name)) {
                const nameOffset = namesStartOffset + namesText.indexOf(name);
                const nameLine = document.positionAt(nameOffset).line;
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

// Signal database - per-file
class SignalDatabase {
    constructor() {
        this.signals = new Map();
    }

    updateSignals(uri, signals) {
        this.signals.set(uri, signals);
    }

    getSignals(uri) {
        return this.signals.get(uri) || [];
    }

    removeSignals(uri) {
        this.signals.delete(uri);
    }

    getAllSignals() {
        const allSignals = [];
        for (const signals of this.signals.values()) {
            allSignals.push(...signals);
        }
        return allSignals;
    }
}

// Module database - workspace-wide
class ModuleDatabase {
    constructor() {
        this.modules = new Map();
    }

    addModule(module) {
        this.modules.set(module.name, module);
    }

    getModule(name) {
        return this.modules.get(name);
    }

    removeModulesFromFile(uri) {
        for (const [name, module] of this.modules.entries()) {
            if (module.uri === uri) {
                this.modules.delete(name);
            }
        }
    }

    getAllModules() {
        return Array.from(this.modules.values());
    }
}

// Run tests
function runTests() {
    console.log('Running Database Separation Tests...\n');

    let passed = 0;
    let failed = 0;

    const signalDB = new SignalDatabase();
    const moduleDB = new ModuleDatabase();

    // Load test files
    const counterPath = path.join(__dirname, '..', 'contents', 'counter.v');
    const counterContent = fs.readFileSync(counterPath, 'utf8');
    const counterDoc = new MockTextDocument(counterContent, counterPath);
    const counterParsed = parseVerilogSymbols(counterDoc);
    
    const topPath = path.join(__dirname, '..', 'contents', 'top_module.v');
    const topContent = fs.readFileSync(topPath, 'utf8');
    const topDoc = new MockTextDocument(topContent, topPath);
    const topParsed = parseVerilogSymbols(topDoc);

    // Update databases
    signalDB.updateSignals(counterPath, counterParsed.signals);
    counterParsed.modules.forEach(m => moduleDB.addModule(m));
    
    signalDB.updateSignals(topPath, topParsed.signals);
    topParsed.modules.forEach(m => moduleDB.addModule(m));

    // Test 1: Verify module database is workspace-wide
    console.log('Test 1: Module database stores all modules workspace-wide');
    const allModules = moduleDB.getAllModules();
    if (allModules.length === 2 && 
        allModules.some(m => m.name === 'counter') && 
        allModules.some(m => m.name === 'top_module')) {
        console.log(`✓ Module database has ${allModules.length} modules: ${allModules.map(m => m.name).join(', ')}`);
        passed++;
    } else {
        console.log(`✗ Expected 2 modules (counter, top_module), got ${allModules.length}`);
        failed++;
    }

    // Test 2: Verify signal database is per-file
    console.log('\nTest 2: Signal database stores signals per-file');
    const counterSignals = signalDB.getSignals(counterPath);
    const topSignals = signalDB.getSignals(topPath);
    
    // counter.v has: clk, reset, count (ports) + enable, internal_count (internal)
    // top_module.v has: clk, reset, count_out, valid (ports) + counter_value, ready (internal)
    if (counterSignals.length >= 3 && topSignals.length >= 3) {
        console.log(`✓ counter.v has ${counterSignals.length} signals: ${counterSignals.map(s => s.name).join(', ')}`);
        console.log(`  top_module.v has ${topSignals.length} signals: ${topSignals.map(s => s.name).join(', ')}`);
        passed++;
    } else {
        console.log(`✗ Expected at least 3 signals in each file`);
        console.log(`  counter.v: ${counterSignals.length}, top_module.v: ${topSignals.length}`);
        failed++;
    }

    // Test 3: Verify module lookup by name (workspace-wide)
    console.log('\nTest 3: Module database allows lookup by name');
    const counterModule = moduleDB.getModule('counter');
    if (counterModule && counterModule.name === 'counter' && counterModule.uri.includes('counter.v')) {
        console.log(`✓ Found 'counter' module at ${path.basename(counterModule.uri)}, line ${counterModule.line + 1}`);
        passed++;
    } else {
        console.log(`✗ Failed to find 'counter' module in module database`);
        failed++;
    }

    // Test 4: Verify signals are isolated per file
    console.log('\nTest 4: Signals in one file do not appear in another file\'s signal list');
    const counterSignalNames = counterSignals.map(s => s.name);
    const topSignalNames = topSignals.map(s => s.name);
    
    // 'ready' is only in top_module.v, should not be in counter.v signals
    // 'enable' is only in counter.v, should not be in top_module.v signals
    if (!counterSignalNames.includes('ready') && !topSignalNames.includes('enable')) {
        console.log(`✓ Signals are properly isolated per file`);
        console.log(`  'ready' not in counter.v signals: ${!counterSignalNames.includes('ready')}`);
        console.log(`  'enable' not in top_module.v signals: ${!topSignalNames.includes('enable')}`);
        passed++;
    } else {
        console.log(`✗ Signals are leaking between files`);
        failed++;
    }

    // Test 5: Verify module database survives file removal
    console.log('\nTest 5: Module database persists across file operations');
    const initialModuleCount = moduleDB.getAllModules().length;
    
    // Remove one file's modules
    moduleDB.removeModulesFromFile(counterPath);
    const afterRemoval = moduleDB.getAllModules();
    
    if (afterRemoval.length === initialModuleCount - 1 && 
        afterRemoval.some(m => m.name === 'top_module') &&
        !afterRemoval.some(m => m.name === 'counter')) {
        console.log(`✓ Modules from removed file are cleaned up`);
        console.log(`  Before: ${initialModuleCount} modules, After: ${afterRemoval.length} modules`);
        passed++;
    } else {
        console.log(`✗ Module removal did not work correctly`);
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
