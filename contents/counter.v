// Counter module definition   
module counter (
    input wire clk,
    input wire reset,
    output reg [7:0] count
);

parameter WIDTH = 8;
localparam MAX_COUNT = (1 << WIDTH) - 1;

    wire enable;
    reg [WIDTH-1:0] internal_count;

    always @(posedge clk or posedge reset) begin
        if (reset && !enable) begin
            count <= 8'b0;
        end else begin
            count <= count + 1;
        end
        internal_count <= internal_count + 4'd1;
    end

    full_adder full_adder_i(
        .a(),
        .b(),
        .cin(),
        .sum(),
        .cout(enable)
    );

endmodule
