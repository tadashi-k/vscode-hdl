#!/usr/bin/env node

// Test script for Verilog parser
const fs = require('fs');
const path = require('path');

// Mock vscode API for testing
const vscode = {
    DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3
    },
    Position: class {
        constructor(line, character) {
            this.line = line;
            this.character = character;
        }
    },
    Range: class {
        constructor(start, end) {
            this.start = start;
            this.end = end;
        }
    }
};

// Mock document class
class MockTextDocument {
    constructor(text, uri) {
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
        return { line: lines.length - 1 };
    }

    lineAt(line) {
        return {
            text: this.lines[line] || '',
            firstNonWhitespaceCharacterIndex: (this.lines[line] || '').search(/\S/),
        };
    }
}

// Load VerilogParser class from extension.js
// We'll extract just the parser class for testing
const extensionCode = fs.readFileSync(path.join(__dirname, '../extension.js'), 'utf8');

// Extract the VerilogParser class
const parserClassMatch = extensionCode.match(/class VerilogParser \{[\s\S]*?\n\}/);
if (!parserClassMatch) {
    console.error('Could not find VerilogParser class in extension.js');
    process.exit(1);
}

// Create a safe eval environment
const VerilogParser = eval(`(function() {
    ${parserClassMatch[0]}
    return VerilogParser;
})()`);

function runTests() {
    console.log('Running Verilog Parser Tests...\n');
    console.log('='.repeat(60));

    let totalTests = 0;
    let passedTests = 0;

    // Test 1: Valid Verilog file should have no errors
    {
        totalTests++;
        console.log('\nTest 1: Valid Verilog file');
        const validCode = `
module test_module (
    input wire clk,
    input wire [7:0] data_in,
    output reg [7:0] data_out
);
    wire enable;
    reg [15:0] counter;

    always @(posedge clk) begin
        counter <= counter + 1;
        data_out <= data_in;
    end

    assign enable = 1'b1;
endmodule
`;
        const doc = new MockTextDocument(validCode, 'test_valid.v');
        const parser = new VerilogParser();
        const errors = parser.parse(doc);
        
        console.log(`  Found ${errors.length} error(s)`);
        if (errors.length > 0) {
            errors.forEach(e => console.log(`    - Line ${e.line + 1}: ${e.message}`));
        }
        
        if (errors.length === 0) {
            console.log('  ✓ Test 1 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 1 FAILED (expected 0 errors)');
        }
    }

    // Test 2: Missing endmodule
    {
        totalTests++;
        console.log('\nTest 2: Missing endmodule');
        const code = `
module test_module (
    input wire clk
);
    assign clk = 1'b0;
`;
        const doc = new MockTextDocument(code, 'test_missing_endmodule.v');
        const parser = new VerilogParser();
        const errors = parser.parse(doc);
        
        console.log(`  Found ${errors.length} error(s)`);
        const hasEndmoduleError = errors.some(e => e.message.includes('endmodule'));
        
        if (hasEndmoduleError) {
            console.log('  ✓ Test 2 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 2 FAILED (expected endmodule error)');
        }
    }

    // Test 3: Reserved keyword as module name
    {
        totalTests++;
        console.log('\nTest 3: Reserved keyword as module name');
        const code = `
module wire (
    input a
);
endmodule
`;
        const doc = new MockTextDocument(code, 'test_reserved.v');
        const parser = new VerilogParser();
        const errors = parser.parse(doc);
        
        console.log(`  Found ${errors.length} error(s)`);
        const hasReservedError = errors.some(e => e.message.includes('reserved keyword'));
        
        if (hasReservedError) {
            console.log('  ✓ Test 3 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 3 FAILED (expected reserved keyword error)');
        }
    }

    // Test 4: Unmatched brackets
    {
        totalTests++;
        console.log('\nTest 4: Unmatched brackets');
        const code = `
module bracket_test (
    input wire a
);
    wire result;
    assign result = (a & 1'b1;
endmodule
`;
        const doc = new MockTextDocument(code, 'test_brackets.v');
        const parser = new VerilogParser();
        const errors = parser.parse(doc);
        
        console.log(`  Found ${errors.length} error(s)`);
        const hasBracketError = errors.some(e => e.message.toLowerCase().includes('bracket'));
        
        if (hasBracketError) {
            console.log('  ✓ Test 4 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 4 FAILED (expected bracket error)');
        }
    }

    // Test 5: Test file with multiple errors
    {
        totalTests++;
        console.log('\nTest 5: File with multiple errors (test_errors.v)');
        const testPath = path.join(__dirname, '../contents', 'test_errors.v');
        
        if (fs.existsSync(testPath)) {
            const testContent = fs.readFileSync(testPath, 'utf8');
            const doc = new MockTextDocument(testContent, testPath);
            const parser = new VerilogParser();
            const errors = parser.parse(doc);
            
            console.log(`  Found ${errors.length} error(s):`);
            errors.forEach(e => {
                const severity = e.severity === vscode.DiagnosticSeverity.Error ? 'ERROR' : 'WARNING';
                console.log(`    - Line ${e.line + 1} [${severity}]: ${e.message}`);
            });
            
            // We expect at least 3 errors in the test file
            if (errors.length >= 3) {
                console.log('  ✓ Test 5 PASSED');
                passedTests++;
            } else {
                console.log(`  ✗ Test 5 FAILED (expected at least 3 errors, got ${errors.length})`);
            }
        } else {
            console.log('  ⊘ Test 5 SKIPPED (test_errors.v not found)');
        }
    }

    // Test 6: Existing test files should still work
    {
        totalTests++;
        console.log('\nTest 6: Existing test file (full_adder.v)');
        const testPath = path.join(__dirname, '../contents', 'full_adder.v');
        
        if (fs.existsSync(testPath)) {
            const testContent = fs.readFileSync(testPath, 'utf8');
            const doc = new MockTextDocument(testContent, testPath);
            const parser = new VerilogParser();
            const errors = parser.parse(doc);
            
            console.log(`  Found ${errors.length} error(s)`);
            if (errors.length > 0) {
                errors.forEach(e => console.log(`    - Line ${e.line + 1}: ${e.message}`));
            }
            
            // full_adder.v should have no syntax errors
            if (errors.length === 0) {
                console.log('  ✓ Test 6 PASSED');
                passedTests++;
            } else {
                console.log('  ✗ Test 6 FAILED (expected 0 errors in full_adder.v)');
            }
        } else {
            console.log('  ⊘ Test 6 SKIPPED (full_adder.v not found)');
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`\nTest Results: ${passedTests}/${totalTests} tests passed`);
    console.log('='.repeat(60));

    return passedTests === totalTests;
}

// Run the tests
const success = runTests();
process.exit(success ? 0 : 1);
