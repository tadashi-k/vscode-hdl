// Counter module definition   
module counter (
    input wire clk,
    input wire reset,
    output reg [7:0] count
);

    wire enable;
    reg [7:0] internal_count;

    always @(posedge clk or posedge reset) begin
        if (reset) begin
            count <= 8'b0;
        end else begin
            count <= count + 1;
        end
    end

	full_adder full_adder_i(
		.a(),
		.b(),
		.cin(),
		.sum(),
		.cout()
	);

endmodule
