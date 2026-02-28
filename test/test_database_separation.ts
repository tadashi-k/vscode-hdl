#!/usr/bin/env node

/**
 * Test for verifying the separation of signal and module databases
 * Uses the ANTLR-based parser (parseSymbols)
 */

import * as fs from 'fs';
import * as path from 'path';

// Mock vscode API
const vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};
(global as any).vscode = vscode;

const AntlrVerilogParser = require('../src/antlr-parser');
const parser = new AntlrVerilogParser();

class MockTextDocument {
    text: any;
    uri: any;
    languageId: any;
    constructor(text: string, uri: string) {
        this.text = text;
        this.uri = { toString: () => uri };
        this.languageId = 'verilog';
    }

    getText() {
        return this.text;
    }
}

// Signal database - per module (mirrors extension.js SignalDatabase)
class SignalDatabase {
    signals: any;
    _modulesByUri: any;
    constructor() {
        this.signals = new Map<string, any>();
        this._modulesByUri = new Map<string, any>();
    }

    updateSignals(moduleName: any, uri: any, signals: any) {
        this.signals.set(moduleName, signals);
        if (!this._modulesByUri.has(uri)) {
            this._modulesByUri.set(uri, []);
        }
        const list = this._modulesByUri.get(uri);
        if (!list.includes(moduleName)) {
            list.push(moduleName);
        }
    }

    getSignals(moduleName: any) {
        return this.signals.get(moduleName) || [];
    }

    getSignalsByUri(uri: any) {
        const moduleNames = this._modulesByUri.get(uri) || [];
        const result = [];
        for (const name of moduleNames) {
            result.push(...(this.signals.get(name) || []));
        }
        return result;
    }

    removeSignalsByUri(uri: any) {
        const moduleNames = this._modulesByUri.get(uri) || [];
        for (const name of moduleNames) {
            this.signals.delete(name);
        }
        this._modulesByUri.delete(uri);
    }

    getAllSignals() {
        const allSignals = [];
        for (const signals of this.signals.values()) {
            allSignals.push(...signals);
        }
        return allSignals;
    }
}

// Module database - workspace-wide (mirrors extension.js ModuleDatabase)
class ModuleDatabase {
    modules: any;
    constructor() {
        this.modules = new Map<string, any>();
    }

    addModule(module: any) {
        this.modules.set(module.name, module);
    }

    getModule(name: any) {
        return this.modules.get(name);
    }

    removeModulesFromFile(uri: any) {
        for (const [name, module] of this.modules.entries()) {
            if (module.uri === uri) {
                this.modules.delete(name);
            }
        }
    }

    getAllModules() {
        return Array.from(this.modules.values()) as any[];
    }
}

// Helper to update databases from a parsed document
function updateDatabases(signalDB: any, moduleDB: any, doc: any) {
    const uri = doc.uri.toString();
    const { modules, signals } = parser.parseSymbols(doc);

    signalDB.removeSignalsByUri(uri);
    moduleDB.removeModulesFromFile(uri);

    const signalsByModule = new Map<string, any>();
    for (const signal of signals) {
        if (!signalsByModule.has(signal.moduleName)) {
            signalsByModule.set(signal.moduleName, []);
        }
        signalsByModule.get(signal.moduleName).push(signal);
    }

    for (const module of modules) {
        moduleDB.addModule(module);
        const moduleSignals = signalsByModule.get(module.name) || [];
        signalDB.updateSignals(module.name, uri, moduleSignals);
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
    updateDatabases(signalDB, moduleDB, counterDoc);

    const topPath = path.join(__dirname, '..', 'contents', 'top_module.v');
    const topContent = fs.readFileSync(topPath, 'utf8');
    const topDoc = new MockTextDocument(topContent, topPath);
    updateDatabases(signalDB, moduleDB, topDoc);

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

    // Test 2: Verify signal database is per-module
    console.log('\nTest 2: Signal database stores signals per-module');
    const counterSignals = signalDB.getSignals('counter');
    const topSignals = signalDB.getSignals('top_module');

    if (counterSignals.length >= 3 && topSignals.length >= 3) {
        console.log(`✓ counter module has ${counterSignals.length} signals: ${counterSignals.map((s: any) => s.name).join(', ')}`);
        console.log(`  top_module module has ${topSignals.length} signals: ${topSignals.map((s: any) => s.name).join(', ')}`);
        passed++;
    } else {
        console.log(`✗ Expected at least 3 signals in each module`);
        console.log(`  counter: ${counterSignals.length}, top_module: ${topSignals.length}`);
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

    // Test 4: Verify signals are isolated per module
    console.log('\nTest 4: Signals in one module do not appear in another module\'s signal list');
    const counterSignalNames = counterSignals.map((s: any) => s.name);
    const topSignalNames = topSignals.map((s: any) => s.name);

    // 'ready' is only in top_module, should not be in counter signals
    // 'enable' is only in counter, should not be in top_module signals
    if (!counterSignalNames.includes('ready') && !topSignalNames.includes('enable')) {
        console.log(`✓ Signals are properly isolated per module`);
        console.log(`  'ready' not in counter signals: ${!counterSignalNames.includes('ready')}`);
        console.log(`  'enable' not in top_module signals: ${!topSignalNames.includes('enable')}`);
        passed++;
    } else {
        console.log(`✗ Signals are leaking between modules`);
        failed++;
    }

    // Test 5: Verify module database survives file removal
    console.log('\nTest 5: Module database persists across file operations');
    const initialModuleCount = moduleDB.getAllModules().length;

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

    // Test 6: Module ports list is populated
    console.log('\nTest 6: Module object includes ports list');
    const topModule = moduleDB.getModule('top_module');
    if (topModule && Array.isArray(topModule.ports) && topModule.ports.length >= 2) {
        console.log(`✓ top_module has ${topModule.ports.length} ports: ${topModule.ports.map((p: any) => p.name).join(', ')}`);
        passed++;
    } else {
        console.log(`✗ Expected top_module to have ports list`);
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

