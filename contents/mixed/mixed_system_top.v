// Top Level Mixed Verilog/VHDL System
// Demonstrates instantiation of both Verilog and VHDL modules

module mixed_system_top #(
    parameter DATA_WIDTH = 8
) (
    input wire clk,
    input wire rst_n,
    input wire enable,
    input wire [DATA_WIDTH-1:0] data_a,
    input wire [DATA_WIDTH-1:0] data_b,
    input wire [2:0] sel,
    output wire [DATA_WIDTH-1:0] result,
    output wire carry_out,
    output wire [7:0] one_hot_select
);

    wire [DATA_WIDTH-1:0] mux_out;
    wire [DATA_WIDTH-1:0] decoder_out;
    
    // Instantiate Verilog decoder
    decoder_verilog #(
        .INPUT_WIDTH(3),
        .OUTPUT_WIDTH(8)
    ) u_decoder (
        .addr(sel),
        .enable(enable),
        .one_hot(one_hot_select)
    );
    
    // Instantiate VHDL multiplexer
    mux_vhdl #(
        .WIDTH(DATA_WIDTH),
        .INPUTS(4)
    ) u_mux (
        .data_in({data_a, data_b, data_a ^ data_b, data_a & data_b}),
        .addr(sel[1:0]),
        .data_out(mux_out)
    );
    
    assign result = mux_out;
    assign carry_out = mux_out[DATA_WIDTH-1];
    
endmodule
