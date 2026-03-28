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
