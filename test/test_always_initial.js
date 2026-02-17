#!/usr/bin/env node

// Test script for always and initial block parsing
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

// Load VerilogParser class from src/parser.js
global.vscode = vscode;
const VerilogParser = require('../src/parser');

function runTests() {
    console.log('Running Always/Initial Block Parser Tests...\n');
    console.log('='.repeat(60));

    let totalTests = 0;
    let passedTests = 0;

    // Test 1: Valid always with @(posedge)
    {
        totalTests++;
        console.log('\nTest 1: Valid always with @(posedge)');
        const code = `
module test (
    input wire clk,
    output reg q
);
    always @(posedge clk) begin
        q <= 1'b1;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'test_valid_always.v');
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
            console.log('  ✗ Test 1 FAILED');
        }
    }

    // Test 2: Valid always with @*
    {
        totalTests++;
        console.log('\nTest 2: Valid always with @*');
        const code = `
module test (
    input wire a, b,
    output reg c
);
    always @*
        c = a & b;
endmodule
`;
        const doc = new MockTextDocument(code, 'test_always_star.v');
        const parser = new VerilogParser();
        const errors = parser.parse(doc);
        
        console.log(`  Found ${errors.length} error(s)`);
        if (errors.length > 0) {
            errors.forEach(e => console.log(`    - Line ${e.line + 1}: ${e.message}`));
        }
        
        if (errors.length === 0) {
            console.log('  ✓ Test 2 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 2 FAILED');
        }
    }

    // Test 3: Valid always with @(*)
    {
        totalTests++;
        console.log('\nTest 3: Valid always with @(*)');
        const code = `
module test (
    input wire a, b,
    output reg c
);
    always @(*) begin
        c = a & b;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'test_always_star_paren.v');
        const parser = new VerilogParser();
        const errors = parser.parse(doc);
        
        console.log(`  Found ${errors.length} error(s)`);
        if (errors.length > 0) {
            errors.forEach(e => console.log(`    - Line ${e.line + 1}: ${e.message}`));
        }
        
        if (errors.length === 0) {
            console.log('  ✓ Test 3 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 3 FAILED');
        }
    }

    // Test 4: Valid initial block
    {
        totalTests++;
        console.log('\nTest 4: Valid initial block');
        const code = `
module test (
    output reg [7:0] data
);
    initial begin
        data = 8'h00;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'test_valid_initial.v');
        const parser = new VerilogParser();
        const errors = parser.parse(doc);
        
        console.log(`  Found ${errors.length} error(s)`);
        if (errors.length > 0) {
            errors.forEach(e => console.log(`    - Line ${e.line + 1}: ${e.message}`));
        }
        
        if (errors.length === 0) {
            console.log('  ✓ Test 4 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 4 FAILED');
        }
    }

    // Test 5: Always without timing control
    {
        totalTests++;
        console.log('\nTest 5: Always without timing control (ERROR)');
        const code = `
module test (
    input wire clk,
    output reg q
);
    always begin
        q <= 1'b1;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'test_always_no_timing.v');
        const parser = new VerilogParser();
        const errors = parser.parse(doc);
        
        console.log(`  Found ${errors.length} error(s)`);
        if (errors.length > 0) {
            errors.forEach(e => console.log(`    - Line ${e.line + 1}: ${e.message}`));
        }
        
        const hasTimingError = errors.some(e => e.message.includes('timing control'));
        if (hasTimingError) {
            console.log('  ✓ Test 5 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 5 FAILED (expected timing control error)');
        }
    }

    // Test 6: Always without statement
    {
        totalTests++;
        console.log('\nTest 6: Always without statement (ERROR)');
        const code = `
module test (
    input wire clk
);
    always @(posedge clk)
endmodule
`;
        const doc = new MockTextDocument(code, 'test_always_no_stmt.v');
        const parser = new VerilogParser();
        const errors = parser.parse(doc);
        
        console.log(`  Found ${errors.length} error(s)`);
        if (errors.length > 0) {
            errors.forEach(e => console.log(`    - Line ${e.line + 1}: ${e.message}`));
        }
        
        const hasStmtError = errors.some(e => e.message.includes('missing a statement'));
        if (hasStmtError) {
            console.log('  ✓ Test 6 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 6 FAILED (expected missing statement error)');
        }
    }

    // Test 7: Initial with sensitivity list
    {
        totalTests++;
        console.log('\nTest 7: Initial with @ sensitivity list (ERROR)');
        const code = `
module test (
    input wire clk,
    output reg q
);
    initial @(posedge clk) begin
        q = 1'b1;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'test_initial_with_at.v');
        const parser = new VerilogParser();
        const errors = parser.parse(doc);
        
        console.log(`  Found ${errors.length} error(s)`);
        if (errors.length > 0) {
            errors.forEach(e => console.log(`    - Line ${e.line + 1}: ${e.message}`));
        }
        
        const hasSensError = errors.some(e => e.message.includes('cannot have sensitivity'));
        if (hasSensError) {
            console.log('  ✓ Test 7 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 7 FAILED (expected sensitivity list error)');
        }
    }

    // Test 8: Initial without statement
    {
        totalTests++;
        console.log('\nTest 8: Initial without statement (ERROR)');
        const code = `
module test (
    output reg q
);
    initial
endmodule
`;
        const doc = new MockTextDocument(code, 'test_initial_no_stmt.v');
        const parser = new VerilogParser();
        const errors = parser.parse(doc);
        
        console.log(`  Found ${errors.length} error(s)`);
        if (errors.length > 0) {
            errors.forEach(e => console.log(`    - Line ${e.line + 1}: ${e.message}`));
        }
        
        const hasStmtError = errors.some(e => e.message.includes('missing a statement'));
        if (hasStmtError) {
            console.log('  ✓ Test 8 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 8 FAILED (expected missing statement error)');
        }
    }

    // Test 9: Always with empty sensitivity list
    {
        totalTests++;
        console.log('\nTest 9: Always with empty sensitivity list (WARNING)');
        const code = `
module test (
    input wire clk,
    output reg q
);
    always @() begin
        q <= 1'b1;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'test_always_empty_sens.v');
        const parser = new VerilogParser();
        const errors = parser.parse(doc);
        
        console.log(`  Found ${errors.length} error(s)`);
        if (errors.length > 0) {
            errors.forEach(e => {
                const severity = e.severity === vscode.DiagnosticSeverity.Error ? 'ERROR' : 'WARNING';
                console.log(`    - Line ${e.line + 1} [${severity}]: ${e.message}`);
            });
        }
        
        const hasEmptyError = errors.some(e => e.message.includes('empty sensitivity'));
        if (hasEmptyError) {
            console.log('  ✓ Test 9 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 9 FAILED (expected empty sensitivity list warning)');
        }
    }

    // Test 10: Test the comprehensive test file
    {
        totalTests++;
        console.log('\nTest 10: Comprehensive test file (test_always_initial.v)');
        const testPath = path.join(__dirname, '../contents', 'test_always_initial.v');
        
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
            
            // We expect at least 4 errors in the test file:
            // - Line 68: Always without timing control
            // - Line 77: Always without statement
            // - Line 106: Initial with sensitivity list
            // - Line 115: Initial without statement
            // Note: Unmatched begin/end blocks would require additional begin/end matching logic
            if (errors.length >= 4) {
                console.log('  ✓ Test 10 PASSED');
                passedTests++;
            } else {
                console.log(`  ✗ Test 10 FAILED (expected at least 4 errors, got ${errors.length})`);
            }
        } else {
            console.log('  ⊘ Test 10 SKIPPED (test_always_initial.v not found)');
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
