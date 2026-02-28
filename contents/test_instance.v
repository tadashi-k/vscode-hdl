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
counter_i_1 (
    .clk(clk),
    .reset(reset),
    .count_in({init_h, init_l}),
    .count_out({count_h, count_l})
);

// need .count_out otherwise show warning at counter_i_2
// .reset() is OK because it means unconnected port obviously
counter #(
    .WIDTH(8)
)
counter_i_2 (
    .clk(clk),
    .reset(),
    .count_in({init_l, init_h})
);

endmodule
