#!/usr/bin/env node

// Test script for ANTLR Verilog parser
import * as fs from 'fs';
import * as path from 'path';

// Mock vscode API for testing
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
    }
};

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
        return { line: lines.length - 1 };
    }

    lineAt(line) {
        return {
            text: this.lines[line] || '',
            firstNonWhitespaceCharacterIndex: (this.lines[line] || '').search(/\S/),
        };
    }
}

// Load AntlrVerilogParser class from src/antlr-parser.js
// Mock vscode module for the parser
(global as any).vscode = vscode;
import AntlrVerilogParser = require('../src/antlr-parser');

function runTests() {
    console.log('Running ANTLR Verilog Parser Tests...\n');
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
        if (enable) begin
            counter <= counter + 1;
            data_out <= data_in;
        end
    end

    assign enable = 1'b1;
endmodule
`;
        const doc = new MockTextDocument(validCode, 'test_valid.v');
        const parser = new AntlrVerilogParser();
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
        const parser = new AntlrVerilogParser();
        const errors = parser.parse(doc);
        
        console.log(`  Found ${errors.length} error(s)`);
        if (errors.length > 0) {
            errors.forEach(e => console.log(`    - Line ${e.line + 1}: ${e.message}`));
        }
        
        // ANTLR should detect syntax error for missing endmodule
        if (errors.length > 0) {
            console.log('  ✓ Test 2 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 2 FAILED (expected at least 1 error)');
        }
    }

    // Test 3: Invalid syntax - unclosed parenthesis
    {
        totalTests++;
        console.log('\nTest 3: Unclosed parenthesis');
        const code = `
module bracket_test (
    input wire a
);
    wire result;
    assign result = (a & 1'b1;
endmodule
`;
        const doc = new MockTextDocument(code, 'test_brackets.v');
        const parser = new AntlrVerilogParser();
        const errors = parser.parse(doc);
        
        console.log(`  Found ${errors.length} error(s)`);
        if (errors.length > 0) {
            errors.forEach(e => console.log(`    - Line ${e.line + 1}: ${e.message}`));
        }
        
        if (errors.length > 0) {
            console.log('  ✓ Test 3 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 3 FAILED (expected at least 1 error)');
        }
    }

    // Test 4: Existing test file (full_adder.v)
    {
        totalTests++;
        console.log('\nTest 4: Existing test file (full_adder.v)');
        const testPath = path.join(__dirname, '../contents', 'full_adder.v');
        
        if (fs.existsSync(testPath)) {
            const testContent = fs.readFileSync(testPath, 'utf8');
            const doc = new MockTextDocument(testContent, testPath);
            const parser = new AntlrVerilogParser();
            const errors = parser.parse(doc);
            
            console.log(`  Found ${errors.length} error(s)`);
            if (errors.length > 0) {
                errors.forEach(e => console.log(`    - Line ${e.line + 1}: ${e.message}`));
            }
            
            // full_adder.v should have no syntax errors
            if (errors.length === 0) {
                console.log('  ✓ Test 4 PASSED');
                passedTests++;
            } else {
                console.log('  ✗ Test 4 FAILED (expected 0 errors in full_adder.v)');
            }
        } else {
            console.log('  ⊘ Test 4 SKIPPED (full_adder.v not found)');
        }
    }

    // Test 5: generate block with if and for
    {
        totalTests++;
        console.log('\nTest 5: generate block with if and for');
        const code = `
module gen_test #(parameter N = 4) (
    output wire [N-1:0] out
);
    genvar i;
    generate
        if (N == 4) begin
            assign out = 4'b0;
        end else begin
            assign out = {N{1'b0}};
        end
    endgenerate
endmodule
`;
        const doc = new MockTextDocument(code, 'test_generate.v');
        const parser = new AntlrVerilogParser();
        const errors = parser.parse(doc);

        console.log(`  Found ${errors.length} error(s)`);
        if (errors.length > 0) {
            errors.forEach(e => console.log(`    - Line ${e.line + 1}: ${e.message}`));
        }

        if (errors.length === 0) {
            console.log('  ✓ Test 5 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 5 FAILED (expected 0 errors for generate/genvar)');
        }
    }

    // Test 6: generate for loop with genvar
    {
        totalTests++;
        console.log('\nTest 6: generate for loop with genvar');
        const code = `
module gen_for_test #(parameter N = 4) (
    input wire clk,
    output wire [N-1:0] out
);
    genvar i;
    generate
        for (i = 0; i < N; i = i + 1) begin : gen_loop
            assign out[i] = clk;
        end
    endgenerate
endmodule
`;
        const doc = new MockTextDocument(code, 'test_generate_for.v');
        const parser = new AntlrVerilogParser();
        const errors = parser.parse(doc);

        console.log(`  Found ${errors.length} error(s)`);
        if (errors.length > 0) {
            errors.forEach(e => console.log(`    - Line ${e.line + 1}: ${e.message}`));
        }

        if (errors.length === 0) {
            console.log('  ✓ Test 6 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 6 FAILED (expected 0 errors for generate for loop)');
        }
    }

    // Test 7: task declaration in module
    {
        totalTests++;
        console.log('\nTest 7: task declaration in module');
        const code = `
module task_test (
    input wire clk,
    output reg [7:0] out
);
    task my_task;
        input [7:0] a;
        output [7:0] b;
        begin
            b = a + 1;
        end
    endtask

    always @(posedge clk) begin
        out <= 8'h00;
        my_task(8'h01, out);
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'test_task.v');
        const parser = new AntlrVerilogParser();
        const errors = parser.parse(doc);

        console.log(`  Found ${errors.length} error(s)`);
        if (errors.length > 0) {
            errors.forEach(e => console.log(`    - Line ${e.line + 1}: ${e.message}`));
        }

        if (errors.length === 0) {
            console.log('  ✓ Test 7 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 7 FAILED (expected 0 errors for task declaration)');
        }
    }

    // Test 8: function declaration in module
    {
        totalTests++;
        console.log('\nTest 8: function declaration in module');
        const code = `
module func_test (
    input wire clk,
    output reg [7:0] result
);
    function [7:0] my_func;
        input [7:0] a;
        my_func = a + 1;
    endfunction

    always @(posedge clk) begin
        result = my_func(8'h05);
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'test_function.v');
        const parser = new AntlrVerilogParser();
        const errors = parser.parse(doc);

        console.log(`  Found ${errors.length} error(s)`);
        if (errors.length > 0) {
            errors.forEach(e => console.log(`    - Line ${e.line + 1}: ${e.message}`));
        }

        if (errors.length === 0) {
            console.log('  ✓ Test 8 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 8 FAILED (expected 0 errors for function declaration)');
        }
    }

    // Test 9: fork/join in statement
    {
        totalTests++;
        console.log('\nTest 9: fork/join in statement');
        const code = `
module fork_test (
    output reg a,
    output reg b
);
    initial begin
        fork
            a = 1'b0;
            b = 1'b1;
        join
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'test_fork_join.v');
        const parser = new AntlrVerilogParser();
        const errors = parser.parse(doc);

        console.log(`  Found ${errors.length} error(s)`);
        if (errors.length > 0) {
            errors.forEach(e => console.log(`    - Line ${e.line + 1}: ${e.message}`));
        }

        if (errors.length === 0) {
            console.log('  ✓ Test 9 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 9 FAILED (expected 0 errors for fork/join)');
        }
    }

    // Test 10: delay_or_event_control as standalone statement
    {
        totalTests++;
        console.log('\nTest 10: delay_or_event_control as standalone statement');
        const code = `
module delay_test (
    input wire clk,
    output reg a
);
    initial begin
        #10;
        #10 a = 1'b1;
        @(posedge clk);
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'test_delay.v');
        const parser = new AntlrVerilogParser();
        const errors = parser.parse(doc);

        console.log(`  Found ${errors.length} error(s)`);
        if (errors.length > 0) {
            errors.forEach(e => console.log(`    - Line ${e.line + 1}: ${e.message}`));
        }

        if (errors.length === 0) {
            console.log('  ✓ Test 10 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 10 FAILED (expected 0 errors for delay_or_event_control statement)');
        }
    }

    // Test 11: system task enable ($display, $finish, etc.)
    {
        totalTests++;
        console.log('\nTest 11: system task enable');
        const code = `
module sys_task_test (
    output reg [7:0] data
);
    initial begin
        data = 8'hAB;
        $display("data = %h", data);
        $finish;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'test_system_task.v');
        const parser = new AntlrVerilogParser();
        const errors = parser.parse(doc);

        console.log(`  Found ${errors.length} error(s)`);
        if (errors.length > 0) {
            errors.forEach(e => console.log(`    - Line ${e.line + 1}: ${e.message}`));
        }

        if (errors.length === 0) {
            console.log('  ✓ Test 11 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 11 FAILED (expected 0 errors for system task enable)');
        }
    }

    // Test 12: task enable (calling a task)
    {
        totalTests++;
        console.log('\nTest 12: task enable');
        const code = `
module task_enable_test (
    input wire clk,
    input wire [7:0] data_in,
    output reg [7:0] out
);
    task display_val;
        input [7:0] v;
        $display("v = %h", v);
    endtask

    always @(posedge clk) begin
        out <= data_in;
        display_val(data_in);
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'test_task_enable.v');
        const parser = new AntlrVerilogParser();
        const errors = parser.parse(doc);

        console.log(`  Found ${errors.length} error(s)`);
        if (errors.length > 0) {
            errors.forEach(e => console.log(`    - Line ${e.line + 1}: ${e.message}`));
        }

        if (errors.length === 0) {
            console.log('  ✓ Test 12 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 12 FAILED (expected 0 errors for task enable)');
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
