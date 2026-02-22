const vscode = { DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 } };
global.vscode = vscode;
const antlr4 = require('antlr4');
const VerilogLexer = require('./antlr/generated/VerilogLexer.js').VerilogLexer;
const VerilogParser = require('./antlr/generated/VerilogParser.js').VerilogParser;

function parseExpr(code) {
    const chars = new antlr4.InputStream(code, true);
    const lexer = new VerilogLexer(chars);
    const tokens = new antlr4.CommonTokenStream(lexer);
    const parser = new VerilogParser(tokens);
    parser.buildParseTrees = true;
    return parser.expression();
}

const tree = parseExpr('(1 << WIDTH) - 1');
console.log('Tree:', tree.toStringTree(null, true));
console.log('Has primary:', typeof tree.primary);
console.log('Has binary_operator:', typeof tree.binary_operator);

// Let's check the constant_expression
const charsSrc = new antlr4.InputStream('(1 << WIDTH) - 1', true);
const lexerSrc = new VerilogLexer(charsSrc);
const tokensSrc = new antlr4.CommonTokenStream(lexerSrc);
const parserSrc = new VerilogParser(tokensSrc);
parserSrc.buildParseTrees = true;
const ceTree = parserSrc.constant_expression();
console.log('CE Tree:', ceTree.toStringTree(null, true));
console.log('CE has expression:', typeof ceTree.expression);
const exprInCE = ceTree.expression();
console.log('CE expression:', exprInCE ? exprInCE.toStringTree(null, true) : 'null');
if (exprInCE) {
    console.log('CE expr has primary:', typeof exprInCE.primary);
    console.log('CE expr has binary_operator:', typeof exprInCE.binary_operator);
    const binOp = exprInCE.binary_operator ? exprInCE.binary_operator() : null;
    console.log('Binary op:', binOp ? binOp.getText() : 'null');
    const exprs = exprInCE.expression();
    console.log('Sub-expressions:', exprs ? (Array.isArray(exprs) ? exprs.length : 1) : 0);
    if (exprs) {
        const arr = Array.isArray(exprs) ? exprs : [exprs];
        arr.forEach((e, i) => console.log('Sub-expr', i, ':', e.toStringTree(null, true)));
    }
}
