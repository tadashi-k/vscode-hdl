#!/usr/bin/env node

/**
 * Test for verifying module update behavior (rename/delete scenarios)
 * Uses the ANTLR-based parser (parseSymbols) and the unified ModuleDatabase
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

class MockUri {
    fsPath: any;
    constructor(filePath: string) {
        this.fsPath = filePath;
    }

    toString() {
        return this.fsPath;
    }
}

class MockTextDocument {
    text: any;
    uri: any;
    languageId: any;
    constructor(text: string, uri: string) {
        this.text = text;
        this.uri = new MockUri(uri);
        this.languageId = 'verilog';
    }

    getText() {
        return this.text;
    }
}

function updateDocumentSymbols(document: any, db: ModuleDatabase) {
    const uri = document.uri.toString();
    const { modules, signals, instances, parameters } = parser.parseSymbols(document);

    db.removeModulesFromFile(uri);

    const signalsByModule = new Map<string, any[]>();
    for (const s of signals) {
        if (!signalsByModule.has(s.moduleName)) signalsByModule.set(s.moduleName, []);
        signalsByModule.get(s.moduleName)!.push(s);
    }

    for (const parsedMod of modules) {
        const mod = new Module(parsedMod.name, uri, parsedMod.line, parsedMod.character, true);
        mod.ports = parsedMod.ports || [];
        mod.signalList = signalsByModule.get(parsedMod.name) || [];
        for (const sig of mod.signalList) {
            mod.signalMap.set(sig.name, sig);
        }
        db.addModule(mod);
    }
}

// Run tests
function runTests() {
    console.log('Running Module Update Tests...\n');

    let passed = 0;
    let failed = 0;

    const db = new ModuleDatabase();

    // Test 1: Initial module addition
    console.log('Test 1: Initial module addition');
    const testPath = '/tmp/test.v';
    const doc1 = new MockTextDocument('module original_name ();\nendmodule', testPath);
    updateDocumentSymbols(doc1, db);

    if (db.getModule('original_name')) {
        console.log('✓ Original module added successfully');
        passed++;
    } else {
        console.log('✗ Failed to add original module');
        failed++;
    }

    // Test 2: Module rename (simulate file modification)
    console.log('\nTest 2: Module rename handles old module removal');
    const doc2 = new MockTextDocument('module renamed_module ();\nendmodule', testPath);
    updateDocumentSymbols(doc2, db);

    if (!db.getModule('original_name') && db.getModule('renamed_module')) {
        console.log('✓ Old module removed, new module added');
        passed++;
    } else {
        console.log('✗ Module rename not handled correctly');
        if (db.getModule('original_name')) console.log('  Error: old module still exists');
        if (!db.getModule('renamed_module')) console.log('  Error: new module not added');
        failed++;
    }

    // Test 3: Multiple modules in same file
    console.log('\nTest 3: Multiple modules in same file');
    const doc3 = new MockTextDocument(
        'module mod1 ();\nendmodule\nmodule mod2 ();\nendmodule',
        testPath
    );
    updateDocumentSymbols(doc3, db);

    const allModules = db.getAllModules();
    if (allModules.length === 2 && db.getModule('mod1') && db.getModule('mod2')) {
        console.log('✓ Both modules added correctly');
        passed++;
    } else {
        console.log('✗ Failed to add multiple modules');
        console.log(`  Found ${allModules.length} modules`);
        failed++;
    }

    // Test 4: Update file to have only one module (delete scenario)
    console.log('\nTest 4: File update removes deleted modules');
    const doc4 = new MockTextDocument('module mod1 ();\nendmodule', testPath);
    updateDocumentSymbols(doc4, db);

    if (db.getModule('mod1') && !db.getModule('mod2')) {
        console.log('✓ Deleted module (mod2) removed, kept module (mod1) preserved');
        passed++;
    } else {
        console.log('✗ Module deletion not handled correctly');
        failed++;
    }

    // Test 5: Different files don't affect each other
    console.log('\nTest 5: Updates to one file don\'t affect modules in other files');
    const otherPath = '/tmp/other.v';
    const otherDoc = new MockTextDocument('module other_module ();\nendmodule', otherPath);
    updateDocumentSymbols(otherDoc, db);

    const doc5 = new MockTextDocument('module updated_mod1 ();\nendmodule', testPath);
    updateDocumentSymbols(doc5, db);

    if (db.getModule('other_module') && db.getModule('updated_mod1') && !db.getModule('mod1')) {
        console.log('✓ Other file\'s module preserved, original file updated correctly');
        passed++;
    } else {
        console.log('✗ Cross-file module handling failed');
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
