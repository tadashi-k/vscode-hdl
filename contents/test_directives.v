// Verilog file with compile directives for testing
`timescale 1ns / 1ps

`define BUS_WIDTH 8
`define CLK_PERIOD 10

`include "defines.vh"

module test_directives (
    input wire clk,
    input wire reset,
    input wire [`BUS_WIDTH-1:0] data_in,
    output reg [`BUS_WIDTH-1:0] data_out
);

    reg[`ADDR_WIDTH-1:0] addr;

    always @(posedge clk) begin
        if (reset)
            data_out <= 0;
        else
            data_out <= data_in;

        if (reset)
            addr <= data_in[`ADDR_WIDTH-1:0];
        else
            addr <= addr + 1;
        
    end

endmodule
