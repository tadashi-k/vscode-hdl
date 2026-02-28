// ANTLR-based Verilog Parser
// Replaces regex-based parser with formal grammar-based parser

import type * as vsCodeModule from 'vscode';
import antlr4 from 'antlr4';
import { preprocessVerilog } from './verilog-scanner';
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
 * Helper class to represent evaluated expression values.
 * 
 * value: the numeric value of the expression, or null if it cannot be evaluated
 * width: the bit-width of the expression, or null if no base prefix
 */
class EvalValue {
    value: number | null;
    width: number | null;
}

/**
 * ANTLR parse-tree visitor that extracts module and signal declarations.
 *
 * Module entry: { name, uri, line, character, ports[] }
 * Signal entry: { name, uri, line, character, direction, type, bitWidth, moduleName }
 *   direction: 'input' | 'output' | 'inout' | null
 *   type:      'wire' | 'reg' | 'integer' | 'tri' | 'supply0' | 'supply1'
 */
const DEFAULT_NET_TYPE = 'wire';

class VerilogSymbolVisitor extends VerilogVisitor {
    uri: string;
    modules: any[];
    signals: any[];
    instances: any[];
    parameters: any[];
    moduleTokens: any[];
    _moduleSignalRefs: Map<any, any>;
    _signalRefList: any[];
    assignLvalues: any[];
    procLvalues: any[];
    _instPortConnections: any[];
    _moduleParamNames: Map<any, any>;
    _moduleParams: Map<any, any>;
    _moduleGenvarNames: Map<any, any>;
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
        this.moduleTokens = [];              // [{name, line, character}] positions for hdlModule semantic tokens
        this._moduleParamNames = new Map();  // moduleName -> Set<paramName>
        this._moduleParams = new Map();      // moduleName -> Map<paramName, value> (for cross-param evaluation)
        this._moduleGenvarNames = new Map(); // moduleName -> Set<genvarName>
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

    // Extract all identifier infos from a lvalue, handling both simple identifiers and concatenations.
    _getLvalueIdentifiers(lvalCtx: any): any[] {
        if (!lvalCtx) return [];
        // Simple identifier lvalue
        const identCtx = lvalCtx.identifier ? lvalCtx.identifier() : null;
        if (identCtx) {
            const info = this._getIdentifierInfo(identCtx);
            return info ? [info] : [];
        }
        // Concatenation lvalue: {a, b, c}
        const concatCtx = lvalCtx.concatenation ? lvalCtx.concatenation() : null;
        if (concatCtx) {
            return this._getConcatenationIdentifiers(concatCtx);
        }
        return [];
    }

    // Extract top-level identifiers from a concatenation context.
    // Handles nested concatenations like {a, {b, c}} recursively.
    _getConcatenationIdentifiers(concatCtx: any): any[] {
        const results: any[] = [];
        const expressions = concatCtx.expression ? concatCtx.expression() : null;
        const exprArr = Array.isArray(expressions) ? expressions : (expressions ? [expressions] : []);
        for (const exprCtx of exprArr) {
            // Check for nested concatenation inside the expression's primary
            const primaryCtx = exprCtx.primary ? exprCtx.primary() : null;
            if (primaryCtx) {
                const nestedConcat = primaryCtx.concatenation ? primaryCtx.concatenation() : null;
                if (nestedConcat) {
                    results.push(...this._getConcatenationIdentifiers(nestedConcat));
                    continue;
                }
            }
            const info = this._getPrimaryIdentifier(exprCtx);
            if (info) {
                results.push(info);
            }
        }
        return results;
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
        if (hi?.value !== null && hi?.value !== undefined && lo?.value !== null && lo?.value !== undefined) {
            return `[${hi.value}:${lo.value}]`;
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

        // Track module_identifier for hdlModule semantic token
        this.moduleTokens.push({ name: info.name, line: info.line, character: info.character });

        // Initialize per-module tracking for signal warnings
        this._moduleSignalRefs.set(info.name, new Set());
        this._moduleParamNames.set(info.name, new Set());
        this._moduleParams.set(info.name, new Map());
        this._moduleGenvarNames.set(info.name, new Set());

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

    /**
     * If exprCtx is a concatenation expression like {sig_a, sig_b}, return an array
     * of identifier infos for all simple-identifier members (recursively handles nested
     * concatenations). Returns null if the expression is not a concatenation.
     */
    // Track module instantiations for port-connection warnings
    visitModule_instantiation(ctx: any) {
        if (!this._currentModule) return null;

        const instModIdCtx = ctx.module_identifier();
        const instModInfo = this._getIdentifierInfo(instModIdCtx.identifier());
        if (instModInfo) {
            const instModuleName = instModInfo.name;

            // Track module_identifier in instantiation for hdlModule semantic token
            this.moduleTokens.push({ name: instModuleName, line: instModInfo.line, character: instModInfo.character });

            // Collect named port connections for each instance
            const moduleInstances = this._toArray(ctx.module_instance ? ctx.module_instance() : null);

            for (const inst of moduleInstances) {
                // Get instance name from name_of_instance
                const nameOfInstCtx = inst.name_of_instance ? inst.name_of_instance() : null;
                const instNameInfo = nameOfInstCtx
                    ? this._getIdentifierInfo(nameOfInstCtx.identifier())
                    : null;

                // Track instance name for hdlModule semantic token
                if (instNameInfo) {
                    this.moduleTokens.push({ name: instNameInfo.name, line: instNameInfo.line, character: instNameInfo.character });
                }

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
                            // Check for concatenation: .port({sig_a, sig_b})
                            // Each identifier in the concat must be tracked via _instPortConnections
                            // (not as an r-value ref) so output-port assignments are detected.
                            const _exprPrimary = exprCtx.primary ? exprCtx.primary() : null;
                            const _concatCtx = _exprPrimary?.concatenation ? _exprPrimary.concatenation() : null;
                            const concatIdents = _concatCtx ? this._getConcatenationIdentifiers(_concatCtx) : null;
                            if (concatIdents && concatIdents.length > 0) {
                                for (const localSignalInfo of concatIdents) {
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
                                }
                            } else {
                                // Complex expression (not a simple identifier or concatenation): visit
                                // it so its identifiers are tracked as r-value refs in _moduleSignalRefs.
                                // Simple identifier connections are handled via _instPortConnections /
                                // usedViaPortInput and must NOT be added to _moduleSignalRefs here,
                                // because connections to output ports should not count as "used".
                                this.visit(exprCtx);
                            }
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

    // Skip signal analysis inside task/function bodies - they have their own scope
    visitTask_declaration(ctx: any) {
        return null;
    }

    visitFunction_declaration(ctx: any) {
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
        const lvalIdentifiers = this._getLvalueIdentifiers(ctx.lvalue());
        for (const lvalInfo of lvalIdentifiers) {
            const entry = { ...lvalInfo, moduleName: this._currentModule.name };
            if (this._inContinuousAssign) {
                this.assignLvalues.push(entry);
            } else if (this._inProcedural) {
                this.procLvalues.push(entry);
            }
        }
        // Evaluate r-value expression
        const exprCtx = ctx.expression ? ctx.expression() : null;
        if (exprCtx) {
            const moduleParams = this._moduleParams.get(this._currentModule.name) || new Map();
            const moduleSignals = this._buildModuleSignalsMap(this._currentModule.name);
            this._evaluateExpression(exprCtx, moduleParams, moduleSignals);
        }
        this.visitChildren(ctx);
        return null;
    }

    // Capture lvalue of blocking assignment (always/initial body)
    visitBlocking_assignment(ctx: any) {
        if (!this._currentModule) return null;
        const lvalIdentifiers = this._getLvalueIdentifiers(ctx.lvalue());
        for (const lvalInfo of lvalIdentifiers) {
            this.procLvalues.push({ ...lvalInfo, moduleName: this._currentModule.name });
        }
        // Evaluate r-value expression
        const exprCtx = ctx.expression ? ctx.expression() : null;
        if (exprCtx) {
            const moduleParams = this._moduleParams.get(this._currentModule.name) || new Map();
            const moduleSignals = this._buildModuleSignalsMap(this._currentModule.name);
            this._evaluateExpression(exprCtx, moduleParams, moduleSignals);
        }
        this.visitChildren(ctx);
        return null;
    }

    // Capture lvalue of non-blocking assignment (always/initial body)
    visitNon_blocking_assignment(ctx: any) {
        if (!this._currentModule) return null;
        const lvalIdentifiers = this._getLvalueIdentifiers(ctx.lvalue());
        for (const lvalInfo of lvalIdentifiers) {
            this.procLvalues.push({ ...lvalInfo, moduleName: this._currentModule.name });
        }
        this.visitChildren(ctx);
        return null;
    }

    // Evaluate the case condition expression and visit children
    visitCase_statement(ctx: any) {
        if (!this._currentModule) return null;
        const exprCtx = ctx.expression ? ctx.expression() : null;
        if (exprCtx) {
            const moduleParams = this._moduleParams.get(this._currentModule.name) || new Map();
            const moduleSignals = this._buildModuleSignalsMap(this._currentModule.name);
            this._evaluateExpression(exprCtx, moduleParams, moduleSignals);
        }
        this.visitChildren(ctx);
        return null;
    }

    // Evaluate loop condition/bound expressions and visit children
    visitLoop_statement(ctx: any) {
        if (!this._currentModule) return null;
        const exprs = ctx.expression ? ctx.expression() : null;
        if (exprs) {
            const moduleParams = this._moduleParams.get(this._currentModule.name) || new Map();
            const moduleSignals = this._buildModuleSignalsMap(this._currentModule.name);
            const exprsArr = Array.isArray(exprs) ? exprs : [exprs];
            for (const exprCtx of exprsArr) {
                this._evaluateExpression(exprCtx, moduleParams, moduleSignals);
            }
        }
        this.visitChildren(ctx);
        return null;
    }

    // Evaluate the if-condition expression and visit children
    visitConditional_statement(ctx: any) {
        if (!this._currentModule) return null;
        const exprCtx = ctx.expression ? ctx.expression() : null;
        if (exprCtx) {
            const moduleParams = this._moduleParams.get(this._currentModule.name) || new Map();
            const moduleSignals = this._buildModuleSignalsMap(this._currentModule.name);
            this._evaluateExpression(exprCtx, moduleParams, moduleSignals);
        }
        this.visitChildren(ctx);
        return null;
    }

    // Capture all identifiers used in expressions (r-value signal references)
    visitPrimary(ctx: any) {
        if (this._currentModule && ctx.identifier && ctx.identifier()) {
            // Skip function call primaries (identifier followed by '(') - the identifier
            // is a function name, not a signal reference.
            const child1 = ctx.getChild(1);
            const isFunctionCall = child1 && typeof child1.getText === 'function' && child1.getText() === '(';
            if (!isFunctionCall) {
                const info = this._getIdentifierInfo(ctx.identifier());
                if (info) {
                    this._addSignalRef(info.name, info.line, info.character);
                }
            }
        }
        this.visitChildren(ctx);
        return null;
    }

    // Visit l-value children (e.g. array index expressions) for r-value tracking,
    // but do NOT add the l-value identifier itself to _moduleSignalRefs.
    // Being the target of an assignment does not constitute "using" the signal.
    visitLvalue(ctx: any) {
        // For concatenation lvalues, skip visiting children to avoid adding
        // concatenation member identifiers to signal refs (they are lvalue targets,
        // not r-value references). The assignment visitors handle extracting identifiers.
        const concatCtx = ctx.concatenation ? ctx.concatenation() : null;
        if (concatCtx) {
            return null;
        }
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
                    const evalResult = ceCtx ? this._evaluateConstantExpression(ceCtx, moduleParams) : null;
                    const value = evalResult !== null ? evalResult.value : null;

                    // Store EvalValue for subsequent parameters in the same module
                    if (evalResult !== null && evalResult !== undefined) {
                        moduleParams.set(info.name, evalResult);
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

    // Helper: parse a Verilog number literal to an EvalValue with both value and width.
    // Width is extracted from the size prefix (e.g. 8 from 8'hFF); plain integers have null width.
    _parseVerilogLiteral(text: any): EvalValue | null {
        if (!text) return null;
        // Plain integer (no base prefix) – unsized, width = null
        if (/^\d+$/.test(text)) return { value: parseInt(text, 10), width: null };
        // Real number – unsized
        if (/^\d+\.\d+([eE][+-]?\d+)?$/.test(text) || /^\d+[eE][+-]?\d+$/.test(text)) {
            return { value: parseFloat(text), width: null };
        }
        // Verilog number with optional size and base: [size]'[s]<base><digits>
        const match = text.match(/^(\d*)'[sS]?([dDbBhHoO])([0-9a-fA-F_xXzZ?]+)$/);
        if (!match) return null;
        const [, sizeStr, base, digits] = match;
        const width = sizeStr ? parseInt(sizeStr, 10) : null;
        const clean = digits.replace(/[_]/g, '');
        // Unknowns / high-Z: width is still known but value is not
        if (/[xXzZ?]/.test(clean)) return { value: null, width };
        let value: number | null;
        switch (base.toLowerCase()) {
            case 'd': value = parseInt(clean, 10); break;
            case 'b': value = parseInt(clean, 2); break;
            case 'h': value = parseInt(clean, 16); break;
            case 'o': value = parseInt(clean, 8); break;
            default:  return null;
        }
        return { value, width };
    }

    // Helper: evaluate a constant_expression context
    _evaluateConstantExpression(ctx: any, paramMap: any): EvalValue | null {
        const exprCtx = ctx.expression ? ctx.expression() : null;
        if (Array.isArray(exprCtx)) {
            // expression() returns an array via getTypedRuleContexts; pick the first
            return exprCtx.length > 0 ? this._evaluateExpression(exprCtx[0], paramMap) : null;
        }
        return exprCtx ? this._evaluateExpression(exprCtx, paramMap) : null;
    }

    // Helper: build a map of signal name -> signal object for a given module
    _buildModuleSignalsMap(moduleName: string): Map<string, any> {
        return new Map(
            this.signals
                .filter(s => s.moduleName === moduleName)
                .map(s => [s.name, s])
        );
    }

    // Helper: extract the numeric bit-width from a bitWidth string (e.g. "[7:0]" -> 8)
    _getSignalWidth(bitWidth: string | null): number | null {
        if (!bitWidth) return null;
        const match = bitWidth.match(/^\[(\d+):(\d+)\]$/);
        if (!match) return null;
        return Math.abs(parseInt(match[1], 10) - parseInt(match[2], 10)) + 1;
    }

    // Recursively evaluate an expression context; returns an EvalValue or null
    _evaluateExpression(ctx: any, paramMap: any, moduleSignals?: Map<string, any>): EvalValue | null {
        if (!ctx) return null;

        // STRING literal – not numeric
        if (ctx.STRING && ctx.STRING()) return null;

        const primaryCtx = ctx.primary ? ctx.primary() : null;

        if (primaryCtx) {
            const unaryOpCtx = ctx.unary_operator ? ctx.unary_operator() : null;
            const val = this._evaluatePrimary(primaryCtx, paramMap, moduleSignals);
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
            const left  = this._evaluateExpression(exprsArr[0], paramMap, moduleSignals);
            const right = this._evaluateExpression(exprsArr[1], paramMap, moduleSignals);
            if (left === null || right === null) return null;
            return this._applyBinary(binaryOpCtx.getText(), left, right);
        }

        // Ternary: condition ? then : else (3 sub-expressions)
        if (exprsArr.length === 3) {
            const cond = this._evaluateExpression(exprsArr[0], paramMap, moduleSignals);
            if (cond === null || cond.value === null) return null;
            return cond.value
                ? this._evaluateExpression(exprsArr[1], paramMap, moduleSignals)
                : this._evaluateExpression(exprsArr[2], paramMap, moduleSignals);
        }

        return null;
    }

    // Evaluate a primary context; returns an EvalValue or null
    _evaluatePrimary(ctx: any, paramMap: any, moduleSignals?: Map<string, any>): EvalValue | null {
        if (!ctx) return null;

        // Number literal — check first to avoid false match on expression()
        const numCtx = ctx.number ? ctx.number() : null;
        if (numCtx) {
            return this._parseVerilogLiteral(numCtx.getText());
        }

        // Identifier (parameter or signal reference)
        const identCtx = ctx.identifier ? ctx.identifier() : null;
        if (identCtx) {
            const token = identCtx.SIMPLE_IDENTIFIER() || identCtx.ESCAPED_IDENTIFIER();
            if (token) {
                const name = token.getText();
                if (paramMap && paramMap.has(name)) return paramMap.get(name);
                if (moduleSignals && moduleSignals.has(name)) {
                    const sig = moduleSignals.get(name);
                    return { value: null, width: this._getSignalWidth(sig.bitWidth) };
                }
            }
            return null;
        }

        // Parenthesised expression: '(' expression ')'
        // ctx.expression() returns an array via getTypedRuleContexts;
        // only enter this branch when there is at least one expression child
        // and no identifier (which would indicate a function call).
        const innerExprs = ctx.expression ? ctx.expression() : null;
        const hasInnerExpr = Array.isArray(innerExprs) ? innerExprs.length > 0 : !!innerExprs;
        if (hasInnerExpr) {
            const singleExpr = Array.isArray(innerExprs) ? innerExprs[0] : innerExprs;
            return this._evaluateExpression(singleExpr, paramMap, moduleSignals);
        }

        return null;
    }

    _applyUnary(op: any, val: EvalValue): EvalValue | null {
        const width = this._applyUnaryWidth(op, val);
        switch (op) {
            case '+':  return { value: val.value !== null ? +val.value : null, width };
            case '-':  return { value: val.value !== null ? -val.value : null, width };
            case '!':  return { value: val.value !== null ? (val.value === 0 ? 1 : 0) : null, width };
            case '~':  return { value: val.value !== null ? ~val.value : null, width };
            // Reduction operators (&, |, ^) require bit-by-bit evaluation of multi-bit values –
            // value is skipped for constant folding, but width (always 1) is still tracked.
            case '&':  return { value: null, width };
            case '|':  return { value: null, width };
            case '^':  return { value: null, width };
            default:   return null;
        }
    }

    _applyUnaryWidth(op: string, val: EvalValue) : number | null {
        switch (op) {
            case '!':
            case '&':
            case '|':
            case '^':  return 1; // Logical and reduction operators always produce 1-bit results
        }
        return val.width; // Unary plus, minus, bitwise NOT do not change bit-width
    }

    _applyBinary(op: any, left: EvalValue, right: EvalValue): EvalValue | null {
        let value: number | null = null;
        if (left.value !== null && right.value !== null) {
            switch (op) {
                case '+':   value = left.value + right.value; break;
                case '-':   value = left.value - right.value; break;
                case '*':   value = left.value * right.value; break;
                case '/':   value = right.value !== 0 ? Math.trunc(left.value / right.value) : null; break;
                case '%':   value = right.value !== 0 ? left.value % right.value : null; break;
                case '**':  value = Math.pow(left.value, right.value); break;
                case '<<':  value = left.value << right.value; break;
                case '>>':  value = left.value >> right.value; break;
                case '<<<': value = left.value << right.value; break;
                case '>>>': value = left.value >>> right.value; break;
                case '&':   value = left.value & right.value; break;
                case '|':   value = left.value | right.value; break;
                case '^':   value = left.value ^ right.value; break;
                case '~&':  value = ~(left.value & right.value); break;
                case '~|':  value = ~(left.value | right.value); break;
                case '==':  value = left.value === right.value ? 1 : 0; break;
                case '!=':  value = left.value !== right.value ? 1 : 0; break;
                case '<':   value = left.value <  right.value ? 1 : 0; break;
                case '>':   value = left.value >  right.value ? 1 : 0; break;
                case '<=':  value = left.value <= right.value ? 1 : 0; break;
                case '>=':  value = left.value >= right.value ? 1 : 0; break;
                case '&&':  value = (left.value && right.value) ? 1 : 0; break;
                case '||':  value = (left.value || right.value) ? 1 : 0; break;
                default:    return null;
            }
        } else {
            // value cannot be computed; validate that the operator is known
            switch (op) {
                case '+': case '-': case '*': case '/': case '%': case '**':
                case '<<': case '>>': case '<<<': case '>>>':
                case '&': case '|': case '^': case '~&': case '~|':
                case '==': case '!=': case '<': case '>': case '<=': case '>=':
                case '&&': case '||': break;
                default: return null;
            }
        }
        return { value, width: this._applyBinaryWidth(op, left, right) };
    }

    _applyBinaryWidth(op: string, left: EvalValue, right: EvalValue) : number | null {
        switch (op) {
            case '==':
            case '!=':
            case '<':
            case '>':
            case '<=':
            case '>=':
            case '&&':
            case '||': return 1; // Comparison and logical operators always produce 1-bit results
        }

        if (left.width === null && right.width === null) {
            return null;
        } else if (left.width === null && right.width !== null) {
            return right.width;
        } else if (left.width !== null && right.width === null) {
            return left.width;
        }
        switch (op) {
            case '+':
            case '-': return Math.max(left.width, right.width);
            case '*': return left.width + right.width;
            case '/': return left.width; // Division can reduce bit-width but is complex to evaluate precisely
            case '%': return right.width; // because maximum value is right - 1
            case '**': return left.width * right.value; // Exponentiation can greatly increase bit-width
            case '<<':
            case '<<<': return left.width + right.value; // not precisely
            case '>>':
            case '>>>': return left.width; // not precisely
            case '&':
            case '|':
            case '^':
            case '~&':
            case '~|': return Math.max(left.width, right.width);
            default: return null; // never reach here
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

        // Detect which net identifiers have initial values (e.g., wire a = 1;)
        const idsWithInit = this._identifiersWithInitialValue(netIdsCtx, ids);

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

            // Mark as assigned if it has an initial value
            if (idsWithInit.has(netIdCtx)) {
                this.assignLvalues.push({
                    ...info,
                    moduleName: this._currentModule.name
                });
            }
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

        // Detect which register identifiers have initial values (e.g., reg a = 1;)
        const idsWithInit = this._identifiersWithInitialValue(regIdsCtx, ids);

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

            // Mark as assigned if it has an initial value
            if (idsWithInit.has(regIdCtx)) {
                this.procLvalues.push({
                    ...info,
                    moduleName: this._currentModule.name
                });
            }
        }
        return null;
    }

    // Internal integer declarations: integer i, j;
    // Treated the same as reg (stored in signal database, subject to never-assigned/never-used warnings).
    visitInteger_declaration(ctx: any) {
        if (!this._currentModule) return null;

        const intIdsCtx = ctx.list_of_register_identifiers();
        const rawIds = intIdsCtx.register_identifier();
        const ids = Array.isArray(rawIds) ? rawIds : (rawIds ? [rawIds] : []);

        // Detect which integer identifiers have initial values (e.g., integer i = 0;)
        const idsWithInit = this._identifiersWithInitialValue(intIdsCtx, ids);

        for (const intIdCtx of ids) {
            const info = this._getIdentifierInfo(intIdCtx.identifier());
            if (!info) continue;

            this.signals.push({
                name: info.name,
                uri: this.uri,
                line: info.line,
                character: info.character,
                direction: null,
                type: 'integer',
                bitWidth: '32',
                moduleName: this._currentModule.name
            });

            // Mark as assigned if it has an initial value
            if (idsWithInit.has(intIdCtx)) {
                this.procLvalues.push({
                    ...info,
                    moduleName: this._currentModule.name
                });
            }
        }
        return null;
    }

    // Helper: determine which identifier contexts in a list have initial values ('=' expr).
    // Iterates through the parent context's children to find '=' tokens following each identifier.
    _identifiersWithInitialValue(listCtx: any, idCtxs: any[]): Set<any> {
        const result = new Set<any>();
        const children = listCtx.children;
        if (!children) return result;
        let lastIdCtx: any = null;
        const idSet = new Set(idCtxs);
        for (const child of children) {
            if (idSet.has(child)) {
                lastIdCtx = child;
            } else if (lastIdCtx && typeof child.getText === 'function' && child.getText() === '=') {
                result.add(lastIdCtx);
                lastIdCtx = null;
            } else if (typeof child.getText === 'function' && child.getText() === ',') {
                lastIdCtx = null;
            }
        }
        return result;
    }

    // Genvar declarations: genvar i, j;
    visitGenvar_declaration(ctx: any) {
        if (!this._currentModule) return null;

        const rawIds = ctx.list_of_genvar_identifiers
            ? ctx.list_of_genvar_identifiers().genvar_identifier()
            : null;
        const ids = Array.isArray(rawIds) ? rawIds : (rawIds ? [rawIds] : []);

        for (const genvarIdCtx of ids) {
            const info = this._getIdentifierInfo(genvarIdCtx.identifier());
            if (!info) continue;

            // Track genvar as a named identifier so it is not flagged as undeclared
            const genvarNames = this._moduleGenvarNames.get(this._currentModule.name);
            if (genvarNames) genvarNames.add(info.name);
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
    parse(document: any, moduleDatabase: any = null, fileReader: ((resolvedPath: string) => string | null) | null = null) {
        const { errors, warnings } = this.parseSymbols(document, moduleDatabase, fileReader);
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
    parseSymbols(document: any, moduleDatabase: any = null, fileReader: ((resolvedPath: string) => string | null) | null = null) {
        this.errorListener.clearErrors();

        const rawText = document.getText();
        const uri = document.uri.toString();

        // Resolve the directory of the current file for `include path resolution.
        let basePath: string | null = null;
        try {
            const path = require('path') as typeof import('path');
            // Convert a VS Code file URI to a filesystem path.
            // file:///C:/path → C:/path  (Windows)
            // file:///home/user → /home/user  (Unix)
            let fsPath = uri;
            if (uri.startsWith('file:///')) {
                const decoded = decodeURIComponent(uri.slice('file:///'.length));
                // Windows drive letter: "C:/path" – keep as-is; Unix: "home/user" – restore leading "/"
                fsPath = /^[A-Za-z]:\//.test(decoded) ? decoded : '/' + decoded;
            } else if (uri.startsWith('file://')) {
                fsPath = decodeURIComponent(uri.slice('file://'.length));
            }
            basePath = path.dirname(fsPath);
        } catch (_) { /* path unavailable */ }

        // Preprocess: expand `define macros and `include directives, strip others.
        const text = preprocessVerilog(rawText, basePath, fileReader);

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
        const moduleTokens = visitor ? visitor.moduleTokens : [];

        return { modules, signals, instances, parameters, moduleTokens, errors: this.errorListener.getErrors(), warnings };
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
            const genvarNames = visitor._moduleGenvarNames.get(moduleName) || new Set();
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
                if (!declaredByName.has(name) && !paramNames.has(name) && !genvarNames.has(name) && !reportedUndefined.has(name)) {
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
                if (sig && (sig.type === 'reg' || sig.type === 'integer')) {
                    reportedAssignReg.add(lval.name);
                    warnings.push({
                        line: lval.line,
                        character: lval.character,
                        length: lval.name.length,
                        message: `Assign statement l-value '${lval.name}' is a ${sig.type}`,
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
                    declaredSignals.some((s: any) => s.name === conn.localSignalName && (s.type === 'reg' || s.type === 'integer'))) {
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
