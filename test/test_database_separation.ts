#!/usr/bin/env node

/**
 * Test for verifying the unified module database
 * Uses the ANTLR-based parser (parseSymbols) and the new ModuleDatabase from database.ts
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

import { Module, ModuleDatabase } from '../src/database';

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

// Helper to update the unified database from a parsed document
function updateDatabase(db: ModuleDatabase, doc: any) {
    const uri = doc.uri.toString();
    const { modules, signals, instances, parameters } = parser.parseSymbols(doc);

    db.removeModulesFromFile(uri);

    const signalsByModule = new Map<string, any>();
    for (const signal of signals) {
        if (!signalsByModule.has(signal.moduleName)) {
            signalsByModule.set(signal.moduleName, []);
        }
        signalsByModule.get(signal.moduleName).push(signal);
    }

    const instancesByModule = new Map<string, any[]>();
    for (const instance of instances) {
        if (!instancesByModule.has(instance.parentModuleName)) {
            instancesByModule.set(instance.parentModuleName, []);
        }
        instancesByModule.get(instance.parentModuleName)!.push(instance);
    }

    const paramsByModule = new Map<string, any[]>();
    for (const param of parameters) {
        if (!paramsByModule.has(param.moduleName)) {
            paramsByModule.set(param.moduleName, []);
        }
        paramsByModule.get(param.moduleName)!.push(param);
    }

    for (const parsedMod of modules) {
        const mod = new Module(parsedMod.name, uri, parsedMod.line, parsedMod.character, true);
        mod.ports = parsedMod.ports || [];

        const moduleSignals = signalsByModule.get(parsedMod.name) || [];
        mod.signalList = moduleSignals;
        for (const sig of moduleSignals) {
            mod.signalMap.set(sig.name, sig);
        }

        const moduleParams = paramsByModule.get(parsedMod.name) || [];
        mod.parameterList = moduleParams;
        for (const param of moduleParams) {
            mod.parameterMap.set(param.name, param);
        }

        const moduleInstances = instancesByModule.get(parsedMod.name) || [];
        mod.instanceList = moduleInstances;
        for (const inst of moduleInstances) {
            if (inst.instanceName) {
                mod.instanceMap.set(inst.instanceName, inst);
            }
        }

        db.addModule(mod);
    }
}

// Run tests
function runTests() {
    console.log('Running Database Separation Tests...\n');

    let passed = 0;
    let failed = 0;

    const db = new ModuleDatabase();

    // Load test files
    const counterPath = path.join(__dirname, '..', 'contents', 'counter.v');
    const counterContent = fs.readFileSync(counterPath, 'utf8');
    const counterDoc = new MockTextDocument(counterContent, counterPath);
    updateDatabase(db, counterDoc);

    const topPath = path.join(__dirname, '..', 'contents', 'top_module.v');
    const topContent = fs.readFileSync(topPath, 'utf8');
    const topDoc = new MockTextDocument(topContent, topPath);
    updateDatabase(db, topDoc);

    // Test 1: Verify module database is workspace-wide
    console.log('Test 1: Module database stores all modules workspace-wide');
    const allModules = db.getAllModules();
    if (allModules.length === 2 &&
        allModules.some(m => m.name === 'counter') &&
        allModules.some(m => m.name === 'top_module')) {
        console.log(`✓ Module database has ${allModules.length} modules: ${allModules.map(m => m.name).join(', ')}`);
        passed++;
    } else {
        console.log(`✗ Expected 2 modules (counter, top_module), got ${allModules.length}`);
        failed++;
    }

    // Test 2: Verify signals are stored per-module within the unified database
    console.log('\nTest 2: Signals are stored per-module within the unified database');
    const counterSignals = db.getSignals('counter');
    const topSignals = db.getSignals('top_module');

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
    const counterModule = db.getModule('counter');
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
    const initialModuleCount = db.getAllModules().length;

    db.removeModulesFromFile(counterPath);
    const afterRemoval = db.getAllModules();

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
    const topModule = db.getModule('top_module');
    if (topModule && Array.isArray(topModule.ports) && topModule.ports.length >= 2) {
        console.log(`✓ top_module has ${topModule.ports.length} ports: ${topModule.ports.map((p: any) => p.name).join(', ')}`);
        passed++;
    } else {
        console.log(`✗ Expected top_module to have ports list`);
        failed++;
    }

    // Test 7: Module scanned flag is set
    console.log('\nTest 7: Module scanned flag is set after ANTLR parse');
    // Re-add counter to test scanned flag
    const counterDoc2 = new MockTextDocument(counterContent, counterPath);
    updateDatabase(db, counterDoc2);
    const counterMod2 = db.getModule('counter');
    if (counterMod2 && counterMod2.scanned) {
        console.log(`✓ counter module has scanned=true after ANTLR parse`);
        passed++;
    } else {
        console.log(`✗ Expected counter module to have scanned=true`);
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
