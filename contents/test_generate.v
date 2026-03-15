module test_generate(
    input clk,
    input reset,
    output[7:0] count_out
);

genvar i;

generate
    for (i = 0; i < 4; i = i + 1) begin : gen_block
        reg[7:0] count;
        always @(posedge clk) begin
            if (reset) begin
                count <= 8'h00 + i; // need no warning because i is defined as genvar
            end else begin
                count <= count + 1 + j; // need warning because j is not defined
            end
        end
        assign count_out[i*2 +: 2] = count[1:0];
    end
endgenerate

endmodule
