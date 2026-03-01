// Top module that instantiates counter
module top_module (
    input wire clk,
    input wire reset,
    input wire setup,
    output wire [7:0] count_out,
    output wire valid
);

    wire[7:0] counter_value;
    reg ready;
    wire[7:0] counter_in = setup & (counter_value == 0); // should show bit width mismatch: from 8 bits to 1 bit

    // Instantiate counter module - goto definition should work on "counter"
    counter u_counter (
        .clk(clk),
        .reset(reset),
        .count_in(counter_in),
        .count_out(counter_value)
    );

    // Signal usage - goto definition should work on these signals
    assign count_out = counter_value;
    assign valid = ready;

    always @(posedge clk) begin
        ready <= 1'b1;
    end

    test_parameter #(
        .DEPTH(16),
        .WIDTH(8)
    ) u_test_parameter (
        .clk(clk),
        .reset(reset),
        .addr(counter_value[4:0]), // should show bit width mismatch: from 5 bits to 4 bits
        .data_in(counter_value),
        .we(setup),
        .re(setup),
        .data_out()
    );

endmodule
