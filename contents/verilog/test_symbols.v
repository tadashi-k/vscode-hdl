// Test file for symbol extraction
module test_module (
    input wire clk,
    input wire reset,
    input wire [7:0] data_in,
    output wire valid,
    output reg [7:0] data_out
);

    // Wire declarations
    wire enable;
    wire [3:0] addr;
    wire int_signal, ext_signal;
    
    // Reg declarations
    reg [15:0] counter;
    reg flag1, flag2, flag3;
    reg state;

    // Internal logic
    always @(posedge clk) begin
        if (reset) begin
            counter <= 16'b0;
            state <= 1'b0;
        end else begin
            counter <= counter + 1;
        end
    end

endmodule

// Another module for testing
module simple_module (
    input wire a,
    output wire b
);

    wire internal_wire;
    reg internal_reg;

    assign b = a;

endmodule
