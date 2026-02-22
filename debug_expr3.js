const vscode = { DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 } };
global.vscode = vscode;
const antlr4 = require('antlr4');
const VerilogLexer = require('./antlr/generated/VerilogLexer.js').VerilogLexer;
const VerilogParser = require('./antlr/generated/VerilogParser.js').VerilogParser;
const AntlrVerilogParser = require('./src/antlr-parser');

// Patch to add debugging
const parser = new AntlrVerilogParser();
const visitor = parser._createVisitor ? parser._createVisitor('test') : null;

// Let's directly test by creating a parameter with the problematic expression
const code = `
module test_module (input wire clk);
    parameter WIDTH = 8;
    localparam MAX_COUNT = (1 << WIDTH) - 1;
    localparam SIMPLE = WIDTH - 1;
    localparam DOUBLE_SHIFT = (1 << WIDTH);
endmodule
`;

class MockDoc {
    constructor(text, uri) { this.text = text; this.uri = { toString: () => uri }; this.languageId = 'verilog'; }
    getText() { return this.text; }
}

const result = parser.parseSymbols(new MockDoc(code, 'test.v'));
console.log('Parameters:', JSON.stringify(result.parameters, null, 2));
