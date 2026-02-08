// Top module that instantiates counter
module top_module (
    input wire clk,
    input wire reset,
    output wire [7:0] count_out,
    output wire valid
);

    wire [7:0] counter_value;
    reg ready;

    // Instantiate counter module - goto definition should work on "counter"
    counter u_counter (
        .clk(clk),
        .reset(reset),
        .count(counter_value)
    );

    // Signal usage - goto definition should work on these signals
    assign count_out = counter_value;
    assign valid = ready;

    always @(posedge clk) begin
        ready <= 1'b1;
    end

endmodule
