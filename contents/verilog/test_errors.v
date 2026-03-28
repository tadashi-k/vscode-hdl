// Test file with intentional syntax errors

// Error: Missing endmodule
module test_missing_endmodule (
    input wire clk,
    output wire out
);
    assign out = clk;
// Missing endmodule here

// Error: Module name is a reserved keyword
module wire (
    input a
);
endmodule

// Error: Unmatched brackets
module bracket_test (
    input wire [7:0] data
);
    wire result;
    assign result = (data[0] & data[1];  // Missing closing paren
endmodule

// Error: Missing semicolon
module semicolon_test (
    input wire a,
    output wire b
);
    wire temp  // Missing semicolon
    assign b = a;
endmodule

// Error: Assign without operator
module assign_test (
    input wire a,
    output wire b
);
    assign b  // Missing = operator
endmodule

// Valid module for comparison
module valid_module (
    input wire clk,
    input wire [7:0] data_in,
    output reg [7:0] data_out
);
    always @(posedge clk) begin
        data_out <= data_in;
    end
endmodule
