/**
 * Example usage of the generated Verilog parser
 * 
 * This demonstrates how to use the ANTLR-generated parser
 * to parse Verilog source code.
 */

const antlr4 = require('antlr4');
const VerilogLexer = require('./generated/VerilogLexer.js').VerilogLexer;
const VerilogParser = require('./generated/VerilogParser.js').VerilogParser;

// Sample Verilog code
const verilogCode = `
module counter(
    input wire clk,
    input wire reset,
    output reg [7:0] count
);

always @(posedge clk or posedge reset) begin
    if (reset)
        count <= 8'b0;
    else
        count <= count + 1;
end

endmodule
`;

function parseVerilog(code) {
    // Create the lexer and parser
    const chars = new antlr4.InputStream(code, true);
    const lexer = new VerilogLexer(chars);
    const tokens = new antlr4.CommonTokenStream(lexer);
    const parser = new VerilogParser(tokens);
    
    // Build the parse tree
    parser.buildParseTrees = true;
    
    // Parse the source text
    const tree = parser.source_text();
    
    return {
        tree: tree,
        parser: parser,
        tokens: tokens
    };
}

// Parse the Verilog code
console.log('Parsing Verilog code...\n');
console.log('Input:');
console.log(verilogCode);

try {
    const result = parseVerilog(verilogCode);
    console.log('\n✓ Parsing successful!');
    console.log(`Parse tree: ${result.tree.toStringTree(result.parser.ruleNames)}`);
} catch (error) {
    console.error('\n✗ Parsing failed:');
    console.error(error.message);
}
