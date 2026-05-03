// Verilog Priority Decoder Module
// Converts binary input to one-hot output

module decoder_verilog #(
    parameter INPUT_WIDTH = 3,
    parameter OUTPUT_WIDTH = 8
) (
    input wire [INPUT_WIDTH-1:0] addr,
    input wire enable,
    output wire [OUTPUT_WIDTH-1:0] one_hot
);

    assign one_hot = enable ? (1'b1 << addr) : {OUTPUT_WIDTH{1'b0}};

endmodule
