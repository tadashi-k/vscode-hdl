#!/usr/bin/env node

/**
 * Integration test to verify the parser works with VS Code diagnostics
 * This simulates how the extension will work in VS Code
 */

import * as fs from 'fs';
import * as path from 'path';

// Mock vscode API
const vscode = {
    DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3
    },
    Position: class {
        line: any;
        character: any;
        constructor(line, character) {
            this.line = line;
            this.character = character;
        }
    },
    Range: class {
        start: any;
        end: any;
        constructor(start, end) {
            this.start = start;
            this.end = end;
        }
    },
    Diagnostic: class {
        range: any;
        message: any;
        severity: any;
        source: any;
        constructor(range, message, severity) {
            this.range = range;
            this.message = message;
            this.severity = severity;
            this.source = '';
        }
    },
    Uri: {
        parse: (uriString) => ({ toString: () => uriString })
    }
};

// Make vscode available globally for the extension code
(global as any).vscode = vscode;

// Mock document class
class MockTextDocument {
    text: any;
    uri: any;
    languageId: any;
    lines: any;
    constructor(text: string, uri: string) {
        this.text = text;
        this.uri = { toString: () => uri };
        this.languageId = 'verilog';
        this.lines = text.split('\n');
    }

    getText() {
        return this.text;
    }

    positionAt(offset) {
        const lines = this.text.substring(0, offset).split('\n');
        return new vscode.Position(lines.length - 1, 0);
    }

    lineAt(line) {
        return {
            text: this.lines[line] || '',
            firstNonWhitespaceCharacterIndex: (this.lines[line] || '').search(/\S/),
        };
    }

    getWordRangeAtPosition(position) {
        // Simple implementation
        return null;
    }
}

// Load extension code
const VerilogParser = require('../src/antlr-parser');

// Create parser instance
const verilogParser = new VerilogParser();

// Define updateDiagnostics function (extracted from extension)
function updateDiagnostics(document, diagnosticCollection) {
    if (document.languageId !== 'verilog') {
        return;
    }

    const errors = verilogParser.parse(document);
    const diagnostics = [];

    for (const error of errors) {
        const range = new vscode.Range(
            new vscode.Position(error.line, error.character),
            new vscode.Position(error.line, error.character + error.length)
        );
        
        const diagnostic = new vscode.Diagnostic(
            range,
            error.message,
            error.severity
        );
        
        diagnostic.source = 'verilog-parser';
        diagnostics.push(diagnostic);
    }

    diagnosticCollection.set(document.uri, diagnostics);
}

// Mock diagnostic collection
class MockDiagnosticCollection {
    diagnostics: any;
    constructor() {
        this.diagnostics = new Map<string, any>();
    }

    set(uri, diagnostics) {
        this.diagnostics.set(uri.toString(), diagnostics);
    }

    get(uri) {
        return this.diagnostics.get(uri.toString()) || [];
    }

    delete(uri) {
        this.diagnostics.delete(uri.toString());
    }
}

// Run integration test
function runIntegrationTest() {
    console.log('Running Verilog Parser Integration Test...\n');
    console.log('='.repeat(60));

    let allPassed = true;

    // Test 1: Valid Verilog file should have no diagnostics
    {
        console.log('\nTest 1: Valid Verilog - No diagnostics expected');
        const validCode = `module test (
    input wire clk,
    output reg out
);
    always @(posedge clk) begin
        out <= 1'b1;
    end
endmodule`;
        
        const doc = new MockTextDocument(validCode, 'test_valid.v');
        const diagnosticCollection = new MockDiagnosticCollection();
        
        updateDiagnostics(doc, diagnosticCollection);
        
        const diagnostics = diagnosticCollection.get(doc.uri);
        console.log(`  Found ${diagnostics.length} diagnostic(s)`);
        
        if (diagnostics.length === 0) {
            console.log('  ✓ Test 1 PASSED');
        } else {
            console.log('  ✗ Test 1 FAILED');
            diagnostics.forEach(d => console.log(`    - ${d.message}`));
            allPassed = false;
        }
    }

    // Test 2: File with errors should generate diagnostics
    {
        console.log('\nTest 2: Invalid Verilog - Diagnostics expected');
        const invalidCode = `module test (
    input wire clk
);
    wire temp
    assign temp = clk;
// Missing endmodule`;
        
        const doc = new MockTextDocument(invalidCode, 'test_invalid.v');
        const diagnosticCollection = new MockDiagnosticCollection();
        
        updateDiagnostics(doc, diagnosticCollection);
        
        const diagnostics = diagnosticCollection.get(doc.uri);
        console.log(`  Found ${diagnostics.length} diagnostic(s):`);
        diagnostics.forEach((d, i) => {
            const severity = d.severity === vscode.DiagnosticSeverity.Error ? 'ERROR' : 'WARNING';
            console.log(`    ${i + 1}. [${severity}] Line ${d.range.start.line + 1}: ${d.message}`);
            console.log(`       Source: ${d.source}`);
        });
        
        if (diagnostics.length >= 2) {
            console.log('  ✓ Test 2 PASSED');
        } else {
            console.log('  ✗ Test 2 FAILED (expected at least 2 diagnostics)');
            allPassed = false;
        }
    }

    // Test 3: Test with actual test_errors.v file
    {
        console.log('\nTest 3: test_errors.v file');
        const testPath = path.join(__dirname, '../contents', 'test_errors.v');
        
        if (fs.existsSync(testPath)) {
            const testContent = fs.readFileSync(testPath, 'utf8');
            const doc = new MockTextDocument(testContent, testPath);
            const diagnosticCollection = new MockDiagnosticCollection();
            
            updateDiagnostics(doc, diagnosticCollection);
            
            const diagnostics = diagnosticCollection.get(doc.uri);
            console.log(`  Found ${diagnostics.length} diagnostic(s):`);
            diagnostics.slice(0, 5).forEach((d, i) => {
                const severity = d.severity === vscode.DiagnosticSeverity.Error ? 'ERROR' : 'WARNING';
                console.log(`    ${i + 1}. [${severity}] Line ${d.range.start.line + 1}: ${d.message}`);
            });
            if (diagnostics.length > 5) {
                console.log(`    ... and ${diagnostics.length - 5} more`);
            }
            
            if (diagnostics.length >= 3) {
                console.log('  ✓ Test 3 PASSED');
            } else {
                console.log('  ✗ Test 3 FAILED (expected at least 3 diagnostics)');
                allPassed = false;
            }
        } else {
            console.log('  ⊘ Test 3 SKIPPED (test_errors.v not found)');
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(allPassed ? '\n✓ All integration tests PASSED' : '\n✗ Some integration tests FAILED');
    console.log('='.repeat(60));

    return allPassed;
}

// Run the integration test
const success = runIntegrationTest();
process.exit(success ? 0 : 1);
