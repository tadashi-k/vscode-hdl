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

(global as any).vscode = vscode;
import AntlrVerilogParser = require('../src/antlr-parser');

// Shared mock for a workspace-wide module database (used by cross-file tests)
class MockModuleDatabase {
    _modules: any;
    constructor(modules) {
        this._modules = new Map(modules.map(m => [m.name, m]));
    }
    getModule(name) { return this._modules.get(name); }
    getAllModules() { return Array.from(this._modules.values()) as any[]; }
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
        if (enable) begin
            counter <= counter + 1;
            data_out <= data_in;
        end
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

    // Test 23: Signal only used as l-value (never read) → "declared but never used" warning (Bug #1)
    {
        totalTests++;
        console.log('\nTest 23: Signal only used as l-value (never read) - "never used" warning');
        const code = `
module lval_only (
    input wire clk,
    output reg out
);
    wire x;
    assign x = 1'b0;

    always @(posedge clk) begin
        out <= clk;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'lval_only.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const hasNeverUsedX = warnings.some(w =>
            w.message.includes("'x'") && w.message.includes('never used')
        );
        const noNeverUsedOut = !warnings.some(w =>
            w.message.includes("'out'") && w.message.includes('never used')
        );

        if (hasNeverUsedX && noNeverUsedOut) {
            console.log('  ✓ Test 23 PASSED (l-value-only signal correctly warned "never used"; output port not falsely warned)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 23 FAILED (hasNeverUsedX: ${hasNeverUsedX}, noNeverUsedOut: ${noNeverUsedOut})`);
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 24: Signal only connected to output port of instance (never read) → "never used" warning (Bug #2)
    {
        totalTests++;
        console.log('\nTest 24: Signal only connected to output port of instance (never read) - "never used" warning');
        const code = `
module driver (
    output wire data
);
    assign data = 1'b0;
endmodule

module top_driven_only (
    input wire clk,
    output reg out
);
    wire driven_only;

    driver u1 (
        .data(driven_only)
    );

    always @(posedge clk) begin
        out <= clk;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'driven_only.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const hasDrivenOnlyNeverUsed = warnings.some(w =>
            w.message.includes('driven_only') && w.message.includes('never used')
        );
        const noOutNeverUsed = !warnings.some(w =>
            w.message.includes("'out'") && w.message.includes('never used')
        );

        if (hasDrivenOnlyNeverUsed && noOutNeverUsed) {
            console.log('  ✓ Test 24 PASSED (output-port-driven-only signal correctly warned "never used"; output port not falsely warned)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 24 FAILED (hasDrivenOnlyNeverUsed: ${hasDrivenOnlyNeverUsed}, noOutNeverUsed: ${noOutNeverUsed})`);
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 25: Cross-file resolution for counter.v + full_adder.v (issue scenario)
    // Simulates opening counter.v when full_adder module ports are in the database.
    // Signals connected to output ports (enable via .cout) should be "assigned",
    // and signals connected to input ports (a via .a, b via .b) should be "used".
    {
        totalTests++;
        console.log('\nTest 25: Cross-file counter.v + full_adder.v - no false warnings for port-connected signals');

        // Build moduleDatabase from full_adder.v (simulating workspace scan)
        const fullAdderCode = `
module full_adder (
    input wire a,
    input wire b,
    input wire cin,
    output wire sum,
    output wire cout
);
    assign sum = a ^ b ^ cin;
    assign cout = (a & b) | (b & cin) | (a & cin);
endmodule
`;
        const fullAdderDoc = new MockTextDocument(fullAdderCode, 'full_adder.v');
        const fullAdderResult = parser.parseSymbols(fullAdderDoc);
        const crossDb = new MockModuleDatabase(fullAdderResult.modules);

        // Parse counter.v with the cross-file database
        const counterCode = `
module counter (
    input wire clk,
    input wire reset,
    output reg [7:0] count
);
parameter WIDTH = 8;
localparam MAX_COUNT = (1 << WIDTH) - 1;

    wire enable;
    reg [WIDTH-1:0] internal_count;
    reg a, b;

    always @(posedge clk or posedge reset) begin
        if (reset && !enable) begin
            count <= 8'b0;
        end else begin
            count <= count + 1;
        end
        internal_count <= internal_count + 4'd1;
        a <= internal_count[0];
        b <= internal_count[1];
    end

    full_adder full_adder_i(
        .a(a),
        .b(b),
        .cin(),
        .sum(),
        .cout(enable)
    );

endmodule
`;
        const counterDoc = new MockTextDocument(counterCode, 'counter.v');
        const { errors: cErrors, warnings: cWarnings } = parser.parseSymbols(counterDoc, crossDb);

        const noEnableNeverAssigned = !cWarnings.some(w =>
            w.message.includes("'enable'") && w.message.includes('never assigned')
        );
        const noANeverUsed = !cWarnings.some(w =>
            w.message.includes("'a'") && w.message.includes('never used')
        );
        const noBNeverUsed = !cWarnings.some(w =>
            w.message.includes("'b'") && w.message.includes('never used')
        );

        if (noEnableNeverAssigned && noANeverUsed && noBNeverUsed) {
            console.log('  ✓ Test 25 PASSED (no false warnings for enable, a, b with cross-file full_adder ports)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 25 FAILED (noEnableNeverAssigned: ${noEnableNeverAssigned}, noANeverUsed: ${noANeverUsed}, noBNeverUsed: ${noBNeverUsed})`);
            cWarnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 26: Wire assignment with initial value - 'a' should be treated as 'assigned'
    {
        totalTests++;
        console.log('\nTest 26: Wire with initial value treated as assigned');
        const code = `
module wire_init (
    input wire clk
);
    wire a = 1'b1;

    always @(posedge clk) begin
        if (a) begin
            ;
        end
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'wire_init.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const noNeverAssigned = !warnings.some(w =>
            w.message.includes("'a'") && w.message.includes('never assigned')
        );
        const noNeverUsed = !warnings.some(w =>
            w.message.includes("'a'") && w.message.includes('never used')
        );

        if (noNeverAssigned && noNeverUsed && errors.length === 0) {
            console.log('  ✓ Test 26 PASSED (wire with initial value correctly treated as assigned and used)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 26 FAILED (noNeverAssigned: ${noNeverAssigned}, noNeverUsed: ${noNeverUsed}, errors: ${errors.length})`);
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
            errors.forEach(e => console.log(`    ERROR: Line ${e.line + 1}: ${e.message}`));
        }
    }

    // Test 27: Reg assignment with initial value - 'r' should be treated as 'assigned'
    {
        totalTests++;
        console.log('\nTest 27: Reg with initial value treated as assigned');
        const code = `
module reg_init (
    input wire clk
);
    reg r = 1'b0;

    always @(posedge clk) begin
        if (r) begin
            ;
        end
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'reg_init.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const noNeverAssigned = !warnings.some(w =>
            w.message.includes("'r'") && w.message.includes('never assigned')
        );

        if (noNeverAssigned && errors.length === 0) {
            console.log('  ✓ Test 27 PASSED (reg with initial value correctly treated as assigned)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 27 FAILED (noNeverAssigned: ${noNeverAssigned}, errors: ${errors.length})`);
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
            errors.forEach(e => console.log(`    ERROR: Line ${e.line + 1}: ${e.message}`));
        }
    }

    // Test 28: Two-dimensional array access a[0][1] parses without errors
    {
        totalTests++;
        console.log('\nTest 28: Two-dimensional array access a[0][1]');
        const code = `
module twodim (
    input wire clk,
    output reg out
);
    reg [7:0] mem [0:3];
    reg [7:0] tmp;

    always @(posedge clk) begin
        tmp <= mem[0];
        out <= tmp[1];
    end

    always @(posedge clk) begin
        mem[0] <= 8'hFF;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'twodim.v');
        const { errors } = parser.parseSymbols(doc);

        if (errors.length === 0) {
            console.log('  ✓ Test 28 PASSED (two-dimensional array access parses without errors)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 28 FAILED (errors: ${errors.length})`);
            errors.forEach(e => console.log(`    ERROR: Line ${e.line + 1}: ${e.message}`));
        }
    }

    // Test 29: Concatenation lvalue - signals treated as 'assigned'
    {
        totalTests++;
        console.log('\nTest 29: Concatenation lvalue treated as assigned');
        const code = `
module concat_assign (
    input wire clk,
    input wire [9:0] data_in,
    output reg [3:0] a,
    output reg [2:0] b,
    output reg [2:0] c
);
    always @(posedge clk) begin
        {a, b, c} <= data_in;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'concat_assign.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const noANeverAssigned = !warnings.some(w =>
            w.message.includes("'a'") && w.message.includes('never assigned')
        );
        const noBNeverAssigned = !warnings.some(w =>
            w.message.includes("'b'") && w.message.includes('never assigned')
        );
        const noCNeverAssigned = !warnings.some(w =>
            w.message.includes("'c'") && w.message.includes('never assigned')
        );

        if (noANeverAssigned && noBNeverAssigned && noCNeverAssigned && errors.length === 0) {
            console.log('  ✓ Test 29 PASSED (concatenation lvalue members correctly treated as assigned)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 29 FAILED (a: ${noANeverAssigned}, b: ${noBNeverAssigned}, c: ${noCNeverAssigned}, errors: ${errors.length})`);
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
            errors.forEach(e => console.log(`    ERROR: Line ${e.line + 1}: ${e.message}`));
        }
    }

    // Test 30: Concatenation rvalue - signals treated as 'used'
    {
        totalTests++;
        console.log('\nTest 30: Concatenation rvalue treated as used');
        const code = `
module concat_ref (
    input wire clk,
    output reg [9:0] sum
);
    wire [3:0] a;
    wire [2:0] b;
    wire [2:0] c;

    assign a = 4'b0;
    assign b = 3'b0;
    assign c = 3'b0;

    always @(posedge clk) begin
        sum <= {a, b, c};
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'concat_ref.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const noANeverUsed = !warnings.some(w =>
            w.message.includes("'a'") && w.message.includes('never used')
        );
        const noBNeverUsed = !warnings.some(w =>
            w.message.includes("'b'") && w.message.includes('never used')
        );
        const noCNeverUsed = !warnings.some(w =>
            w.message.includes("'c'") && w.message.includes('never used')
        );

        if (noANeverUsed && noBNeverUsed && noCNeverUsed && errors.length === 0) {
            console.log('  ✓ Test 30 PASSED (concatenation rvalue members correctly treated as used)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 30 FAILED (a: ${noANeverUsed}, b: ${noBNeverUsed}, c: ${noCNeverUsed}, errors: ${errors.length})`);
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
            errors.forEach(e => console.log(`    ERROR: Line ${e.line + 1}: ${e.message}`));
        }
    }

    // Test 31: Continuous assign with concatenation lvalue
    {
        totalTests++;
        console.log('\nTest 31: Continuous assign with concatenation lvalue');
        const code = `
module concat_cont_assign (
    input wire [9:0] data_in
);
    wire [3:0] x;
    wire [2:0] y;
    wire [2:0] z;

    assign {x, y, z} = data_in;
endmodule
`;
        const doc = new MockTextDocument(code, 'concat_cont.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const noXNeverAssigned = !warnings.some(w =>
            w.message.includes("'x'") && w.message.includes('never assigned')
        );
        const noYNeverAssigned = !warnings.some(w =>
            w.message.includes("'y'") && w.message.includes('never assigned')
        );
        const noZNeverAssigned = !warnings.some(w =>
            w.message.includes("'z'") && w.message.includes('never assigned')
        );

        if (noXNeverAssigned && noYNeverAssigned && noZNeverAssigned && errors.length === 0) {
            console.log('  ✓ Test 31 PASSED (continuous assign with concat lvalue correctly treated as assigned)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 31 FAILED (x: ${noXNeverAssigned}, y: ${noYNeverAssigned}, z: ${noZNeverAssigned}, errors: ${errors.length})`);
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
            errors.forEach(e => console.log(`    ERROR: Line ${e.line + 1}: ${e.message}`));
        }
    }

    // Test 32: Wire declaration with assignment - RHS signals should be treated as "used"
    {
        totalTests++;
        console.log('\nTest 32: Wire declaration with assignment - RHS expression signals treated as used');
        const code = `
module top_module (
    input wire clk,
    input wire reset,
    input wire setup,
    output wire [7:0] count_out
);
    wire [7:0] counter_value;
    wire counter_in = setup & (counter_value == 0);

    assign count_out = counter_in;
endmodule
`;
        const doc = new MockTextDocument(code, 'wire_assign_expr.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const noSetupNeverUsed = !warnings.some(w =>
            w.message.includes("'setup'") && w.message.includes('never used')
        );
        const noCounterValueNeverUsed = !warnings.some(w =>
            w.message.includes("'counter_value'") && w.message.includes('never used')
        );

        if (noSetupNeverUsed && noCounterValueNeverUsed && errors.length === 0) {
            console.log('  ✓ Test 32 PASSED (RHS signals in wire declaration assignment correctly treated as used)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 32 FAILED (setup: ${noSetupNeverUsed}, counter_value: ${noCounterValueNeverUsed}, errors: ${errors.length})`);
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
            errors.forEach(e => console.log(`    ERROR: Line ${e.line + 1}: ${e.message}`));
        }
    }

    // Test 33: Reg declaration with assignment - RHS signals should be treated as "used"
    {
        totalTests++;
        console.log('\nTest 33: Reg declaration with assignment - RHS expression signals treated as used');
        const code = `
module reg_assign (
    input wire clk,
    input wire a,
    input wire b,
    output reg out
);
    reg r = a & b;

    always @(posedge clk) begin
        out <= r;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'reg_assign_expr.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const noANeverUsed = !warnings.some(w =>
            w.message.includes("'a'") && w.message.includes('never used')
        );
        const noBNeverUsed = !warnings.some(w =>
            w.message.includes("'b'") && w.message.includes('never used')
        );

        if (noANeverUsed && noBNeverUsed && errors.length === 0) {
            console.log('  ✓ Test 33 PASSED (RHS signals in reg declaration assignment correctly treated as used)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 33 FAILED (a: ${noANeverUsed}, b: ${noBNeverUsed}, errors: ${errors.length})`);
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
            errors.forEach(e => console.log(`    ERROR: Line ${e.line + 1}: ${e.message}`));
        }
    }

    // Test 34: Named port/parameter names should NOT be flagged as undeclared
    {
        totalTests++;
        console.log('\nTest 34: Named port/parameter names not flagged as undeclared');
        const code = `
module top;
    wire clk, reset;
    wire [7:0] count_in, count_out;

    counter #(
        .WIDTH(8)
    )
    counter_i (
        .clk(clk),
        .reset(reset),
        .count_in(count_in),
        .count_out(count_out)
    );
endmodule
`;
        const doc = new MockTextDocument(code, 'named_port_no_warn.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        // Named port names (.WIDTH, .clk, .reset, .count_in, .count_out) must NOT
        // produce "referenced but not declared" warnings.
        const namedPortWarning = warnings.some(w =>
            w.message.includes('referenced but not declared') &&
            (w.message.includes("'WIDTH'") || w.message.includes("'clk'") ||
             w.message.includes("'reset'") || w.message.includes("'count_in'") ||
             w.message.includes("'count_out'"))
        );

        if (!namedPortWarning && errors.length === 0) {
            console.log('  ✓ Test 34 PASSED (no undeclared warning for named port/parameter names)');
            passedTests++;
        } else {
            console.log('  ✗ Test 34 FAILED');
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
            errors.forEach(e => console.log(`    ERROR: Line ${e.line + 1}: ${e.message}`));
        }
    }

    // Test 35: Undeclared identifiers in port connection expressions ARE warned
    {
        totalTests++;
        console.log('\nTest 35: Undeclared identifiers in port connection expressions warned');
        const code = `
module top;
    counter counter_i (
        .clk(undeclared_clk),
        .reset(undeclared_reset)
    );
endmodule
`;
        const doc = new MockTextDocument(code, 'port_expr_warn.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const hasUndeclaredClk = warnings.some(w =>
            w.message.includes("'undeclared_clk'") &&
            w.message.includes('referenced but not declared')
        );
        const hasUndeclaredReset = warnings.some(w =>
            w.message.includes("'undeclared_reset'") &&
            w.message.includes('referenced but not declared')
        );

        if (hasUndeclaredClk && hasUndeclaredReset) {
            console.log('  ✓ Test 35 PASSED (undeclared port connection expressions warned)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 35 FAILED (undeclared_clk: ${hasUndeclaredClk}, undeclared_reset: ${hasUndeclaredReset})`);
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 36: Undeclared identifiers in concatenation port expressions ARE warned
    {
        totalTests++;
        console.log('\nTest 36: Undeclared identifiers in concatenation port connection warned');
        const code = `
module top;
    wire declared_h;

    counter counter_i (
        .count_out({declared_h, undeclared_l})
    );
endmodule
`;
        const doc = new MockTextDocument(code, 'concat_port_warn.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const hasUndeclaredL = warnings.some(w =>
            w.message.includes("'undeclared_l'") &&
            w.message.includes('referenced but not declared')
        );
        const noDeclaredHWarning = !warnings.some(w =>
            w.message.includes("'declared_h'") &&
            w.message.includes('referenced but not declared')
        );

        if (hasUndeclaredL && noDeclaredHWarning) {
            console.log('  ✓ Test 36 PASSED (undeclared concat member warned, declared member not warned)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 36 FAILED (undeclared_l: ${hasUndeclaredL}, no declared_h warning: ${noDeclaredHWarning})`);
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 37: Undeclared identifier in parameter expression warned
    {
        totalTests++;
        console.log('\nTest 37: Undeclared identifier in parameter expression warned');
        const code = `
module top;
    wire [7:0] data;

    counter #(
        .WIDTH(UNDEF_PARAM)
    )
    counter_i (
        .data(data)
    );
endmodule
`;
        const doc = new MockTextDocument(code, 'param_expr_warn.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const hasUndefParam = warnings.some(w =>
            w.message.includes("'UNDEF_PARAM'") &&
            w.message.includes('referenced but not declared')
        );
        // .WIDTH itself must NOT be warned
        const noWidthWarning = !warnings.some(w =>
            w.message.includes("'WIDTH'") &&
            w.message.includes('referenced but not declared')
        );

        if (hasUndefParam && noWidthWarning) {
            console.log('  ✓ Test 37 PASSED (undeclared param expression warned, param name not warned)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 37 FAILED (UNDEF_PARAM warned: ${hasUndefParam}, no WIDTH warning: ${noWidthWarning})`);
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 38: Ordered (positional) port connection identifiers checked for undeclared
    {
        totalTests++;
        console.log('\nTest 38: Ordered port connection undeclared identifiers warned');
        const code = `
module top;
    wire clk;

    counter counter_i (clk, undeclared_sig);
endmodule
`;
        const doc = new MockTextDocument(code, 'ordered_port_warn.v');
        const { errors, warnings } = parser.parseSymbols(doc);

        const hasUndeclaredSig = warnings.some(w =>
            w.message.includes("'undeclared_sig'") &&
            w.message.includes('referenced but not declared')
        );
        const noClkWarning = !warnings.some(w =>
            w.message.includes("'clk'") &&
            w.message.includes('referenced but not declared')
        );

        if (hasUndeclaredSig && noClkWarning) {
            console.log('  ✓ Test 38 PASSED (undeclared ordered port expr warned, declared not warned)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 38 FAILED (undeclared_sig: ${hasUndeclaredSig}, no clk warning: ${noClkWarning})`);
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 39: Missing port in named port connection warns
    {
        totalTests++;
        console.log('\nTest 39: Missing port in named port connection warns');

        const counterModule = {
            name: 'counter',
            uri: 'counter.v',
            line: 0,
            character: 0,
            ports: [
                { name: 'clk', direction: 'input', type: 'wire' },
                { name: 'reset', direction: 'input', type: 'wire' },
                { name: 'count_in', direction: 'input', type: 'wire' },
                { name: 'count_out', direction: 'output', type: 'reg' }
            ]
        };
        const mockDb = new MockModuleDatabase([counterModule]);

        const code = `
module test_instance (
    input clk,
    input reset,
    output reg[7:0] count_out
);

reg[3:0] init_h, init_l;
wire[3:0] count_h, count_l;

always @(posedge clk) begin
    {init_h,init_l} <= 8'h45;
    count_out <= {count_h, count_l};
end

counter #(.WIDTH(8))
counter_i_1 (
    .clk(clk),
    .reset(reset),
    .count_in({init_h, init_l}),
    .count_out({count_h, count_l})
);

counter #(.WIDTH(8))
counter_i_2 (
    .clk(clk),
    .reset(),
    .count_in({init_l, init_h})
);

endmodule
`;
        const doc = new MockTextDocument(code, 'test_instance.v');
        const { warnings, instances } = parser.parseSymbols(doc, mockDb);

        // counter_i_1 has all 4 ports → no missing port warning
        const ci1 = instances.find(i => i.instanceName === 'counter_i_1');
        const ci1MissingWarn = warnings.some(w =>
            w.message.includes('unconnected') && ci1 && w.line === ci1.line
        );

        // counter_i_2 misses count_out → warning expected
        const ci2MissingWarn = warnings.some(w =>
            w.message.includes("'count_out' unconnected")
        );

        if (!ci1MissingWarn && ci2MissingWarn) {
            console.log('  ✓ Test 39 PASSED (counter_i_2 missing count_out warned, counter_i_1 not warned)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 39 FAILED (ci1MissingWarn: ${ci1MissingWarn}, ci2MissingWarn: ${ci2MissingWarn})`);
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 40: Multiple missing ports produce multi-line warning
    {
        totalTests++;
        console.log('\nTest 40: Multiple missing ports produce multi-line warning');

        const extModule = {
            name: 'ext_mod',
            uri: 'ext.v',
            line: 0,
            character: 0,
            ports: [
                { name: 'clk', direction: 'input', type: 'wire' },
                { name: 'data_in', direction: 'input', type: 'wire' },
                { name: 'data_out', direction: 'output', type: 'wire' },
                { name: 'status', direction: 'output', type: 'wire' }
            ]
        };
        const mockDb = new MockModuleDatabase([extModule]);

        const code = `
module top (input clk);
    ext_mod u1 (
        .clk(clk)
    );
endmodule
`;
        const doc = new MockTextDocument(code, 'multi_missing.v');
        const { warnings } = parser.parseSymbols(doc, mockDb);

        const missingWarn = warnings.find(w => w.message.includes('unconnected'));
        const hasDataIn = missingWarn && missingWarn.message.includes("'data_in' unconnected");
        const hasDataOut = missingWarn && missingWarn.message.includes("'data_out' unconnected");
        const hasStatus = missingWarn && missingWarn.message.includes("'status' unconnected");
        const isMultiLine = missingWarn && missingWarn.message.includes('\n');

        if (hasDataIn && hasDataOut && hasStatus && isMultiLine) {
            console.log('  ✓ Test 40 PASSED (multiple missing ports in multi-line warning)');
            passedTests++;
        } else {
            console.log(`  ✗ Test 40 FAILED (dataIn: ${hasDataIn}, dataOut: ${hasDataOut}, status: ${hasStatus}, multiLine: ${isMultiLine})`);
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 41: Empty named port (.reset()) does not trigger missing port warning
    {
        totalTests++;
        console.log('\nTest 41: Empty named port does not trigger missing port warning');

        const extModule = {
            name: 'ext_mod',
            uri: 'ext.v',
            line: 0,
            character: 0,
            ports: [
                { name: 'clk', direction: 'input', type: 'wire' },
                { name: 'reset', direction: 'input', type: 'wire' }
            ]
        };
        const mockDb = new MockModuleDatabase([extModule]);

        const code = `
module top (input clk);
    ext_mod u1 (
        .clk(clk),
        .reset()
    );
endmodule
`;
        const doc = new MockTextDocument(code, 'empty_port.v');
        const { warnings } = parser.parseSymbols(doc, mockDb);

        const hasMissingWarn = warnings.some(w => w.message.includes('unconnected'));

        if (!hasMissingWarn) {
            console.log('  ✓ Test 41 PASSED (empty named port .reset() does not trigger missing warning)');
            passedTests++;
        } else {
            console.log('  ✗ Test 41 FAILED (unexpected missing port warning)');
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 42: Module name not defined in module database warns
    {
        totalTests++;
        console.log('\nTest 42: Module name not defined in module database warns');

        const mockDb = new MockModuleDatabase([]);

        const code = `
module top (input clk);
    wire q;
    unknown_module u1 (.clk(clk), .q(q));
endmodule
`;
        const doc = new MockTextDocument(code, 'undef_module.v');
        const { warnings } = parser.parseSymbols(doc, mockDb);

        const hasUndefWarn = warnings.some(w =>
            w.message.includes("'unknown_module'") && w.message.includes('not defined')
        );

        if (hasUndefWarn) {
            console.log('  ✓ Test 42 PASSED (unknown module warned as not defined)');
            passedTests++;
        } else {
            console.log('  ✗ Test 42 FAILED (expected "not defined" warning)');
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 43: Module defined locally does not trigger "not defined" warning
    {
        totalTests++;
        console.log('\nTest 43: Locally defined module does not trigger "not defined" warning');

        const mockDb = new MockModuleDatabase([]);

        const code = `
module sub_mod (input clk, output reg q);
    always @(posedge clk) q <= ~q;
endmodule

module top (input clk);
    wire q;
    sub_mod u1 (.clk(clk), .q(q));
endmodule
`;
        const doc = new MockTextDocument(code, 'local_module.v');
        const { warnings } = parser.parseSymbols(doc, mockDb);

        const hasUndefWarn = warnings.some(w =>
            w.message.includes("'sub_mod'") && w.message.includes('not defined')
        );

        if (!hasUndefWarn) {
            console.log('  ✓ Test 43 PASSED (locally defined module not warned)');
            passedTests++;
        } else {
            console.log('  ✗ Test 43 FAILED (unexpected "not defined" warning for local module)');
            warnings.forEach(w => console.log(`    WARNING: Line ${w.line + 1}: ${w.message}`));
        }
    }

    // Test 44: No "not defined" warning without moduleDatabase (single-file mode)
    {
        totalTests++;
        console.log('\nTest 44: No "not defined" warning without moduleDatabase');

        const code = `
module top (input clk);
    wire q;
    ext_mod u1 (.clk(clk), .q(q));
endmodule
`;
        const doc = new MockTextDocument(code, 'no_db.v');
        const { warnings } = parser.parseSymbols(doc);

        const hasUndefWarn = warnings.some(w =>
            w.message.includes('not defined')
        );

        if (!hasUndefWarn) {
            console.log('  ✓ Test 44 PASSED (no "not defined" without moduleDatabase)');
            passedTests++;
        } else {
            console.log('  ✗ Test 44 FAILED (unexpected "not defined" warning without database)');
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
