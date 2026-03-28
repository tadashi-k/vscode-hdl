// Test file for always and initial block syntax checking

// VALID EXAMPLES

// Valid always block with posedge
module valid_always_posedge (
    input wire clk,
    output reg q
);
    always @(posedge clk) begin
        q <= 1'b1;
    end
endmodule

// Valid always block with @*
module valid_always_star (
    input wire a, b,
    output reg c
);
    always @* begin
        c = a & b;
    end
endmodule

// Valid always block with @(*)
module valid_always_star_paren (
    input wire a, b,
    output reg c
);
    always @(*) begin
        c = a & b;
    end
endmodule

// Valid always block with single statement (no begin/end required)
module valid_always_single (
    input wire clk,
    output reg q
);
    always @(posedge clk)
        q <= 1'b0;
endmodule

// Valid initial block
module valid_initial (
    output reg [7:0] data
);
    initial begin
        data = 8'h00;
    end
endmodule

// Valid initial with single statement
module valid_initial_single (
    output reg flag
);
    initial
        flag = 1'b0;
endmodule

// INVALID EXAMPLES - ALWAYS BLOCKS

// Error: Always without timing control (@)
module error_always_no_timing (
    input wire clk,
    output reg q
);
    always begin  // ERROR: missing @ timing control
        q <= 1'b1;
    end
endmodule

// Error: Always without statement
module error_always_no_statement (
    input wire clk
);
    always @(posedge clk)  // ERROR: missing statement
endmodule

// Error: Unmatched begin/end in always block
module error_always_unmatched_begin (
    input wire clk,
    output reg q
);
    always @(posedge clk) begin
        q <= 1'b1;
        // ERROR: missing end
endmodule

// Error: Always with just 'end' without 'begin'
module error_always_end_without_begin (
    input wire clk,
    output reg q
);
    always @(posedge clk)
        q <= 1'b1;
    end  // ERROR: end without begin
endmodule

// INVALID EXAMPLES - INITIAL BLOCKS

// Error: Initial with @ sensitivity list
module error_initial_with_sensitivity (
    output reg q
);
    initial @(posedge clk) begin  // ERROR: initial blocks cannot have @ sensitivity
        q = 1'b1;
    end
endmodule

// Error: Initial without statement
module error_initial_no_statement (
    output reg q
);
    initial  // ERROR: missing statement
endmodule

// Error: Unmatched begin/end in initial block
module error_initial_unmatched_begin (
    output reg [7:0] data
);
    initial begin
        data = 8'h00;
        // ERROR: missing end
endmodule

// Error: Initial with just 'end' without 'begin'
module error_initial_end_without_begin (
    output reg q
);
    initial
        q = 1'b0;
    end  // ERROR: end without begin
endmodule
