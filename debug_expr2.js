const vscode = { DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 } };
global.vscode = vscode;
const antlr4 = require('antlr4');
const VerilogLexer = require('./antlr/generated/VerilogLexer.js').VerilogLexer;
const VerilogParser = require('./antlr/generated/VerilogParser.js').VerilogParser;

function parseConstExpr(code) {
    const chars = new antlr4.InputStream(code, true);
    const lexer = new VerilogLexer(chars);
    const tokens = new antlr4.CommonTokenStream(lexer);
    const parser = new VerilogParser(tokens);
    parser.buildParseTrees = true;
    return parser.constant_expression();
}

const ce = parseConstExpr('(1 << WIDTH) - 1');
const expr = ce.expression();
console.log('Top expr primary():', expr.primary ? expr.primary() : 'no method');
console.log('Top expr primary() result:', expr.primary() ? expr.primary().toStringTree(null, true) : 'null');
console.log('Top expr binary_operator():', expr.binary_operator ? expr.binary_operator() : 'no method');
console.log('Top expr binary_operator() text:', expr.binary_operator() ? expr.binary_operator().getText() : 'null');

const exprs = expr.expression();
console.log('Sub-exprs:', Array.isArray(exprs) ? exprs.length : (exprs ? 1 : 0));

// Left sub-expression
const left = Array.isArray(exprs) ? exprs[0] : exprs;
console.log('Left:', left ? left.toStringTree(null, true) : 'null');
console.log('Left.primary():', left && left.primary ? (left.primary() ? left.primary().toStringTree(null, true) : 'null') : 'no method');
console.log('Left.primary() innerExpr:', left && left.primary && left.primary() && left.primary().expression ? (left.primary().expression() ? 'has inner expr' : 'no inner expr') : 'N/A');
