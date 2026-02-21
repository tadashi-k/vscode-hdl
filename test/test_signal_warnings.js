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

// Shared mock for a workspace-wide module database (used by cross-file tests)
class MockModuleDatabase {
    constructor(modules) {
        this._modules = new Map(modules.map(m => [m.name, m]));
    }
    getModule(name) { return this._modules.get(name); }
    getAllModules() { return Array.from(this._modules.values()); }
}

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

    // Test 12: Input signal used as l-value in assign statement
    {
        totalTests++;
        console.log('\nTest 12: Input signal used as l-value in assign statement');
        const code = `
module input_assign_lval (
    input wire in_sig,
    output wire out_sig
);
    assign in_sig = 1'b0;
    assign out_sig = 1'b1;
endmodule
`;
        const doc = new MockTextDocument(code, 'input_assign_lval.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const hasInputLvalWarning = warnings.some(w =>
            w.message.includes('in_sig') && w.message.includes('cannot be used as l-value')
        );
        const noOutWarning = !warnings.some(w =>
            w.message.includes('out_sig') && w.message.includes('cannot be used as l-value')
        );

        if (hasInputLvalWarning && noOutWarning) {
            console.log('  ✓ Test 12 PASSED (input l-value warning detected, output not falsely warned)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 12 FAILED (hasInputLvalWarning: ${hasInputLvalWarning}, noOutWarning: ${noOutWarning})`);
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 13: Input signal used as l-value in procedural block
    {
        totalTests++;
        console.log('\nTest 13: Input signal used as l-value in procedural block');
        const code = `
module input_proc_lval (
    input wire clk,
    input wire data_in,
    output reg data_out
);
    always @(posedge clk) begin
        data_in <= 1'b0;
        data_out <= 1'b1;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'input_proc_lval.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const hasInputLvalWarning = warnings.some(w =>
            w.message.includes('data_in') && w.message.includes('cannot be used as l-value')
        );
        const noDataOutWarning = !warnings.some(w =>
            w.message.includes('data_out') && w.message.includes('cannot be used as l-value')
        );

        if (hasInputLvalWarning && noDataOutWarning) {
            console.log('  ✓ Test 13 PASSED (input procedural l-value warning detected)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 13 FAILED (hasInputLvalWarning: ${hasInputLvalWarning}, noDataOutWarning: ${noDataOutWarning})`);
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 14: Output port of instantiated module connected to reg signal
    {
        totalTests++;
        console.log('\nTest 14: Output port of instantiated module connected to reg signal');
        const code = `
module sub_mod (
    input wire clk,
    output wire result
);
    assign result = clk;
endmodule

module top_mod (
    input wire clk,
    output reg out
);
    reg captured;
    wire captured_wire;

    sub_mod u1 (
        .clk(clk),
        .result(captured)
    );

    sub_mod u2 (
        .clk(clk),
        .result(captured_wire)
    );

    always @(posedge clk) begin
        out <= captured;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'inst_output_reg.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const hasOutputRegWarning = warnings.some(w =>
            w.message.includes('captured') && w.message.includes('cannot be connected to reg')
        );
        const noWireWarning = !warnings.some(w =>
            w.message.includes('captured_wire') && w.message.includes('cannot be connected to reg')
        );

        if (hasOutputRegWarning && noWireWarning) {
            console.log('  ✓ Test 14 PASSED (output-port-to-reg warning detected, wire connection not falsely warned)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 14 FAILED (hasOutputRegWarning: ${hasOutputRegWarning}, noWireWarning: ${noWireWarning})`);
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 15: Output/internal signal never assigned
    {
        totalTests++;
        console.log('\nTest 15: Output/internal signal never assigned');
        const code = `
module never_assigned (
    input wire clk,
    output reg out_never,
    output reg out_assigned
);
    wire internal_never;
    wire internal_assigned;

    assign internal_assigned = clk;

    always @(posedge clk) begin
        out_assigned <= internal_assigned;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'never_assigned.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const hasOutNeverWarning = warnings.some(w =>
            w.message.includes('out_never') && w.message.includes('never assigned')
        );
        const hasInternalNeverWarning = warnings.some(w =>
            w.message.includes('internal_never') && w.message.includes('never assigned')
        );
        const noOutAssignedWarning = !warnings.some(w =>
            w.message.includes('out_assigned') && w.message.includes('never assigned')
        );
        const noInternalAssignedWarning = !warnings.some(w =>
            w.message.includes('internal_assigned') && w.message.includes('never assigned')
        );
        const noInputWarning = !warnings.some(w =>
            w.message.includes('clk') && w.message.includes('never assigned')
        );

        if (hasOutNeverWarning && hasInternalNeverWarning &&
            noOutAssignedWarning && noInternalAssignedWarning && noInputWarning) {
            console.log('  ✓ Test 15 PASSED (never-assigned warnings correct)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 15 FAILED`);
            console.log(`    out_never warned: ${hasOutNeverWarning}, internal_never warned: ${hasInternalNeverWarning}`);
            console.log(`    out_assigned not warned: ${noOutAssignedWarning}, internal_assigned not warned: ${noInternalAssignedWarning}`);
            console.log(`    clk not warned: ${noInputWarning}`);
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 16: Signal assigned via output port of instantiated module is not "never assigned"
    {
        totalTests++;
        console.log('\nTest 16: Signal assigned via instantiated module output port counts as assigned');
        const code = `
module producer (
    input wire clk,
    output wire data
);
    assign data = clk;
endmodule

module consumer (
    input wire clk,
    output reg result
);
    wire received;

    producer p1 (
        .clk(clk),
        .data(received)
    );

    always @(posedge clk) begin
        result <= received;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'inst_assigned.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const noReceivedNeverAssigned = !warnings.some(w =>
            w.message.includes('received') && w.message.includes('never assigned')
        );

        if (noReceivedNeverAssigned) {
            console.log('  ✓ Test 16 PASSED (no false "never assigned" for output-port-connected wire)');
            passedTests++;
        } else {
            console.log('  ✗ Test 16 FAILED (unexpected "never assigned" warning for received)');
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 17: Inout port of instantiated module connected to reg signal → warning
    {
        totalTests++;
        console.log('\nTest 17: Inout port of instantiated module connected to reg signal');
        const code = `
module bidir_mod (
    input wire clk,
    inout wire bus
);
    assign bus = clk;
endmodule

module top_inout (
    input wire clk,
    output reg out
);
    reg  bus_reg;
    wire bus_wire;

    bidir_mod u1 (
        .clk(clk),
        .bus(bus_reg)
    );

    bidir_mod u2 (
        .clk(clk),
        .bus(bus_wire)
    );

    always @(posedge clk) begin
        out <= bus_wire;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'inout_reg.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const hasInoutRegWarning = warnings.some(w =>
            w.message.includes('bus_reg') && w.message.includes('cannot be connected to reg')
        );
        const noWireWarning = !warnings.some(w =>
            w.message.includes('bus_wire') && w.message.includes('cannot be connected to reg')
        );

        if (hasInoutRegWarning && noWireWarning) {
            console.log('  ✓ Test 17 PASSED (inout-port-to-reg warning detected, wire not falsely warned)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 17 FAILED (hasInoutRegWarning: ${hasInoutRegWarning}, noWireWarning: ${noWireWarning})`);
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 18: Signal connected to inout port is treated as "assigned" (no "never assigned" warning)
    {
        totalTests++;
        console.log('\nTest 18: Signal connected to inout port counts as assigned');
        const code = `
module bidir_mod (
    input wire clk,
    inout wire bus
);
    assign bus = clk;
endmodule

module top_inout_assigned (
    input wire clk,
    output reg out
);
    wire bus_io;

    bidir_mod u1 (
        .clk(clk),
        .bus(bus_io)
    );

    always @(posedge clk) begin
        out <= bus_io;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'inout_assigned.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const noBusNeverAssigned = !warnings.some(w =>
            w.message.includes('bus_io') && w.message.includes('never assigned')
        );

        if (noBusNeverAssigned) {
            console.log('  ✓ Test 18 PASSED (no false "never assigned" for inout-port-connected wire)');
            passedTests++;
        } else {
            console.log('  ✗ Test 18 FAILED (unexpected "never assigned" warning for bus_io)');
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 19: Signal connected to input port counts as "used" (no "declared but never used" warning)
    {
        totalTests++;
        console.log('\nTest 19: Signal connected to input port counts as used');
        const code = `
module sub_mod (
    input wire data_in,
    output wire data_out
);
    assign data_out = data_in;
endmodule

module top_input_used (
    input wire clk,
    output wire result
);
    wire my_data;

    sub_mod u1 (
        .data_in(my_data),
        .data_out(result)
    );
endmodule
`;
        const doc = new MockTextDocument(code, 'input_used.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const noMyDataUnused = !warnings.some(w =>
            w.message.includes('my_data') && w.message.includes('never used')
        );

        if (noMyDataUnused) {
            console.log('  ✓ Test 19 PASSED (no false "never used" for input-port-connected signal)');
            passedTests++;
        } else {
            console.log('  ✗ Test 19 FAILED (unexpected "never used" warning for my_data)');
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 20: Cross-file module lookup via moduleDatabase (output port)
    {
        totalTests++;
        console.log('\nTest 20: Cross-file module lookup via moduleDatabase - output port assigned');

        // "ext_mod" is defined in another file, with an output port "data"
        const extModule = {
            name: 'ext_mod',
            uri: 'other_file.v',
            line: 0,
            character: 0,
            ports: [
                { name: 'clk', direction: 'input', type: 'wire' },
                { name: 'data', direction: 'output', type: 'wire' }
            ]
        };
        const mockDb = new MockModuleDatabase([extModule]);

        // top_mod instantiates ext_mod (defined in another file)
        const code = `
module top_mod (
    input wire clk,
    output reg out
);
    wire received;

    ext_mod u1 (
        .clk(clk),
        .data(received)
    );

    always @(posedge clk) begin
        out <= received;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'top_mod.v');
        const { errors, warnings } = parser.parseSymbols(doc, mockDb);

        const noReceivedNeverAssigned = !warnings.some(w =>
            w.message.includes('received') && w.message.includes('never assigned')
        );

        if (noReceivedNeverAssigned) {
            console.log('  ✓ Test 20 PASSED (cross-file output port: no false "never assigned" for received)');
            passedTests++;
        } else {
            console.log('  ✗ Test 20 FAILED (unexpected "never assigned" warning for received)');
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 21: Cross-file module lookup via moduleDatabase - reg connected to output port warns
    {
        totalTests++;
        console.log('\nTest 21: Cross-file module lookup via moduleDatabase - reg connected to output port');

        const extModule = {
            name: 'ext_producer',
            uri: 'other_file.v',
            line: 0,
            character: 0,
            ports: [
                { name: 'clk', direction: 'input', type: 'wire' },
                { name: 'result', direction: 'output', type: 'wire' }
            ]
        };
        const mockDb = new MockModuleDatabase([extModule]);

        const code = `
module top_cross (
    input wire clk,
    output reg out
);
    reg captured;

    ext_producer u1 (
        .clk(clk),
        .result(captured)
    );

    always @(posedge clk) begin
        out <= captured;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'top_cross.v');
        const { errors, warnings } = parser.parseSymbols(doc, mockDb);

        const hasCapturedRegWarning = warnings.some(w =>
            w.message.includes('captured') && w.message.includes('cannot be connected to reg')
        );

        if (hasCapturedRegWarning) {
            console.log('  ✓ Test 21 PASSED (cross-file: output-port-to-reg warning detected)');
            passedTests++;
        } else {
            console.log('  ✗ Test 21 FAILED (expected "cannot be connected to reg" warning for captured)');
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 22: Cross-file inout port - reg warning and assigned correctly
    {
        totalTests++;
        console.log('\nTest 22: Cross-file inout port - reg warning and assigned correctly');

        const extModule = {
            name: 'ext_bidir',
            uri: 'other_file.v',
            line: 0,
            character: 0,
            ports: [
                { name: 'clk', direction: 'input', type: 'wire' },
                { name: 'bus', direction: 'inout', type: 'wire' }
            ]
        };
        const mockDb = new MockModuleDatabase([extModule]);

        const code = `
module top_bidir (
    input wire clk,
    output reg out
);
    reg  bus_reg;
    wire bus_wire;

    ext_bidir u1 (
        .clk(clk),
        .bus(bus_reg)
    );

    ext_bidir u2 (
        .clk(clk),
        .bus(bus_wire)
    );

    always @(posedge clk) begin
        out <= bus_wire;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'top_bidir.v');
        const { errors, warnings } = parser.parseSymbols(doc, mockDb);

        const hasBusRegWarning = warnings.some(w =>
            w.message.includes('bus_reg') && w.message.includes('cannot be connected to reg')
        );
        const noBusWireRegWarning = !warnings.some(w =>
            w.message.includes('bus_wire') && w.message.includes('cannot be connected to reg')
        );
        const noBusWireNeverAssigned = !warnings.some(w =>
            w.message.includes('bus_wire') && w.message.includes('never assigned')
        );

        if (hasBusRegWarning && noBusWireRegWarning && noBusWireNeverAssigned) {
            console.log('  ✓ Test 22 PASSED (cross-file inout: reg warning, wire not warned, assigned correctly)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 22 FAILED (hasBusRegWarning: ${hasBusRegWarning}, noBusWireRegWarning: ${noBusWireRegWarning}, noBusWireNeverAssigned: ${noBusWireNeverAssigned})`);
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
