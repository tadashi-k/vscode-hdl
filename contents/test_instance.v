module test_instance (
    input clk,
    input reset,
    output reg[7:0] count_out
);

reg[3:0] init_h, init_l;
wire[3:0] count_h, count_l;

always @(posedge clk) begin
    {init_h,init_l} <= 8'h45;

    count_out <= {count_h, count_l};
end

counter #(
    .WIDTH(8)
)
counter_i (
    .clk(clk),
    .reset(reset),
    .count_in({init_h, init_l}),
    .count_out({count_h, count_l})
);

endmodule
