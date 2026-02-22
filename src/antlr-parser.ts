// ANTLR-based Verilog Parser
// Replaces regex-based parser with formal grammar-based parser

import type * as vsCodeModule from 'vscode';
import antlr4 from 'antlr4';
import { VerilogLexer } from '../antlr/generated/VerilogLexer';
import { VerilogParser } from '../antlr/generated/VerilogParser';
import { VerilogVisitor } from '../antlr/generated/VerilogVisitor';

let vscode: typeof vsCodeModule;
try {
    vscode = require('vscode');
} catch (e) {
    // In test environment, use global vscode
    if (typeof global !== 'undefined' && (global as any).vscode) {
        vscode = (global as any).vscode;
    } else {
        throw new Error('vscode module not found. Make sure to set global.vscode in test environment.');
    }
}

/**
 * Custom error listener to capture ANTLR parsing errors
 */
class VerilogErrorListener extends antlr4.error.ErrorListener {
    errors: any[];

    constructor() {
        super();
        this.errors = [];
    }

    syntaxError(recognizer: any, offendingSymbol: any, line: any, column: any, msg: any, e: any) {
        // Convert ANTLR error to VS Code diagnostic format
        // ANTLR uses 1-based line numbers, VS Code uses 0-based
        const vscodeLine = line - 1;
        
        // Determine the length of the error
        let length = 1;
        if (offendingSymbol && offendingSymbol.text) {
            length = offendingSymbol.text.length;
        }

        this.errors.push({
            line: vscodeLine,
            character: column,
            length: length,
            message: msg,
            severity: vscode.DiagnosticSeverity.Error
        });
    }

    getErrors() {
        return this.errors;
    }

    clearErrors() {
        this.errors = [];
    }
}

/**
 * ANTLR parse-tree visitor that extracts module and signal declarations.
 *
 * Module entry: { name, uri, line, character, ports[] }
 * Signal entry: { name, uri, line, character, direction, type, bitWidth, moduleName }
 *   direction: 'input' | 'output' | 'inout' | null
 *   type:      'wire' | 'reg' | 'tri' | 'supply0' | 'supply1'
 */
const DEFAULT_NET_TYPE = 'wire';

class VerilogSymbolVisitor extends VerilogVisitor {
    uri: string;
    modules: any[];
    signals: any[];
    instances: any[];
    parameters: any[];
    _moduleSignalRefs: Map<any, any>;
    _signalRefList: any[];
    assignLvalues: any[];
    procLvalues: any[];
    _instPortConnections: any[];
    _moduleParamNames: Map<any, any>;
    _moduleParams: Map<any, any>;
    _currentModule: any;
    _inProcedural: boolean;
    _inContinuousAssign: boolean;
    _currentParamKind: any;

    constructor(uri: string) {
        super();
        this.uri = uri;
        this.modules = [];
        this.signals = [];
        this.instances = [];                 // [{moduleName, instanceName, portConnections[], line, character, parentModuleName}]
        this.parameters = [];                // [{name, uri, line, character, kind, exprText, value, moduleName}]
        // Per-module signal reference tracking (for warnings)
        this._moduleSignalRefs = new Map();   // moduleName -> Set<signalName>
        this._signalRefList = [];             // [{name, moduleName, line, character}]
        this.assignLvalues = [];             // [{name, moduleName, line, character}] continuous assign lvalues
        this.procLvalues = [];               // [{name, moduleName, line, character}] blocking/non-blocking lvalues
        this._instPortConnections = [];      // [{instModuleName, portName, localSignalName, line, character, moduleName}]
        this._moduleParamNames = new Map();  // moduleName -> Set<paramName>
        this._moduleParams = new Map();      // moduleName -> Map<paramName, value> (for cross-param evaluation)
        this._currentModule = null;
        this._inProcedural = false;
        this._inContinuousAssign = false;
    }

    _addSignalRef(name: any, line: any, character: any) {
        if (!this._currentModule) return;
        const moduleName = this._currentModule.name;
        const refs = this._moduleSignalRefs.get(moduleName);
        if (refs && !refs.has(name)) {
            refs.add(name);
            this._signalRefList.push({ name, moduleName, line, character });
        }
    }

    _getLvalueIdentifierInfo(lvalCtx: any) {
        if (!lvalCtx) return null;
        const identCtx = lvalCtx.identifier ? lvalCtx.identifier() : null;
        if (!identCtx) return null;
        return this._getIdentifierInfo(identCtx);
    }

    _getIdentifierInfo(identCtx: any) {
        const token = identCtx.SIMPLE_IDENTIFIER() || identCtx.ESCAPED_IDENTIFIER();
        if (!token) return null;
        return {
            name: token.getText(),
            line: token.symbol.line - 1,   // ANTLR is 1-based; VS Code is 0-based
            character: token.symbol.column // ANTLR column is already 0-based
        };
    }

    _getRangeText(rangeCtx: any) {
        return rangeCtx ? rangeCtx.getText() : null;
    }

    // Return the bit-range text for a range context, evaluating constant expressions
    // (which may reference parameters/localparams) where possible.
    // Falls back to the raw text when evaluation fails.
    _getEvaluatedRangeText(rangeCtx: any) {
        if (!rangeCtx) return null;
        const rawText = rangeCtx.getText();
        if (!this._currentModule) return rawText;
        const moduleParams = this._moduleParams.get(this._currentModule.name);
        if (!moduleParams) return rawText;
        const ceContexts = rangeCtx.constant_expression ? rangeCtx.constant_expression() : null;
        if (!Array.isArray(ceContexts) || ceContexts.length < 2) return rawText;
        const hi = this._evaluateConstantExpression(ceContexts[0], moduleParams);
        const lo = this._evaluateConstantExpression(ceContexts[1], moduleParams);
        if (hi !== null && hi !== undefined && lo !== null && lo !== undefined) {
            return `[${hi}:${lo}]`;
        }
        return rawText;
    }

    // Normalises a raw ANTLR rule-context result to a (possibly empty) array.
    // ANTLR returns a single context for exactly one match and an array for multiple.
    _toArray(raw: any) {
        if (!raw) return [];
        return Array.isArray(raw) ? raw : [raw];
    }

    visitModule_declaration(ctx: any) {
        const info = this._getIdentifierInfo(ctx.module_identifier().identifier());
        if (!info) return null;

        this._currentModule = {
            name: info.name,
            uri: this.uri,
            line: info.line,
            character: info.character,
            ports: []
        };

        // Initialize per-module tracking for signal warnings
        this._moduleSignalRefs.set(info.name, new Set());
        this._moduleParamNames.set(info.name, new Set());
        this._moduleParams.set(info.name, new Map());

        this.visitChildren(ctx);

        this.modules.push(this._currentModule);
        this._currentModule = null;
        return null;
    }

    // Returns identifier info if the expression is a simple (unmodified) identifier primary
    _getPrimaryIdentifier(exprCtx: any) {
        if (!exprCtx) return null;
        if (exprCtx.unary_operator && exprCtx.unary_operator()) return null;
        const primaryCtx = exprCtx.primary ? exprCtx.primary() : null;
        if (!primaryCtx) return null;
        const identCtx = primaryCtx.identifier ? primaryCtx.identifier() : null;
        if (!identCtx) return null;
        return this._getIdentifierInfo(identCtx);
    }

    // Track module instantiations for port-connection warnings
    visitModule_instantiation(ctx: any) {
        if (!this._currentModule) return null;

        const instModIdCtx = ctx.module_identifier();
        const instModInfo = this._getIdentifierInfo(instModIdCtx.identifier());
        if (instModInfo) {
            const instModuleName = instModInfo.name;

            // Collect named port connections for each instance
            const moduleInstances = this._toArray(ctx.module_instance ? ctx.module_instance() : null);

            for (const inst of moduleInstances) {
                // Get instance name from name_of_instance
                const nameOfInstCtx = inst.name_of_instance ? inst.name_of_instance() : null;
                const instNameInfo = nameOfInstCtx
                    ? this._getIdentifierInfo(nameOfInstCtx.identifier())
                    : null;

                const portConnections: any[] = [];

                const portConnsCtx = inst.list_of_port_connections
                    ? inst.list_of_port_connections()
                    : null;

                if (portConnsCtx) {
                    const namedConns = this._toArray(
                        portConnsCtx.named_port_connection
                            ? portConnsCtx.named_port_connection()
                            : null
                    );

                    for (const conn of namedConns) {
                        const portIdCtx = conn.port_identifier ? conn.port_identifier() : null;
                        if (!portIdCtx) continue;
                        const portInfo = this._getIdentifierInfo(portIdCtx.identifier());
                        if (!portInfo) continue;

                        const exprCtx = conn.expression ? conn.expression() : null;
                        const localSignalInfo = this._getPrimaryIdentifier(exprCtx);
                        if (localSignalInfo) {
                            portConnections.push({
                                portName: portInfo.name,
                                localSignalName: localSignalInfo.name,
                                line: localSignalInfo.line,
                                character: localSignalInfo.character
                            });
                            this._instPortConnections.push({
                                instModuleName,
                                portName: portInfo.name,
                                localSignalName: localSignalInfo.name,
                                line: localSignalInfo.line,
                                character: localSignalInfo.character,
                                moduleName: this._currentModule.name
                            });
                        } else if (exprCtx) {
                            // Complex expression (not a simple identifier): visit it so its
                            // identifiers are tracked as r-value references in _moduleSignalRefs.
                            // Simple identifier connections are handled via _instPortConnections /
                            // usedViaPortInput and must NOT be added to _moduleSignalRefs here,
                            // because connections to output ports should not count as "used".
                            this.visit(exprCtx);
                        }
                    }
                }

                this.instances.push({
                    moduleName: instModuleName,
                    instanceName: instNameInfo ? instNameInfo.name : null,
                    line: instNameInfo ? instNameInfo.line : instModInfo.line,
                    character: instNameInfo ? instNameInfo.character : instModInfo.character,
                    portConnections,
                    parentModuleName: this._currentModule.name
                });
            }
        }

        return null;
    }

    // Track always/initial block context for procedural assignment warnings
    visitAlways_construct(ctx: any) {
        if (!this._currentModule) return null;
        const prev = this._inProcedural;
        this._inProcedural = true;
        this.visitChildren(ctx);
        this._inProcedural = prev;
        return null;
    }

    visitInitial_construct(ctx: any) {
        if (!this._currentModule) return null;
        const prev = this._inProcedural;
        this._inProcedural = true;
        this.visitChildren(ctx);
        this._inProcedural = prev;
        return null;
    }

    // Track continuous assign context for "assign lvalue is reg" warning
    visitContinuous_assign(ctx: any) {
        if (!this._currentModule) return null;
        const prev = this._inContinuousAssign;
        this._inContinuousAssign = true;
        this.visitChildren(ctx);
        this._inContinuousAssign = prev;
        return null;
    }

    // Capture lvalue of continuous assign (assignment rule) or FOR loop (in procedural)
    visitAssignment(ctx: any) {
        if (!this._currentModule) return null;
        const lvalInfo = this._getLvalueIdentifierInfo(ctx.lvalue());
        if (lvalInfo) {
            const entry = { ...lvalInfo, moduleName: this._currentModule.name };
            if (this._inContinuousAssign) {
                this.assignLvalues.push(entry);
            } else if (this._inProcedural) {
                this.procLvalues.push(entry);
            }
        }
        this.visitChildren(ctx);
        return null;
    }

    // Capture lvalue of blocking assignment (always/initial body)
    visitBlocking_assignment(ctx: any) {
        if (!this._currentModule) return null;
        const lvalInfo = this._getLvalueIdentifierInfo(ctx.lvalue());
        if (lvalInfo) {
            this.procLvalues.push({ ...lvalInfo, moduleName: this._currentModule.name });
        }
        this.visitChildren(ctx);
        return null;
    }

    // Capture lvalue of non-blocking assignment (always/initial body)
    visitNon_blocking_assignment(ctx: any) {
        if (!this._currentModule) return null;
        const lvalInfo = this._getLvalueIdentifierInfo(ctx.lvalue());
        if (lvalInfo) {
            this.procLvalues.push({ ...lvalInfo, moduleName: this._currentModule.name });
        }
        this.visitChildren(ctx);
        return null;
    }

    // Capture all identifiers used in expressions (r-value signal references)
    visitPrimary(ctx: any) {
        if (this._currentModule && ctx.identifier && ctx.identifier()) {
            const info = this._getIdentifierInfo(ctx.identifier());
            if (info) {
                this._addSignalRef(info.name, info.line, info.character);
            }
        }
        this.visitChildren(ctx);
        return null;
    }

    // Visit l-value children (e.g. array index expressions) for r-value tracking,
    // but do NOT add the l-value identifier itself to _moduleSignalRefs.
    // Being the target of an assignment does not constitute "using" the signal.
    visitLvalue(ctx: any) {
        this.visitChildren(ctx);
        return null;
    }

    // Track parameter declarations to exclude from "undefined signal" warnings
    visitParam_assignment(ctx: any) {
        if (!this._currentModule) return null;
        if (ctx.parameter_identifier && ctx.parameter_identifier()) {
            const identCtx = ctx.parameter_identifier().identifier();
            if (identCtx) {
                const info = this._getIdentifierInfo(identCtx);
                if (info) {
                    const paramNames = this._moduleParamNames.get(this._currentModule.name);
                    if (paramNames) paramNames.add(info.name);

                    // Evaluate the constant_expression for the parameter database
                    const ceCtx = ctx.constant_expression ? ctx.constant_expression() : null;
                    const exprText = ceCtx ? ceCtx.getText() : null;
                    const moduleParams = this._moduleParams.get(this._currentModule.name) || new Map();
                    const value = ceCtx ? this._evaluateConstantExpression(ceCtx, moduleParams) : null;

                    // Store evaluated value for subsequent parameters in the same module
                    if (value !== null && value !== undefined) {
                        moduleParams.set(info.name, value);
                    }

                    // The kind ('parameter' or 'localparam') is set by the calling context;
                    // default here is 'parameter' and visitLocal_parameter_declaration overrides it.
                    this.parameters.push({
                        name: info.name,
                        uri: this.uri,
                        line: info.line,
                        character: info.character,
                        kind: this._currentParamKind || 'parameter',
                        exprText,
                        value,
                        moduleName: this._currentModule.name
                    });
                }
            }
        }
        // Do NOT call visitChildren – the expression is already evaluated above and
        // we don't want its identifiers counted as signal r-value references.
        return null;
    }

    // localparam declarations share the same param_assignment structure
    visitLocal_parameter_declaration(ctx: any) {
        if (!this._currentModule) return null;
        const prev = this._currentParamKind;
        this._currentParamKind = 'localparam';
        this.visitChildren(ctx);
        this._currentParamKind = prev;
        return null;
    }

    // Helper: parse a Verilog number literal to a JS number.
    // Handles non-negative literals only; unary minus is handled by _applyUnary.
    _parseVerilogNumber(text: any) {
        if (!text) return null;
        // Plain integer (no base prefix)
        if (/^\d+$/.test(text)) return parseInt(text, 10);
        // Real number
        if (/^\d+\.\d+([eE][+-]?\d+)?$/.test(text) || /^\d+[eE][+-]?\d+$/.test(text)) {
            return parseFloat(text);
        }
        // Verilog number with optional size and base: [size]'[s]<base><digits>
        const match = text.match(/^(\d*)'[sS]?([dDbBhHoO])([0-9a-fA-F_xXzZ?]+)$/);
        if (!match) return null;
        const [, , base, digits] = match;
        const clean = digits.replace(/[_]/g, '');
        // Reject numbers with unknowns / high-Z
        if (/[xXzZ?]/.test(clean)) return null;
        switch (base.toLowerCase()) {
            case 'd': return parseInt(clean, 10);
            case 'b': return parseInt(clean, 2);
            case 'h': return parseInt(clean, 16);
            case 'o': return parseInt(clean, 8);
            default:  return null;
        }
    }

    // Helper: evaluate a constant_expression context
    _evaluateConstantExpression(ctx: any, paramMap: any) {
        const exprCtx = ctx.expression ? ctx.expression() : null;
        return exprCtx ? this._evaluateExpression(exprCtx, paramMap) : null;
    }

    // Recursively evaluate an expression context; returns a number or null
    _evaluateExpression(ctx: any, paramMap: any) {
        if (!ctx) return null;

        // STRING literal – not numeric
        if (ctx.STRING && ctx.STRING()) return null;

        const primaryCtx = ctx.primary ? ctx.primary() : null;

        if (primaryCtx) {
            const unaryOpCtx = ctx.unary_operator ? ctx.unary_operator() : null;
            const val = this._evaluatePrimary(primaryCtx, paramMap);
            if (val === null) return null;
            if (unaryOpCtx) {
                const op = unaryOpCtx.getText();
                return this._applyUnary(op, val);
            }
            return val;
        }

        // Sub-expressions
        const exprs = ctx.expression ? ctx.expression() : null;
        const exprsArr = exprs
            ? (Array.isArray(exprs) ? exprs : [exprs])
            : [];

        const binaryOpCtx = ctx.binary_operator ? ctx.binary_operator() : null;

        if (binaryOpCtx && exprsArr.length >= 2) {
            const left  = this._evaluateExpression(exprsArr[0], paramMap);
            const right = this._evaluateExpression(exprsArr[1], paramMap);
            if (left === null || right === null) return null;
            return this._applyBinary(binaryOpCtx.getText(), left, right);
        }

        // Ternary: condition ? then : else (3 sub-expressions)
        if (exprsArr.length === 3) {
            const cond = this._evaluateExpression(exprsArr[0], paramMap);
            if (cond === null) return null;
            return cond
                ? this._evaluateExpression(exprsArr[1], paramMap)
                : this._evaluateExpression(exprsArr[2], paramMap);
        }

        return null;
    }

    // Evaluate a primary context
    _evaluatePrimary(ctx: any, paramMap: any) {
        if (!ctx) return null;

        // Parenthesised expression
        const innerExpr = ctx.expression ? ctx.expression() : null;
        if (innerExpr && !ctx.identifier()) {
            return this._evaluateExpression(innerExpr, paramMap);
        }

        // Number literal
        const numCtx = ctx.number ? ctx.number() : null;
        if (numCtx) {
            return this._parseVerilogNumber(numCtx.getText());
        }

        // Identifier (parameter reference)
        const identCtx = ctx.identifier ? ctx.identifier() : null;
        if (identCtx) {
            const token = identCtx.SIMPLE_IDENTIFIER() || identCtx.ESCAPED_IDENTIFIER();
            if (token) {
                const name = token.getText();
                if (paramMap && paramMap.has(name)) return paramMap.get(name);
            }
            return null;
        }

        return null;
    }

    _applyUnary(op: any, val: any) {
        switch (op) {
            case '+':  return +val;
            case '-':  return -val;
            case '!':  return val === 0 ? 1 : 0;
            case '~':  return ~val;
            // Reduction operators (&, |, ^, ~&, ~|) require bit-by-bit evaluation
            // of multi-bit values – skip for constant folding purposes.
            case '&':  return null;
            case '|':  return null;
            case '^':  return null;
            default:   return null;
        }
    }

    _applyBinary(op: any, left: any, right: any) {
        switch (op) {
            case '+':   return left + right;
            case '-':   return left - right;
            case '*':   return left * right;
            case '/':   return right !== 0 ? Math.trunc(left / right) : null;
            case '%':   return right !== 0 ? left % right : null;
            case '**':  return Math.pow(left, right);
            case '<<':  return left << right;
            case '>>':  return left >> right;
            case '<<<': return left << right;
            case '>>>': return left >>> right;
            case '&':   return left & right;
            case '|':   return left | right;
            case '^':   return left ^ right;
            case '~&':  return ~(left & right);
            case '~|':  return ~(left | right);
            case '==':  return left === right ? 1 : 0;
            case '!=':  return left !== right ? 1 : 0;
            case '<':   return left <  right ? 1 : 0;
            case '>':   return left >  right ? 1 : 0;
            case '<=':  return left <= right ? 1 : 0;
            case '>=':  return left >= right ? 1 : 0;
            case '&&':  return (left && right) ? 1 : 0;
            case '||':  return (left || right) ? 1 : 0;
            default:    return null;
        }
    }

    // ANSI-style port declaration: input wire [7:0] data_in
    visitAnsi_port_declaration(ctx: any) {
        if (!this._currentModule) return null;

        const direction = ctx.port_direction().getText();
        const dataTypeCtx = ctx.port_data_type();
        const type = dataTypeCtx ? dataTypeCtx.getText() : DEFAULT_NET_TYPE;
        const bitWidth = this._getEvaluatedRangeText(ctx.range());

        const info = this._getIdentifierInfo(ctx.port_identifier().identifier());
        if (!info) return null;

        const signal = {
            name: info.name,
            uri: this.uri,
            line: info.line,
            character: info.character,
            direction,
            type,
            bitWidth,
            moduleName: this._currentModule.name
        };

        this._currentModule.ports.push(signal);
        this.signals.push(signal);
        return null;
    }

    // Non-ANSI port declarations: input [7:0] data;
    visitInput_declaration(ctx: any) {
        if (!this._currentModule) return null;
        this._processPortDeclaration(ctx, 'input');
        return null;
    }

    visitOutput_declaration(ctx: any) {
        if (!this._currentModule) return null;
        this._processPortDeclaration(ctx, 'output');
        return null;
    }

    visitInout_declaration(ctx: any) {
        if (!this._currentModule) return null;
        this._processPortDeclaration(ctx, 'inout');
        return null;
    }

    _processPortDeclaration(ctx: any, direction: any) {
        const netTypeCtx = ctx.net_type();
        const type = netTypeCtx ? netTypeCtx.getText() : DEFAULT_NET_TYPE;
        const bitWidth = this._getEvaluatedRangeText(ctx.range());

        const portIdsCtx = ctx.list_of_port_identifiers();
        const rawIds = portIdsCtx.port_identifier();
        const ids = Array.isArray(rawIds) ? rawIds : (rawIds ? [rawIds] : []);

        for (const portIdCtx of ids) {
            const info = this._getIdentifierInfo(portIdCtx.identifier());
            if (!info) continue;

            const signal = {
                name: info.name,
                uri: this.uri,
                line: info.line,
                character: info.character,
                direction,
                type,
                bitWidth,
                moduleName: this._currentModule.name
            };

            this._currentModule.ports.push(signal);
            this.signals.push(signal);
        }
    }

    // Internal wire/net declarations: wire [7:0] data;
    visitNet_declaration(ctx: any) {
        if (!this._currentModule) return null;

        const type = ctx.net_type().getText();
        const bitWidth = this._getEvaluatedRangeText(ctx.range());

        const netIdsCtx = ctx.list_of_net_identifiers();
        const rawIds = netIdsCtx.net_identifier();
        const ids = Array.isArray(rawIds) ? rawIds : (rawIds ? [rawIds] : []);

        for (const netIdCtx of ids) {
            const info = this._getIdentifierInfo(netIdCtx.identifier());
            if (!info) continue;

            this.signals.push({
                name: info.name,
                uri: this.uri,
                line: info.line,
                character: info.character,
                direction: null,
                type,
                bitWidth,
                moduleName: this._currentModule.name
            });
        }
        return null;
    }

    // Internal reg declarations: reg [15:0] counter;
    visitReg_declaration(ctx: any) {
        if (!this._currentModule) return null;

        const bitWidth = this._getEvaluatedRangeText(ctx.range());

        const regIdsCtx = ctx.list_of_register_identifiers();
        const rawIds = regIdsCtx.register_identifier();
        const ids = Array.isArray(rawIds) ? rawIds : (rawIds ? [rawIds] : []);

        for (const regIdCtx of ids) {
            const info = this._getIdentifierInfo(regIdCtx.identifier());
            if (!info) continue;

            this.signals.push({
                name: info.name,
                uri: this.uri,
                line: info.line,
                character: info.character,
                direction: null,
                type: 'reg',
                bitWidth,
                moduleName: this._currentModule.name
            });
        }
        return null;
    }
}

/**
 * ANTLR-based Verilog Parser
 * Provides the same interface as the regex-based parser for compatibility
 */
class AntlrVerilogParser {
    errorListener: VerilogErrorListener;

    constructor() {
        this.errorListener = new VerilogErrorListener();
    }

    /**
     * Parse Verilog document and detect syntax errors
     * Also generates semantic warnings (signal usage issues).
     * @param {vscode.TextDocument} document 
     * @param {Object} [moduleDatabase] - Optional workspace-wide module database for cross-file port lookup
     * @returns {Array} Array of diagnostic objects (syntax errors + signal warnings)
     */
    parse(document: any, moduleDatabase: any = null) {
        const { errors, warnings } = this.parseSymbols(document, moduleDatabase);
        return [...errors, ...warnings];
    }

    /**
     * Parse Verilog document and extract module/signal symbols plus syntax errors.
     * Replaces the regex-based parseVerilogSymbols function.
     *
     * @param {vscode.TextDocument} document
     * @param {Object} [moduleDatabase] - Optional workspace-wide module database for cross-file port lookup
     * @returns {{ modules: Array, signals: Array, parameters: Array, errors: Array, warnings: Array }}
     *   modules:    [{ name, uri, line, character, ports[] }]
     *   signals:    [{ name, uri, line, character, direction, type, bitWidth, moduleName }]
     *   parameters: [{ name, uri, line, character, kind, exprText, value, moduleName }]
     *   errors:  syntax errors
     *   warnings: signal usage warnings
     */
    parseSymbols(document: any, moduleDatabase: any = null) {
        this.errorListener.clearErrors();

        const text = document.getText();
        const uri = document.uri.toString();
        let modules: any[] = [];
        let signals: any[] = [];
        let visitor: VerilogSymbolVisitor | null = null;

        try {
            const chars = new (antlr4 as any).InputStream(text, true);
            const lexer = new VerilogLexer(chars as any) as any;
            lexer.removeErrorListeners();
            lexer.addErrorListener(this.errorListener);

            const tokens = new (antlr4 as any).CommonTokenStream(lexer);
            const parser = new VerilogParser(tokens) as any;
            parser.removeErrorListeners();
            parser.addErrorListener(this.errorListener);
            parser.buildParseTrees = true;

            const tree = parser.source_text();

            visitor = new VerilogSymbolVisitor(uri);
            (tree as any).accept(visitor);
            modules = visitor.modules;
            signals = visitor.signals;

        } catch (error: any) {
            console.error('ANTLR symbol extraction error:', error);
            this.errorListener.errors.push({
                line: 0,
                character: 0,
                length: 1,
                message: `Parser error: ${error.message}`,
                severity: vscode.DiagnosticSeverity.Error
            });
        }

        const warnings = visitor ? this._generateSignalWarnings(modules, signals, visitor, moduleDatabase) : [];
        const instances = visitor ? visitor.instances : [];
        const parameters = visitor ? visitor.parameters : [];

        return { modules, signals, instances, parameters, errors: this.errorListener.getErrors(), warnings };
    }

    /**
     * Generate signal-usage warnings for all modules in the parsed result.
     * @param {Array} modules
     * @param {Array} signals
     * @param {VerilogSymbolVisitor} visitor
     * @param {Object} [moduleDatabase] - Optional workspace-wide module database for cross-file port lookup
     * @returns {Array} Array of warning diagnostic objects
     */
    _generateSignalWarnings(modules: any[], signals: any[], visitor: VerilogSymbolVisitor, moduleDatabase: any = null) {
        const warnings: any[] = [];
        const wireTypes = new Set(['wire', 'tri', 'supply0', 'supply1']);

        // Build a map of module name -> port name -> port object for instantiation checks.
        // First populate from locally-parsed modules, then fill in missing entries from
        // the workspace-wide moduleDatabase (cross-file module support).
        const modulePortMap = new Map();
        for (const mod of modules) {
            modulePortMap.set(mod.name, new Map(mod.ports.map((p: any) => [p.name, p])));
        }
        if (moduleDatabase) {
            for (const mod of moduleDatabase.getAllModules()) {
                if (!modulePortMap.has(mod.name)) {
                    modulePortMap.set(mod.name, new Map(mod.ports.map((p: any) => [p.name, p])));
                }
            }
        }

        for (const module of modules) {
            const moduleName = module.name;
            const declaredSignals = signals.filter(s => s.moduleName === moduleName);
            const declaredByName = new Map(declaredSignals.map((s: any) => [s.name, s]));
            const paramNames = visitor._moduleParamNames.get(moduleName) || new Set();
            const refNames = visitor._moduleSignalRefs.get(moduleName) || new Set();

            // Build sets of signals that are "used" or "assigned" via port connections
            // to instantiated modules, using cross-file port information from modulePortMap.
            // - Signals connected to input or inout ports are "used" (the submodule reads them).
            // - Signals connected to output or inout ports are "assigned" (the submodule drives them).
            const usedViaPortInput = new Set();
            const assignedViaPortOutput = new Set();
            for (const conn of visitor._instPortConnections.filter((c: any) => c.moduleName === moduleName)) {
                const instModPorts = modulePortMap.get(conn.instModuleName);
                if (!instModPorts) continue;
                const instPort = instModPorts.get(conn.portName);
                if (!instPort) continue;
                if (instPort.direction === 'input' || instPort.direction === 'inout') {
                    usedViaPortInput.add(conn.localSignalName);
                }
                if (instPort.direction === 'output' || instPort.direction === 'inout') {
                    assignedViaPortOutput.add(conn.localSignalName);
                }
            }

            // Build the set of assigned signals: all explicit l-values plus signals driven
            // by output or inout ports of instantiated modules (used for Warnings 2 and 7).
            const assignedSignals = new Set(assignedViaPortOutput);
            for (const lval of [...visitor.assignLvalues, ...visitor.procLvalues].filter((l: any) => l.moduleName === moduleName)) {
                assignedSignals.add(lval.name);
            }

            // Warning 1: signal reference without declaration
            const reportedUndefined = new Set();
            for (const refEntry of visitor._signalRefList.filter((r: any) => r.moduleName === moduleName)) {
                const name = refEntry.name;
                if (!declaredByName.has(name) && !paramNames.has(name) && !reportedUndefined.has(name)) {
                    reportedUndefined.add(name);
                    warnings.push({
                        line: refEntry.line,
                        character: refEntry.character,
                        length: name.length,
                        message: `Signal '${name}' is referenced but not declared`,
                        severity: vscode.DiagnosticSeverity.Warning
                    });
                }
            }

            // Warning 2: signal declared but never used.
            // A signal is "used" if it appears as an r-value in an expression (refNames)
            // or is connected to an input/inout port of an instantiated module (usedViaPortInput).
            // L-value assignments and connections to output ports do NOT count as "using" a signal.
            // Exception: output/inout port signals that are assigned are considered used externally.
            for (const signal of declaredSignals) {
                if (!refNames.has(signal.name) && !usedViaPortInput.has(signal.name)) {
                    // Output/inout ports that are assigned drive the module interface;
                    // they are consumed externally and must not trigger "never used".
                    if ((signal.direction === 'output' || signal.direction === 'inout') &&
                            assignedSignals.has(signal.name)) {
                        continue;
                    }
                    warnings.push({
                        line: signal.line,
                        character: signal.character,
                        length: signal.name.length,
                        message: `Signal '${signal.name}' is declared but never used`,
                        severity: vscode.DiagnosticSeverity.Warning
                    });
                }
            }

            // Warning 3: continuous assign statement l-value is a reg
            const reportedAssignReg = new Set();
            for (const lval of visitor.assignLvalues.filter((l: any) => l.moduleName === moduleName)) {
                if (reportedAssignReg.has(lval.name)) continue;
                const sig = declaredByName.get(lval.name);
                if (sig && sig.type === 'reg') {
                    reportedAssignReg.add(lval.name);
                    warnings.push({
                        line: lval.line,
                        character: lval.character,
                        length: lval.name.length,
                        message: `Assign statement l-value '${lval.name}' is a reg`,
                        severity: vscode.DiagnosticSeverity.Warning
                    });
                }
            }

            // Warning 4: procedural (always/initial) l-value is a wire
            const reportedProcWire = new Set();
            for (const lval of visitor.procLvalues.filter((l: any) => l.moduleName === moduleName)) {
                if (reportedProcWire.has(lval.name)) continue;
                const sig = declaredByName.get(lval.name);
                if (sig && wireTypes.has(sig.type)) {
                    reportedProcWire.add(lval.name);
                    warnings.push({
                        line: lval.line,
                        character: lval.character,
                        length: lval.name.length,
                        message: `Procedural assignment l-value '${lval.name}' is a wire`,
                        severity: vscode.DiagnosticSeverity.Warning
                    });
                }
            }

            // Warning 5: input signal used as l-value in assign or procedural block
            const reportedInputLval = new Set();
            for (const lval of [...visitor.assignLvalues, ...visitor.procLvalues].filter((l: any) => l.moduleName === moduleName)) {
                if (reportedInputLval.has(lval.name)) continue;
                if (declaredSignals.some((s: any) => s.name === lval.name && s.direction === 'input')) {
                    reportedInputLval.add(lval.name);
                    warnings.push({
                        line: lval.line,
                        character: lval.character,
                        length: lval.name.length,
                        message: `Input signal '${lval.name}' cannot be used as l-value`,
                        severity: vscode.DiagnosticSeverity.Warning
                    });
                }
            }

            // Warning 6: output or inout port of instantiated module connected to reg signal
            // A reg cannot be driven by a submodule's output/inout port.
            const reportedOutputPortReg = new Set();
            for (const conn of visitor._instPortConnections.filter((c: any) => c.moduleName === moduleName)) {
                const instModPorts = modulePortMap.get(conn.instModuleName);
                if (!instModPorts) continue;
                const instPort = instModPorts.get(conn.portName);
                if (!instPort || (instPort.direction !== 'output' && instPort.direction !== 'inout')) continue;

                if (!reportedOutputPortReg.has(conn.localSignalName) &&
                    declaredSignals.some((s: any) => s.name === conn.localSignalName && s.type === 'reg')) {
                    reportedOutputPortReg.add(conn.localSignalName);
                    const dirLabel = instPort.direction.charAt(0).toUpperCase() + instPort.direction.slice(1);
                    warnings.push({
                        line: conn.line,
                        character: conn.character,
                        length: conn.localSignalName.length,
                        message: `${dirLabel} port '${conn.portName}' of instantiated module cannot be connected to reg signal '${conn.localSignalName}'`,
                        severity: vscode.DiagnosticSeverity.Warning
                    });
                }
            }

            // Warning 7: output or internal signal never assigned
            const reportedNeverAssigned = new Set();
            for (const signal of declaredSignals) {
                if (signal.direction === 'input' || signal.direction === 'inout') continue;
                if (reportedNeverAssigned.has(signal.name)) continue;
                if (!assignedSignals.has(signal.name)) {
                    reportedNeverAssigned.add(signal.name);
                    warnings.push({
                        line: signal.line,
                        character: signal.character,
                        length: signal.name.length,
                        message: `Signal '${signal.name}' is never assigned`,
                        severity: vscode.DiagnosticSeverity.Warning
                    });
                }
            }
        }

        return warnings;
    }
}

export = AntlrVerilogParser;
