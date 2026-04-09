module test_instance (
    input clk,
    input reset,
    output reg[7:0] count_out
);

reg[4:0] addr;
reg[3:0] init_h, init_l;
wire[3:0] count_h, count_l;
reg[3:0] addr_next;
wire[3:0] addr_next_wire;

always @(posedge clk) begin
    {init_h,init_l} <= 8'h45;

    count_out <= {count_h, count_l};

    addr <= addr + 1;
    addr_next <= addr[0+:4] + 1;
end

assign addr_next_wire[3] = addr_next[0];
assign addr_next_wire[2:1] = addr_next[2:1];

ram #(
    .DEPTH(16),
    .WIDTH(8)
) ram_i_1 (
    .clk(clk),
    .we(1'b0),
    .re(1'b0),
    .addr(addr), // need warning 4-bit address for 16-depth RAM
    .data_in({init_h, init_l}),
    .data_out({count_h, count_l})
);

ram #(
    .DEPTH(32),
    .WIDTH(8)
) ram_i_2 (
    .clk(clk),
    .re(1'b0),
    .addr(addr[0+:5]), // no need warning 5-bit address for 32-depth RAM
    .data_in({init_h, init_l}),
    .data_out({count_h, count_l})
);


ram #(
    .DEPTH(32),
    .WIDTH(8)
) ram_i_3 (
    .clk(clk),
    .re(addr[0]), // should not show warning for addr[0] as it's 1 bit
    .we(addr[1]), // should not show warning for addr[0] as it's 1 bit
    .addr(reset), // should show 'reset' has width 1
    .data_in({init_h, init_l}),
    .data_out({count_h, count_l})
);

ram #(
    .DEPTH(8),
    .WIDTH(8)
) ram_i_4 (
    .clk(clk),
    .re(1'b0),
    .we(1'b1),
    .addr(addr[2:0]),
    .data_in({init_h, init_l[3:0]}),
    .data_out({count_h, count_l})
);

endmodule

module ram #(
    parameter DEPTH = 32,
    parameter WIDTH = 8,
    parameter ADR_WIDTH = (DEPTH == 16) ? 4 : (DEPTH == 32) ? 5 : (DEPTH == 64) ? 6 : 0
)
(
    input clk,
    input[ADR_WIDTH-1:0] addr,
    input [WIDTH-1:0] data_in,
    input we,
    input re,
    output reg [WIDTH-1:0] data_out
);

reg[WIDTH-1:0] mem[0:DEPTH-1];

always @(posedge clk) begin
    if (we) begin
        mem[addr] <= data_in;
    end else if (re) begin
        data_out <= mem[addr];
    end
end

endmodule
