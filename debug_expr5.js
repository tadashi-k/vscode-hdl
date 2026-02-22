const vscode = { DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 } };
global.vscode = vscode;
const antlr4 = require('antlr4');
const VerilogLexer = require('./antlr/generated/VerilogLexer.js').VerilogLexer;
const VerilogParser = require('./antlr/generated/VerilogParser.js').VerilogParser;
const VerilogVisitor = require('./antlr/generated/VerilogVisitor.js').VerilogVisitor;

// Monkey-patch the evaluate functions with debugging
const AntlrVerilogParser = require('./src/antlr-parser');
const parser = new AntlrVerilogParser();

// Manually test the evaluation
function parseConstExpr(code) {
    const chars = new antlr4.InputStream(code, true);
    const lexer = new VerilogLexer(chars);
    const tokens = new antlr4.CommonTokenStream(lexer);
    const p = new VerilogParser(tokens);
    p.buildParseTrees = true;
    return p.constant_expression();
}

function parseModule(code) {
    const chars = new antlr4.InputStream(code, true);
    const lexer = new VerilogLexer(chars);
    const tokens = new antlr4.CommonTokenStream(lexer);
    const p = new VerilogParser(tokens);
    p.buildParseTrees = true;
    return p.source_text();
}

// Create a visitor instance to test
class TestVisitor extends VerilogVisitor {
    constructor() {
        super();
    }
}

// Let's manually trace through the evaluation
const ce = parseConstExpr('(1 << WIDTH)');
const expr = ce.expression();
const paramMap = new Map([['WIDTH', 8]]);

// Simulate _evaluateExpression
function evaluateExpression(ctx, paramMap, depth) {
    const indent = ' '.repeat(depth * 2);
    console.log(indent + 'evaluateExpression:', ctx.toStringTree(null, true).substring(0, 80));
    
    if (!ctx) return null;
    if (ctx.STRING && ctx.STRING()) return null;
    
    const primaryCtx = ctx.primary ? ctx.primary() : null;
    console.log(indent + '  primary:', primaryCtx ? 'YES' : 'NO');
    
    if (primaryCtx) {
        const unaryOpCtx = ctx.unary_operator ? ctx.unary_operator() : null;
        const val = evaluatePrimary(primaryCtx, paramMap, depth + 1);
        console.log(indent + '  val from primary:', val);
        if (val === null) return null;
        if (unaryOpCtx) {
            return applyUnary(unaryOpCtx.getText(), val);
        }
        return val;
    }
    
    const exprs = ctx.expression ? ctx.expression() : null;
    const exprsArr = exprs ? (Array.isArray(exprs) ? exprs : [exprs]) : [];
    console.log(indent + '  exprsArr length:', exprsArr.length);
    
    const binaryOpCtx = ctx.binary_operator ? ctx.binary_operator() : null;
    console.log(indent + '  binaryOp:', binaryOpCtx ? binaryOpCtx.getText() : 'NO');
    
    if (binaryOpCtx && exprsArr.length >= 2) {
        const left = evaluateExpression(exprsArr[0], paramMap, depth + 1);
        const right = evaluateExpression(exprsArr[1], paramMap, depth + 1);
        console.log(indent + '  left:', left, 'right:', right);
        if (left === null || right === null) return null;
        return applyBinary(binaryOpCtx.getText(), left, right);
    }
    
    return null;
}

function evaluatePrimary(ctx, paramMap, depth) {
    const indent = ' '.repeat(depth * 2);
    console.log(indent + 'evaluatePrimary:', ctx.toStringTree(null, true).substring(0, 80));
    
    if (!ctx) return null;
    
    const innerExpr = ctx.expression ? ctx.expression() : null;
    console.log(indent + '  innerExpr:', innerExpr ? 'YES' : 'NO');
    
    if (innerExpr && !ctx.identifier) {
        return evaluateExpression(innerExpr, paramMap, depth + 1);
    }
    
    const numCtx = ctx.number ? ctx.number() : null;
    if (numCtx) {
        return parseInt(numCtx.getText(), 10);
    }
    
    const identCtx = ctx.identifier ? ctx.identifier() : null;
    if (identCtx) {
        const token = identCtx.SIMPLE_IDENTIFIER() || identCtx.ESCAPED_IDENTIFIER();
        if (token) {
            const name = token.getText();
            if (paramMap && paramMap.has(name)) return paramMap.get(name);
        }
    }
    
    return null;
}

function applyBinary(op, left, right) {
    switch (op) {
        case '<<': return left << right;
        case '-': return left - right;
        default: return null;
    }
}

function applyUnary(op, val) {
    switch(op) {
        case '-': return -val;
        default: return null;
    }
}

console.log('=== (1 << WIDTH) ===');
const result = evaluateExpression(expr, paramMap, 0);
console.log('Result:', result);
