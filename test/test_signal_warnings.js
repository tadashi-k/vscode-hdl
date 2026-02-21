#!/usr/bin/env node

// Test script for signal-usage warnings in the ANTLR Verilog parser

// Mock vscode API for testing
const vscode = {
    DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3
    }
};

// Mock document class
class MockTextDocument {
    constructor(text, uri) {
        this.text = text;
        this.uri = { toString: () => uri };
        this.languageId = 'verilog';
    }

    getText() {
        return this.text;
    }
}

global.vscode = vscode;
const AntlrVerilogParser = require('../src/antlr-parser');

function runTests() {
    console.log('Running Signal Warning Tests...\n');
    console.log('='.repeat(60));

    let totalTests = 0;
    let passedTests = 0;

    const parser = new AntlrVerilogParser();

    // Test 1: Valid module - no signal warnings
    {
        totalTests++;
        console.log('\nTest 1: Valid module - no signal warnings');
        const code = `
module valid_module (
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
        const doc = new MockTextDocument(code, 'valid.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const pass = errors.length === 0 && warnings.length === 0;
        if (pass) {
            console.log('  ✓ Test 1 PASSED (0 errors, 0 warnings)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 1 FAILED (${errors.length} errors, ${warnings.length} warnings)`);
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 2: Signal referenced but not declared
    {
        totalTests++;
        console.log('\nTest 2: Signal referenced but not declared');
        const code = `
module undef_ref (
    input wire clk,
    output reg out
);
    always @(posedge clk) begin
        out <= undefined_signal;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'undef_ref.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const hasUndefinedWarning = warnings.some(w =>
            w.message.includes('undefined_signal') &&
            w.message.includes('referenced but not declared')
        );

        if (hasUndefinedWarning) {
            console.log('  ✓ Test 2 PASSED (undefined signal warning detected)');
            passedTests++;
        } else {
            console.log('  ✗ Test 2 FAILED (expected "referenced but not declared" warning)');
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 3: Signal declared but never used
    {
        totalTests++;
        console.log('\nTest 3: Signal declared but never used');
        const code = `
module unused_signal (
    input wire clk,
    output reg out
);
    wire unused_wire;
    reg unused_reg;

    always @(posedge clk) begin
        out <= 1'b1;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'unused.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const unusedWireWarning = warnings.some(w =>
            w.message.includes('unused_wire') && w.message.includes('never used')
        );
        const unusedRegWarning = warnings.some(w =>
            w.message.includes('unused_reg') && w.message.includes('never used')
        );

        if (unusedWireWarning && unusedRegWarning) {
            console.log('  ✓ Test 3 PASSED (both unused signal warnings detected)');
            passedTests++;
        } else {
            console.log('  ✗ Test 3 FAILED');
            console.log(`    unused_wire warning: ${unusedWireWarning}, unused_reg warning: ${unusedRegWarning}`);
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 4: Assign statement l-value is reg
    {
        totalTests++;
        console.log('\nTest 4: Assign statement l-value is reg');
        const code = `
module assign_reg (
    input wire in_sig,
    output reg out_reg
);
    assign out_reg = in_sig;
endmodule
`;
        const doc = new MockTextDocument(code, 'assign_reg.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const hasAssignRegWarning = warnings.some(w =>
            w.message.includes('out_reg') && w.message.includes('l-value') && w.message.includes('reg')
        );

        if (hasAssignRegWarning) {
            console.log('  ✓ Test 4 PASSED (assign reg warning detected)');
            passedTests++;
        } else {
            console.log('  ✗ Test 4 FAILED (expected "assign l-value is reg" warning)');
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 5: Procedural assignment l-value is wire (blocking =)
    {
        totalTests++;
        console.log('\nTest 5: Blocking assignment l-value is wire');
        const code = `
module proc_wire_blocking (
    input wire clk,
    output wire out_wire
);
    always @(posedge clk) begin
        out_wire = 1'b1;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'proc_wire_blocking.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const hasProcWireWarning = warnings.some(w =>
            w.message.includes('out_wire') && w.message.includes('wire')
        );

        if (hasProcWireWarning) {
            console.log('  ✓ Test 5 PASSED (procedural wire warning detected)');
            passedTests++;
        } else {
            console.log('  ✗ Test 5 FAILED (expected "procedural assignment l-value is wire" warning)');
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 6: Procedural assignment l-value is wire (non-blocking <=)
    {
        totalTests++;
        console.log('\nTest 6: Non-blocking assignment l-value is wire');
        const code = `
module proc_wire_nonblocking (
    input wire clk,
    output wire out_wire
);
    always @(posedge clk) begin
        out_wire <= 1'b1;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'proc_wire_nonblocking.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const hasProcWireWarning = warnings.some(w =>
            w.message.includes('out_wire') && w.message.includes('wire')
        );

        if (hasProcWireWarning) {
            console.log('  ✓ Test 6 PASSED (non-blocking wire warning detected)');
            passedTests++;
        } else {
            console.log('  ✗ Test 6 FAILED (expected "procedural assignment l-value is wire" warning)');
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 7: No false warning for valid reg in always block
    {
        totalTests++;
        console.log('\nTest 7: No false warning for valid reg in always block');
        const code = `
module valid_reg_always (
    input wire clk,
    output reg out_reg
);
    always @(posedge clk) begin
        out_reg <= 1'b1;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'valid_reg.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const hasNoWarnings = warnings.length === 0;

        if (hasNoWarnings) {
            console.log('  ✓ Test 7 PASSED (no warnings for valid reg in always)');
            passedTests++;
        } else {
            console.log('  ✗ Test 7 FAILED (unexpected warnings)');
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 8: No false warning for valid wire in assign statement
    {
        totalTests++;
        console.log('\nTest 8: No false warning for valid wire in assign statement');
        const code = `
module valid_wire_assign (
    input wire in_sig,
    output wire out_wire
);
    assign out_wire = in_sig;
endmodule
`;
        const doc = new MockTextDocument(code, 'valid_wire.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const hasNoWarnings = warnings.length === 0;

        if (hasNoWarnings) {
            console.log('  ✓ Test 8 PASSED (no warnings for valid wire in assign)');
            passedTests++;
        } else {
            console.log('  ✗ Test 8 FAILED (unexpected warnings)');
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 9: parse() includes both syntax errors and warnings
    {
        totalTests++;
        console.log('\nTest 9: parse() includes both syntax errors and warnings');
        const code = `
module mixed_issues (
    input wire clk,
    output reg out
);
    wire unused_wire;
    always @(posedge clk) begin
        out <= 1'b1
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'mixed.v');
        const issues = parser.parse(doc);

        const hasSyntaxError = issues.some(i => i.severity === vscode.DiagnosticSeverity.Error);
        const hasWarning = issues.some(i =>
            i.severity === vscode.DiagnosticSeverity.Warning &&
            i.message.includes('unused_wire')
        );

        if (hasSyntaxError && hasWarning) {
            console.log('  ✓ Test 9 PASSED (parse() returns both errors and warnings)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 9 FAILED (hasSyntaxError: ${hasSyntaxError}, hasWarning: ${hasWarning})`);
            issues.forEach(i => {
                const sev = i.severity === vscode.DiagnosticSeverity.Error ? 'ERROR' : 'WARNING';
                console.log(`    [${sev}] Line ${i.line + 1}: ${i.message}`);
            });
        }
    }

    // Test 10: Warning severity is DiagnosticSeverity.Warning
    {
        totalTests++;
        console.log('\nTest 10: Warning severity is DiagnosticSeverity.Warning');
        const code = `
module check_severity (
    input wire clk,
    output reg out
);
    wire unused;
    always @(posedge clk) begin
        out <= 1'b1;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'severity.v');
        const { warnings } = parser.parseSymbols(doc);

        const allAreWarnings = warnings.length > 0 &&
            warnings.every(w => w.severity === vscode.DiagnosticSeverity.Warning);

        if (allAreWarnings) {
            console.log('  ✓ Test 10 PASSED (all warnings have Warning severity)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 10 FAILED (warnings: ${warnings.length}, all warnings: ${allAreWarnings})`);
            warnings.forEach(w => console.log(`    severity=${w.severity}: ${w.message}`));
        }
    }

    // Test 11: Multiple modules - warnings are per-module
    {
        totalTests++;
        console.log('\nTest 11: Multiple modules - warnings scoped per module');
        const code = `
module mod_a (
    input wire x,
    output wire y
);
    assign y = x;
endmodule

module mod_b (
    input wire a
);
    wire unused_in_b;
endmodule
`;
        const doc = new MockTextDocument(code, 'two_mods.v');
        const { warnings } = parser.parseSymbols(doc);

        // mod_a: all signals used, no warnings for x or y
        const mod_a_warnings = warnings.filter(w => {
            return w.message.includes("'x'") || w.message.includes("'y'");
        });
        // mod_b: unused_in_b is declared but never referenced in the module body
        const hasUnusedInB = warnings.some(w => w.message.includes('unused_in_b'));

        if (mod_a_warnings.length === 0 && hasUnusedInB) {
            console.log('  ✓ Test 11 PASSED (warnings correctly scoped per module)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 11 FAILED (mod_a spurious warnings: ${mod_a_warnings.length}, hasUnusedInB: ${hasUnusedInB})`);
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`\nTest Results: ${passedTests}/${totalTests} tests passed`);
    console.log('='.repeat(60));

    return passedTests === totalTests;
}

const success = runTests();
process.exit(success ? 0 : 1);
