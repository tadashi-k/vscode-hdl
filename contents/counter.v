// Counter module definition   
module counter #(
    parameter WIDTH = 8
)
(
    input clk,
    input reset,
    input[WIDTH-1:0] count_in,
    output reg [WIDTH-1:0] count_out
);

localparam MAX_COUNT = (1 << WIDTH) - 1;

wire enable = (count_out == MAX_COUNT) ? 0 : 1;
reg [WIDTH-1:0] internal_count;
reg a, b;
integer cnt;

always @(posedge clk or posedge reset) begin
    if (reset) begin
        count_out <= 0;
    end else if (enable) begin
        count_out <= count_in;
    end else begin
        count_out <= count_out + 1;
    end

    if (a && b) begin
        internal_count <= 0;
    end else begin
        internal_count <= internal_count + 4'd1;
    end
    {a,b} <= internal_count[1:0];
end

endmodule
