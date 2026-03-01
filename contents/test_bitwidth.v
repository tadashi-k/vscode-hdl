module test_bitwidth(
    input wire clk,
    input wire reset,
    input wire [7:0] data_in,
    output wire valid,
    output reg [7:0] data_out
);

reg [15:0] counter_int;

always @(posedge clk) begin
    if (reset) begin
        data_out <= {8'b0,valid}; // need to warn bit width mismatch: from 9 bits to 8 bits
    end else if (valid) begin
        data_out <= valid; // need to warn bit width mismatch: from 1 bit to 8 bits
    end else begin
        data_out <= data_in + 8'b0;
    end

    // need to warn bit width mismatch: from 3 bits to 1 bit
    // because expression of conditional_statement and loop_statement should have 1 bit width
    if (data_out[2:0]) begin
        counter_int[9:0] <= {data_in, data_out}; // need to warn bit width mismatch: from 16 bits to 10 bits
    end
end

assign valid = data_in[0]; // should not warn because both bits are 1 bit

counter u_counter (
    .clk(clk),
    .reset(reset),
    .count_in(counter_int), // need to warn bit width mismatch: from 16 bits to 8 bits because counter module's count_in has 8 bits width
    .count_out()
);

wire [15:0] counter_out_16;

counter #(
    .WIDTH(16)
) u_counter_16 (
    .clk(clk),
    .reset(reset),
    .count_in(counter_int), // should not warn because counter module's count_in has 16 bits width
    .count_out(counter_out_16)
);

endmodule
