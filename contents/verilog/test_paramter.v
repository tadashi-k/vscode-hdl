
module test_parameter #(
    parameter DEPTH = 32,
    parameter WIDTH = 8,
    parameter ADR_WIDTH = (DEPTH == 16) ? 4 : (DEPTH == 32) ? 5 : (DEPTH == 64) ? 6 : 0
)
(
    input clk,
    input reset,
    input[ADR_WIDTH-1:0] addr,
    input [WIDTH-1:0] data_in,
    input we,
    input re,
    output reg [WIDTH-1:0] data_out
);

reg[WIDTH-1:0] mem[0:DEPTH-1];

always @(posedge clk) begin
    if (reset) begin
        data_out <= 0;
    end else if (we) begin
        mem[addr] <= data_in;
    end else if (re) begin
        data_out <= mem[addr];
    end
end

endmodule


