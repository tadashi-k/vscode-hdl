module test_ram #(
    parameter DATA_WIDTH = 8,
    parameter ADR_WIDTH = 4
)
(
    input clk,
    input we,
    input [ADR_WIDTH-1:0] addr,
    input [DATA_WIDTH-1:0] data_in,
    output reg [DATA_WIDTH-1:0] data_out
);

localparam RAM_SIZE = 1 << ADR_WIDTH;

reg[DATA_WIDTH-1:0] ram[0:RAM_SIZE-1];
reg[3:0] internal_rd;

integer cnt;
initial begin
    for(cnt = 0; cnt < RAM_SIZE; cnt = cnt + 1) begin
	    ram[cnt] <= 0;
	end
end

always @(posedge clk) begin
    if (we) begin
        ram[addr] <= data_in;
    end else begin
        data_out <= ram[addr];
    end

    internal_rd <= ram[addr][3:0];
end

endmodule

