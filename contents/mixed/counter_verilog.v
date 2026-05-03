// Verilog Counter Module
// Simple N-bit binary counter with synchronous reset and enable

module counter_verilog #(
    parameter WIDTH = 8
) (
    input wire clk,
    input wire rst_n,
    input wire enable,
    input wire [WIDTH-1:0] load_value,
    input wire load,
    output reg [WIDTH-1:0] count
);

    always @(posedge clk) begin
        if (!rst_n) begin
            count <= {WIDTH{1'b0}};
        end else if (load) begin
            count <= load_value;
        end else if (enable) begin
            count <= count + 1'b1;
        end
    end

endmodule
