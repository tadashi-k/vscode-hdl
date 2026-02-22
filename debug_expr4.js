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

// Test: (1 << WIDTH)
const ce = parseConstExpr('(1 << WIDTH)');
const expr = ce.expression();
console.log('=== (1 << WIDTH) ===');
console.log('Top expr has primary:', expr.primary() ? 'YES' : 'NO');
console.log('Top expr has binary_op:', expr.binary_operator() ? 'YES' : 'NO');

if (expr.primary()) {
    const prim = expr.primary();
    console.log('Primary.expression():', prim.expression() ? prim.expression().toStringTree(null, true) : 'null');
    const innerExpr = prim.expression();
    if (innerExpr) {
        console.log('InnerExpr (1<<WIDTH):');
        console.log('  primary:', innerExpr.primary() ? 'YES' : 'NO');
        console.log('  binary_op:', innerExpr.binary_operator() ? innerExpr.binary_operator().getText() : 'NO');
        const subExprs = innerExpr.expression();
        console.log('  sub-exprs count:', subExprs ? (Array.isArray(subExprs) ? subExprs.length : 1) : 0);
        if (subExprs && Array.isArray(subExprs)) {
            subExprs.forEach((e, i) => {
                console.log(`  sub-expr[${i}]:`, e.toStringTree(null, true));
                console.log(`  sub-expr[${i}].primary:`, e.primary() ? 'YES' : 'NO');
                if (e.primary()) {
                    const p = e.primary();
                    console.log(`  sub-expr[${i}].primary.number:`, p.number ? (p.number() ? p.number().getText() : 'null') : 'no method');
                    console.log(`  sub-expr[${i}].primary.identifier:`, p.identifier ? (p.identifier() ? p.identifier().getText() : 'null') : 'no method');
                }
            });
        }
    }
}
