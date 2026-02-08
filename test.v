// Sample Verilog module for testing syntax highlighting
module counter (
    input wire clk,
    input wire reset,
    output reg [7:0] count
);

    // Counter logic
    always @(posedge clk or posedge reset) begin
        if (reset) begin
            count <= 8'b0;
        end else begin
            count <= count + 1;
        end
    end

endmodule

// Full adder example
module full_adder (
    input wire a,
    input wire b,
    input wire cin,
    output wire sum,
    output wire cout
);

    // Sum and carry logic
    assign sum = a ^ b ^ cin;
    assign cout = (a & b) | (b & cin) | (a & cin);

endmodule

// D Flip-Flop
module dff (
    input wire clk,
    input wire d,
    output reg q
);

    always @(posedge clk) begin
        q <= d;
    end

endmodule
