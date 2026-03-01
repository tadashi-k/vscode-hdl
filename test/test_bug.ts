#!/usr/bin/env node

const vscode = {
    DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3
    }
};

class MockTextDocument {
    text: any;
    uri: any;
    languageId: any;
    constructor(text: string, uri: string) {
        this.text = text;
        this.uri = { toString: () => uri };
        this.languageId = 'verilog';
    }
    getText() { return this.text; }
}

(global as any).vscode = vscode;
const AntlrVerilogParser = require('../src/antlr-parser');

const parser = new AntlrVerilogParser();

// Reproduce the bug: two instances of counter in same file
// u_counter uses default WIDTH=8, u_counter_16 uses WIDTH=16
const code = `
module counter #(
    parameter WIDTH = 8
)
(
    input clk,
    input reset,
    input[WIDTH-1:0] count_in,
    output reg [WIDTH-1:0] count_out
);
    localparam MAX_COUNT = (1 << WIDTH) - 1;
    always @(posedge clk or posedge reset) begin
        if (reset) begin
            count_out <= 0;
        end else begin
            count_out <= count_in;
        end
    end
endmodule

module test_bitwidth(
    input wire clk,
    input wire reset,
    input wire [7:0] data_in,
    output wire valid,
    output reg [7:0] data_out
);
    reg [15:0] counter_int;
    wire [15:0] counter_out_16;

    // u_counter uses default WIDTH=8, count_in should be [7:0]
    counter u_counter (
        .clk(clk),
        .reset(reset),
        .count_in(counter_int),  // counter_int is [15:0], count_in is [7:0] -> SHOULD WARN
        .count_out()
    );

    // u_counter_16 uses WIDTH=16, count_in should be [15:0]
    counter #(
        .WIDTH(16)
    ) u_counter_16 (
        .clk(clk),
        .reset(reset),
        .count_in(counter_int),  // counter_int is [15:0], count_in is [15:0] -> NO WARNING
        .count_out(counter_out_16)
    );
endmodule
`;

const doc = new MockTextDocument(code, 'test_bug.v');
const { warnings, instances } = parser.parseSymbols(doc);

console.log('Instances:');
for (const inst of instances) {
    console.log(`  ${inst.instanceName}: parameterOverrides = ${JSON.stringify(inst.parameterOverrides)}`);
}

console.log('\nWarnings:');
for (const w of warnings) {
    console.log(`  Line ${w.line + 1}: ${w.message}`);
}

const countInWarningForUCounter = warnings.find(w =>
    w.message && w.message.includes("Port 'count_in'") && w.line >= 28 && w.line <= 35
);
const countInWarningForUCounter16 = warnings.find(w =>
    w.message && w.message.includes("Port 'count_in'") && w.line >= 38 && w.line <= 45
);

console.log('\nResults:');
console.log(`u_counter count_in should WARN (16-bit signal -> 8-bit port): ${countInWarningForUCounter ? 'YES (correct)' : 'NO (BUG!)'}`);
console.log(`u_counter_16 count_in should NOT WARN (16-bit -> 16-bit): ${!countInWarningForUCounter16 ? 'YES (correct)' : 'NO (BUG!)'}`);
