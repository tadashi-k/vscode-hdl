module test_bitwidth(
    input wire clk,
    input wire reset,
    input wire [7:0] data_in,
    output wire valid,
    output reg [7:0] data_out
);

reg [15:0] counter;

always @(posedge clk) begin
    if (reset) begin
        data_out <= {8'b0,valid}; // need to warn bit width mismatch: from 9 bits to 8 bits
    end else if (valid) begin
        data_out <= valid; // need to warn bit width mismatch: from 1 bit to 8 bits
    end else begin
        data_out <= data_in + 8'b0;
    end

    counter[9:0] <= {data_in, data_out}; // need to warn bit width mismatch: from 16 bits to 10 bits
end

assign valid = data_in[0]; // should not warn because both bits are 1 bit

endmodule
