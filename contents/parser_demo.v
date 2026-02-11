// Example Verilog file demonstrating the parser's error detection capabilities
// This file intentionally contains various syntax errors that the parser will detect

// Example 1: Valid module (no errors)
module counter_valid (
    input wire clk,
    input wire reset,
    output reg [7:0] count
);
    always @(posedge clk or posedge reset) begin
        if (reset)
            count <= 8'b0;
        else
            count <= count + 1;
    end
endmodule

// Example 2: Missing endmodule
module missing_end (
    input wire clk,
    output wire out
);
    assign out = clk;
// ERROR: Missing endmodule statement

// Example 3: Reserved keyword as module name  
module always (  // ERROR: 'always' is a reserved keyword
    input a
);
endmodule

// Example 4: Unmatched brackets
module bracket_error (
    input wire [7:0] data
);
    wire result;
    assign result = (data[0] & data[1];  // ERROR: Missing closing parenthesis
endmodule

// Example 5: Missing semicolon
module semicolon_error (
    input wire clk,
    output wire out
);
    wire temp  // ERROR: Missing semicolon
    assign out = temp;
endmodule

// Example 6: Invalid assign statement
module assign_error (
    input wire a,
    output wire b
);
    assign b  // ERROR: Missing = operator and semicolon
endmodule

// Example 7: Duplicate declarations
module duplicate_error (
    input wire clk
);
    wire signal;
    wire signal;  // WARNING: Duplicate declaration of 'signal'
endmodule

// This demonstration file shows how the parser detects various syntax errors
// and displays them with squiggly underlines and detailed error messages
