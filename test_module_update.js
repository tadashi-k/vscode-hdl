#!/usr/bin/env node

/**
 * Test for verifying module update behavior (rename/delete scenarios)
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

class MockUri {
    constructor(filePath) {
        this.fsPath = filePath;
    }

    toString() {
        return this.fsPath;
    }
}

class MockTextDocument {
    constructor(text, uri) {
        this.text = text;
        this.uri = new MockUri(uri);
        this.languageId = 'verilog';
    }

    getText(range) {
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
            firstNonWhitespaceCharacterIndex: (lines[lineNum] || '').search(/\S/)
        };
    }
}

// Implementation
function parseVerilogSymbols(document) {
    const text = document.getText();
    const modules = [];
    const signals = [];

    const moduleRegex = /^\s*module\s+(\w+)/gm;
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

    return { modules, signals };
}

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
}

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

function updateDocumentSymbols(document, signalDB, moduleDB) {
    const { modules, signals } = parseVerilogSymbols(document);
    const uri = document.uri.toString();
    
    signalDB.updateSignals(uri, signals);
    
    // Remove existing modules from this file before adding new ones
    moduleDB.removeModulesFromFile(uri);
    
    modules.forEach(module => moduleDB.addModule(module));
}

// Run tests
function runTests() {
    console.log('Running Module Update Tests...\n');

    let passed = 0;
    let failed = 0;

    const signalDB = new SignalDatabase();
    const moduleDB = new ModuleDatabase();

    // Test 1: Initial module addition
    console.log('Test 1: Initial module addition');
    const testPath = '/tmp/test.v';
    const doc1 = new MockTextDocument('module original_name ();\nendmodule', testPath);
    updateDocumentSymbols(doc1, signalDB, moduleDB);
    
    if (moduleDB.getModule('original_name')) {
        console.log('✓ Original module added successfully');
        passed++;
    } else {
        console.log('✗ Failed to add original module');
        failed++;
    }

    // Test 2: Module rename (simulate file modification)
    console.log('\nTest 2: Module rename handles old module removal');
    const doc2 = new MockTextDocument('module renamed_module ();\nendmodule', testPath);
    updateDocumentSymbols(doc2, signalDB, moduleDB);
    
    if (!moduleDB.getModule('original_name') && moduleDB.getModule('renamed_module')) {
        console.log('✓ Old module removed, new module added');
        passed++;
    } else {
        console.log('✗ Module rename not handled correctly');
        if (moduleDB.getModule('original_name')) {
            console.log('  Error: old module still exists');
        }
        if (!moduleDB.getModule('renamed_module')) {
            console.log('  Error: new module not added');
        }
        failed++;
    }

    // Test 3: Multiple modules in same file
    console.log('\nTest 3: Multiple modules in same file');
    const doc3 = new MockTextDocument(
        'module mod1 ();\nendmodule\nmodule mod2 ();\nendmodule',
        testPath
    );
    updateDocumentSymbols(doc3, signalDB, moduleDB);
    
    const allModules = moduleDB.getAllModules();
    if (allModules.length === 2 && moduleDB.getModule('mod1') && moduleDB.getModule('mod2')) {
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
    updateDocumentSymbols(doc4, signalDB, moduleDB);
    
    if (moduleDB.getModule('mod1') && !moduleDB.getModule('mod2')) {
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
    updateDocumentSymbols(otherDoc, signalDB, moduleDB);
    
    // Now update original file
    const doc5 = new MockTextDocument('module updated_mod1 ();\nendmodule', testPath);
    updateDocumentSymbols(doc5, signalDB, moduleDB);
    
    if (moduleDB.getModule('other_module') && moduleDB.getModule('updated_mod1') && !moduleDB.getModule('mod1')) {
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
