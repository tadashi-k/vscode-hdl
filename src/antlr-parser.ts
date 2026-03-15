// ANTLR-based Verilog Parser
// Replaces regex-based parser with formal grammar-based parser

import type * as vsCodeModule from 'vscode';
import antlr4 from 'antlr4';
import { fileURLToPath } from 'url';
import { preprocessVerilog } from './verilog-scanner';
import { VerilogLexer } from '../antlr/generated/VerilogLexer';
import { VerilogParser } from '../antlr/generated/VerilogParser';
import { VerilogVisitor } from '../antlr/generated/VerilogVisitor';
import { Module, ModuleDatabase, Definition, Port, BitRange} from './database';

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

class Signal {
    name: string;
    //uri: string;
    line: number;
    character: number;
    direction: string;
    type: string;
    bitRange: BitRange | null;
    isMemory?: boolean;
    assigned: boolean;
    used?: boolean;
}

/**
 * ANTLR parse-tree visitor that extracts module and signal declarations.
 */
const DEFAULT_NET_TYPE = 'wire';

class VerilogSymbolVisitor extends VerilogVisitor {
    uri: string;
    modules: Module[];
    errors: any[];
    warnings: any[];
    allModuleRefs: Set<string>;    // all referenced modules
    _moduleDatabase: ModuleDatabase;
    _currentModule: Module | null;
    // Per-current-module signal reference tracking (reset at each module entry)
    _params: Map<string, EvalValue>; // paramName -> EvalValue (for cross-param evaluation)
    _genvars: Set<string>;           // genvar names
    _signalMap: Map<string, Signal>; // signalName -> signal for current module
    // Accumulated across all modules (available after parse completes)
    _inProcedural: boolean;
    _inContinuousAssign: boolean;
    _currentParamKind: any;

    /**
     * @param uri uri of the parsed document (for error reporting and module database entries)
     * @param modules module database to get module definition for instantiations
     */
    constructor(uri: string, modules: ModuleDatabase) {
        super();
        this.uri = uri;
        this.errors = [];
        this.warnings = [];
        this.allModuleRefs = new Set();
        this._moduleDatabase = modules;
        this._currentModule = null;
        this._params = new Map();
        this._genvars = new Set();
        this._signalMap = new Map();
        this._inProcedural = false;
        this._inContinuousAssign = false;
    }

    _markSignalUsed(name: any, line: any, character: any) {
        if (!this._currentModule) return;

        const signal = this._signalMap.get(name);
        if (signal) {
            signal.used = true; // Mark signal as used for "declared but not used" warnings
        }

        if (this._signalMap.has(name) == false && this._params.has(name) == false && this._genvars.has(name) == false) {
            // Warning 1: signal reference without declaration
            this.warnings.push({
                line: line,
                character: character,
                length: name.length,
                message: `Signal '${name}' is used but not declared`,
                severity: vscode.DiagnosticSeverity.Warning
            });
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

    _getRange(rangeCtx: any) : BitRange | null {
        if (!rangeCtx) {
            return null;
        }

        const ceContexts = rangeCtx.constant_expression ? rangeCtx.constant_expression() : null;
        if (!Array.isArray(ceContexts) || ceContexts.length < 2) {
            return null;
        }
        const hi = this._evaluateConstantExpression(ceContexts[0], this._params);
        const lo = this._evaluateConstantExpression(ceContexts[1], this._params);

        const bitRange = new BitRange(hi.value, lo.value);
        if (!bitRange.msb || !bitRange.lsb) {
            bitRange.exprMsb = ceContexts[0].getText();
            bitRange.exprLsb = ceContexts[1].getText();
        }
        return bitRange;
    }

    // Normalises a raw ANTLR rule-context result to a (possibly empty) array.
    // ANTLR returns a single context for exactly one match and an array for multiple.
    _toArray(raw: any) {
        if (!raw) return [];
        return Array.isArray(raw) ? raw : [raw];
    }

    // Build a Definition object for a port signal.
    // Description format: "{direction} {type} {bitRange} {name}" with empty parts omitted.
    _makePortDefinition(signal: Signal): Definition {
        const parts = [signal.direction];
        if (signal.type && signal.type !== DEFAULT_NET_TYPE) parts.push(signal.type);
        if (signal.bitRange) {
            parts.push(signal.bitRange.toString());
        }
        parts.push(signal.name);
        return new Definition(signal.name, signal.line, signal.character, signal.type, parts.join(' '));
    }

    visitSource_text(ctx: any) {
        this.visitChildren(ctx);
        return null;
    }

    visitModule_declaration(ctx: any) {
        const info = this._getIdentifierInfo(ctx.module_identifier().identifier());
        if (!info) return null;

        const endLine = ctx.stop ? ctx.stop.line - 1 : info.line;
        this._currentModule = new Module(info.name, this.uri, info.line, info.character, endLine, true);

        // Reset per-module tracking for signal warnings
        this._params = new Map();
        this._genvars= new Set<string>();
        this._signalMap = new Map();

        this.visitChildren(ctx);

        this._generateWarnings();
        // Accumulate this module's instances into the cross-module list
        this._moduleDatabase.addModule(this._currentModule);
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

    private _warningOutputConnection(moduleName: string, info: any, port: any) {
        this.warnings.push({
            line: info.line,
            character: info.character,
            length: info.name.length,
            message: `${port.direction} port '${port.name}' of instantiated module cannot be connected to reg signal '${info.name}'`,
            severity: vscode.DiagnosticSeverity.Warning
        });
    }

    private _evaluatePortConnectionWidth(instance: any) {
        const module = this._moduleDatabase.getModule(instance.moduleName);
        if (!module) {
            return;
        }

        const portConnections = instance.portConnections;
        for (const conn of portConnections) {
            const instPort = module.getPort(conn.portName);
            if (!instPort) continue;

            // Evaluate port width with parameter overrides if available
            let portWidth: number | null = null;
            if (instance.parameterOverrides && instPort.bitRange) {
                portWidth = this.evaluatePortWidth(instPort, module.parameterList, instance.parameterOverrides);
            }
            if (portWidth === null) {
                portWidth = this._getSignalWidth(instPort.bitRange);
            }

            // Evaluate the actual expression bit width (handles part-selects like signal[7:0])
            let localWidth: number | null = null;
            if (conn.exprCtx) {
                const exprVal = this._evaluateExpression(conn.exprCtx, this._params, this._signalMap);
                if (exprVal && exprVal.width !== null) {
                    localWidth = exprVal.width;
                }
            }
            // Fall back to the declared signal width when expression evaluation fails
            if (localWidth === null) {
                const localSig = this._signalMap.get(conn.localSignalName);
                if (!localSig) continue;
                localWidth = this._getSignalWidth(localSig.bitRange);
            }
            if (localWidth !== portWidth) {
                // Warning 12: bit width mismatch between connected signal and instantiated module port
                // Build a lookup of connection position -> instance for parameter override access
                this.warnings.push({
                    line: conn.line,
                    character: conn.character,
                    length: conn.localSignalName.length,
                    message: `Port '${conn.portName}' has width ${portWidth}, but connected signal '${conn.localSignalName}' has width ${localWidth}`,
                    severity: vscode.DiagnosticSeverity.Warning
                });
            }
        }
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
            // (position info stored implicitly via Instance fields)

            // Collect named port connections for each instance
            const moduleInstances = this._toArray(ctx.module_instance ? ctx.module_instance() : null);

            // Visit parameter_value_assignment expressions so identifiers inside
            // #(.PARAM(expr)) or #(expr) are tracked for undeclared checks.
            // Named parameter names (parameter_identifier) are NOT primary nodes,
            // so they will not be added to signal refs.
            const paramValAssign = ctx.parameter_value_assignment ? ctx.parameter_value_assignment() : null;
            let overrides: Record<string, any> | null = null;
            if (paramValAssign) {
                this.visit(paramValAssign);

                // Extract named parameter overrides: #(.WIDTH(16), .DEPTH(32))
                const namedParamAssigns = this._toArray(
                    paramValAssign.named_parameter_assignment
                        ? paramValAssign.named_parameter_assignment()
                        : null
                );
                overrides = {};
                if (namedParamAssigns.length > 0) {
                    for (const npa of namedParamAssigns) {
                        const paramIdCtx = npa.parameter_identifier ? npa.parameter_identifier() : null;
                        if (!paramIdCtx) continue;
                        const paramInfo = this._getIdentifierInfo(paramIdCtx.identifier());
                        if (!paramInfo) continue;
                        const exprCtx = npa.expression ? npa.expression() : null;
                        if (!exprCtx) continue;
                        const evalResult = this._evaluateExpression(exprCtx, this._params, this._signalMap);
                        if (evalResult && evalResult.value !== null && evalResult.value !== undefined) {
                            overrides[paramInfo.name] = evalResult.value;
                        }
                    }
                }
            }

            const module = this._moduleDatabase.getModule(instModuleName);
            if (!module) {
                // Warning 9: module name of instantiation not found in module database
                this.warnings.push({
                    line: instModInfo.line,
                    character: instModInfo.character,
                    length: instModInfo.name.length,
                    message: `Module '${instModuleName}' is not defined`,
                    severity: vscode.DiagnosticSeverity.Warning
                });
            }

            for (const inst of moduleInstances) {
                // Get instance name from name_of_instance
                const nameOfInstCtx = inst.name_of_instance ? inst.name_of_instance() : null;
                const instNameInfo = nameOfInstCtx
                    ? this._getIdentifierInfo(nameOfInstCtx.identifier())
                    : null;

                // Track instance name for hdlModule semantic token
                // (position info stored on the instance object itself)

                const portConnections: any[] = [];
                const namedPortNames: string[] = [];

                const portConnsCtx = inst.list_of_port_connections
                    ? inst.list_of_port_connections()
                    : null;

                if (portConnsCtx) {
                    // Handle ordered (positional) port connections: visit their
                    // expressions so identifiers are tracked for undeclared checks.
                    const orderedConns = this._toArray(
                        portConnsCtx.ordered_port_connection
                            ? portConnsCtx.ordered_port_connection()
                            : null
                    );
                    for (const opc of orderedConns) {
                        const opcExpr = opc.expression ? opc.expression() : null;
                        if (opcExpr) {
                            this.visit(opcExpr);
                        }
                    }

                    const namedConns = this._toArray(
                        portConnsCtx.named_port_connection
                            ? portConnsCtx.named_port_connection()
                            : null
                    );


                    // Track all named port names (including empty connections like .reset())

                    for (const conn of namedConns) {
                        const portIdCtx = conn.port_identifier ? conn.port_identifier() : null;
                        if (!portIdCtx) continue;
                        const portInfo = this._getIdentifierInfo(portIdCtx.identifier());
                        if (!portInfo) continue;

                        namedPortNames.push(portInfo.name);

                        const exprCtx = conn.expression ? conn.expression() : null;
                        const localSignalInfo = this._getPrimaryIdentifier(exprCtx);
                        if (localSignalInfo) {
                            const signal = this._signalMap.get(localSignalInfo.name);
                            const port = module?.ports.find((p: any) => p.name === portInfo.name);
                            if (signal && port && signal.type === 'reg' && port.direction === 'output') {
                                this._warningOutputConnection(module.name, localSignalInfo, port);
                            }
                            if (port && port.direction !== 'output') {
                                this._markSignalUsed(localSignalInfo.name, localSignalInfo.line, localSignalInfo.character);
                            }
                            if (signal && port && port.direction === 'output') {
                                signal.assigned = true; // Mark signal as assigned for "declared but not used" warnings
                            }

                            portConnections.push({
                                instModuleName,
                                portName: portInfo.name,
                                localSignalName: localSignalInfo.name,
                                line: localSignalInfo.line,
                                character: localSignalInfo.character,
                                exprCtx
                            });
                        } else if (exprCtx) {
                            // Check for concatenation: .port({sig_a, sig_b})
                            // Each identifier in the concat must be tracked for undeclared-identifier
                            // checking, but for width comparison we use the full concatenation width.
                            const _exprPrimary = exprCtx.primary ? exprCtx.primary() : null;
                            const _concatCtx = _exprPrimary?.concatenation ? _exprPrimary.concatenation() : null;
                            const concatIdents = _concatCtx ? this._getConcatenationIdentifiers(_concatCtx) : null;
                            if (concatIdents && concatIdents.length > 0) {
                                const port = module?.ports.find((p: any) => p.name === portInfo.name);
                                for (const localSignalInfo of concatIdents) {
                                    const signal = this._signalMap.get(localSignalInfo.name);
                                    if (signal && port && signal.type === 'reg' && port.direction === 'output') {
                                        this._warningOutputConnection(module.name, localSignalInfo, port);
                                    }
                                    if (port && port.direction !== 'output') {
                                        this._markSignalUsed(localSignalInfo.name, localSignalInfo.line, localSignalInfo.character);
                                    }
                                    if (signal && port && port.direction === 'output') {
                                        signal.assigned = true; // Mark signal as assigned for "declared but not used" warnings
                                    }
                                }
                                // For width comparison, push ONE entry for the full concatenation
                                // so the combined width (sum of all member widths) is compared
                                // against the port width instead of each member individually.
                                // concatMembers stores the individual signal names so that
                                portConnections.push({
                                    instModuleName,
                                    portName: portInfo.name,
                                    localSignalName: exprCtx.getText(),
                                    line: concatIdents[0].line,
                                    character: concatIdents[0].character,
                                    exprCtx,
                                    concatMembers: concatIdents.map((id: any) => id.name)
                                });
                            } else {
                                // Complex expression (not a simple identifier or concatenation): visitexi
                                // it so its identifiers are tracked as r-value refs in _moduleSignalRefs.
                                this.visit(exprCtx);
                            }
                        }
                    }
                }

                this._evaluatePortConnectionWidth({
                    moduleName: instModuleName,
                    instanceName: instNameInfo ? instNameInfo.name : null,
                    line: instNameInfo ? instNameInfo.line : instModInfo.line,
                    character: instNameInfo ? instNameInfo.character : instModInfo.character,
                    moduleNameLine: instModInfo.line,
                    moduleNameCharacter: instModInfo.character,
                    portConnections,
                    namedPortNames,
                    parentModuleName: this._currentModule.name,
                    parameterOverrides: overrides
                });
                this.allModuleRefs.add(instModuleName);

                const ports = this._moduleDatabase.getModule(instModuleName)?.ports;
                if (ports) {
                    const missingPorts: string[] = [];
                    for (const port of ports) {
                        if (!namedPortNames.includes(port.name)) {
                            missingPorts.push(port.name);
                        }
                    }
                    if (missingPorts.length > 0) {
                        const message = missingPorts.map(p => `'${p}' unconnected`).join('\n');
                        // Warning 8: missing port in named port connection
                        this.warnings.push({
                            line: instModInfo.line,
                            character: instModInfo.character,
                            length: instModInfo.name.length,
                            message,
                            severity: vscode.DiagnosticSeverity.Warning
                        });
                    }
                }
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

    private _warningProceduralAssignments(lvalInfo: any, signal: any) {
        // Warning 4: procedural (always/initial) l-value is a wire
        this.warnings.push({
            line: lvalInfo.line,
            character: lvalInfo.character,
            length: lvalInfo.name.length,
            message: `Procedural assignment l-value '${signal.name}' is a wire`,
            severity: vscode.DiagnosticSeverity.Warning
        });
    }

    private _warningInputAssignments(lvalInfo: any, signal: any) {
        // Warning 5: input signal used as l-value in assign or procedural block
        this.warnings.push({
            line: lvalInfo.line,
            character: lvalInfo.character,
            length: lvalInfo.name.length,
            message: `Input signal '${signal}' cannot be used as l-value`,
            severity: vscode.DiagnosticSeverity.Warning
        });
    }

    // Capture lvalue of continuous assign (assignment rule) or FOR loop (in procedural)
    visitAssignment(ctx: any) {
        if (!this._currentModule) return null;
        const lvalIdentifiers = this._getLvalueIdentifiers(ctx.lvalue());
        for (const lvalInfo of lvalIdentifiers) {
            const signal = this._signalMap.get(lvalInfo.name);
            if (signal && (signal.type === 'reg' || signal.type === 'integer')) {
                // Warning 3: continuous assign statement l-value is a reg
                this.warnings.push({
                    line: lvalInfo.line,
                    character: lvalInfo.character,
                    length: lvalInfo.name.length,
                    message: `Assign statement l-value '${signal.name}' is a ${signal.type}`,
                    severity: vscode.DiagnosticSeverity.Warning
                });
            }
            if (signal && signal.direction === 'input') {
                this._warningInputAssignments(lvalInfo, signal.name);
            }
            if (signal) {
                signal.assigned = true; // Mark signal as assigned for "declared but not used" warnings
            }
        }
        // Evaluate r-value expression
        const exprCtx = ctx.expression ? ctx.expression() : null;
        if (exprCtx) {
            this._evaluateExpression(exprCtx, this._params, this._signalMap);
            // Check bit width mismatch
            this._checkWidthMismatch(ctx.lvalue(), exprCtx, this._params, this._signalMap);
        }
        this.visitChildren(ctx);
        return null;
    }

    // Capture lvalue of blocking assignment (always/initial body)
    visitBlocking_assignment(ctx: any) {
        if (!this._currentModule) return null;
        const lvalIdentifiers = this._getLvalueIdentifiers(ctx.lvalue());
        for (const lvalInfo of lvalIdentifiers) {
            const signal = this._signalMap.get(lvalInfo.name);
            if (signal && signal.type === 'wire') {
                this._warningProceduralAssignments(lvalInfo, signal);
            }
            if (signal && signal.direction === 'input') {
                this._warningInputAssignments(lvalInfo, signal.name);
            }
            if (signal) {
                signal.assigned = true; // Mark signal as assigned for "declared but not used" warnings
            }
        }
        // Evaluate r-value expression
        const exprCtx = ctx.expression ? ctx.expression() : null;
        if (exprCtx) {
            this._evaluateExpression(exprCtx, this._params, this._signalMap);
            // Check bit width mismatch
            this._checkWidthMismatch(ctx.lvalue(), exprCtx, this._params, this._signalMap);
        }
        this.visitChildren(ctx);
        return null;
    }

    // Capture lvalue of non-blocking assignment (always/initial body)
    visitNon_blocking_assignment(ctx: any) {
        if (!this._currentModule) return null;
        const lvalIdentifiers = this._getLvalueIdentifiers(ctx.lvalue());
        for (const lvalInfo of lvalIdentifiers) {
            const signal = this._signalMap.get(lvalInfo.name);
            if (signal && signal.type === 'wire') {
                this._warningProceduralAssignments(lvalInfo, signal);
            }
            if (signal && signal.direction === 'input') {
                this._warningInputAssignments(lvalInfo, signal.name);
            }
            if (signal) {
                signal.assigned = true; // Mark signal as assigned for "declared but not used" warnings
            }
        }
        // Evaluate r-value expression and check bit width mismatch
        const exprCtx = ctx.expression ? ctx.expression() : null;
        if (exprCtx) {
            this._evaluateExpression(exprCtx, this._params, this._signalMap);
            this._checkWidthMismatch(ctx.lvalue(), exprCtx, this._params, this._signalMap);
        }
        this.visitChildren(ctx);
        return null;
    }

    // Evaluate the case condition expression and visit children
    visitCase_statement(ctx: any) {
        if (!this._currentModule) return null;
        const exprCtx = ctx.expression ? ctx.expression() : null;
        if (exprCtx) {
            this._evaluateExpression(exprCtx, this._params, this._signalMap);
        }
        this.visitChildren(ctx);
        return null;
    }

    // Evaluate loop condition/bound expressions and visit children
    visitLoop_statement(ctx: any) {
        if (!this._currentModule) return null;
        const exprs = ctx.expression ? ctx.expression() : null;
        if (exprs) {
            const exprsArr = Array.isArray(exprs) ? exprs : [exprs];
            // For WHILE and FOR loops the single expression is the boolean condition.
            // REPEAT uses its expression as a count (not a boolean), so skip width check.
            // FOREVER has no expression at all, so exprs will already be null/empty.
            const isCondLoop = !!(ctx.WHILE ? ctx.WHILE() : null) || !!(ctx.FOR ? ctx.FOR() : null);
            for (const exprCtx of exprsArr) {
                const exprVal = this._evaluateExpression(exprCtx, this._params, this._signalMap);
                if (isCondLoop && exprVal && exprVal.width !== null && exprVal.width > 1) {
                    const start = exprCtx.start;
                    // Warning 11: condition expression in if/while/for has width > 1 bit
                    this.warnings.push({
                        line: start ? start.line - 1 : 0,
                        character: start ? start.column : 0,
                        length: exprCtx.getText().length,
                        message: `Condition expression '${exprCtx.getText()}' has width ${exprVal.width} bits; condition should be 1-bit`,
                        severity: vscode.DiagnosticSeverity.Warning
                    });
                }
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
            const exprVal = this._evaluateExpression(exprCtx, this._params, this._signalMap);
            if (exprVal && exprVal.width !== null && exprVal.width > 1) {
                const start = exprCtx.start;
                // Warning 11: condition expression in if/while/for has width > 1 bit
                this.warnings.push({
                    line: start ? start.line - 1 : 0,
                    character: start ? start.column : 0,
                    length: exprCtx.getText().length,
                    message: `Condition expression '${exprCtx.getText()}' has width ${exprVal.width} bits; condition should be 1-bit`,
                    severity: vscode.DiagnosticSeverity.Warning
                });
            }
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
                    this._markSignalUsed(info.name, info.line, info.character);
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
                    // Evaluate the constant_expression for the parameter database
                    const ceCtx = ctx.constant_expression ? ctx.constant_expression() : null;
                    const exprText = ceCtx ? ceCtx.getText() : null;
                    const evalResult = ceCtx ? this._evaluateConstantExpression(ceCtx, this._params) : null;
                    const value = evalResult !== null ? evalResult.value : null;

                    // The kind ('parameter' or 'localparam') is set by the calling context;
                    // default here is 'parameter' and visitLocal_parameter_declaration overrides it.
                    const param = {
                        name: info.name,
                        line: info.line,
                        character: info.character,
                        bitRange: new BitRange(31, 0),
                        exprText,
                        value,
                    };
                    this._currentModule.parameterList.push(param);
                    // Store EvalValue for subsequent parameters in the same module
                    if (evalResult !== null && evalResult !== undefined) {
                        this._params.set(info.name, evalResult);
                    }
                    // Create a Definition for hover and goto-definition
                    const kind = this._currentParamKind || 'parameter';
                    const descValue = value !== null ? String(value) : exprText;
                    const paramDesc = descValue ? `${kind} ${info.name} = ${descValue}` : `${kind} ${info.name}`;
                    this._currentModule.addDefinition(new Definition(info.name, info.line, info.character, kind, paramDesc));
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
        let exprCtxToUse = exprCtx;
        
        if (Array.isArray(exprCtx)) {
            // expression() returns an array via getTypedRuleContexts; pick the first
            exprCtxToUse = exprCtx.length > 0 ? exprCtx[0] : null;
        }
        
        if (!exprCtxToUse) return null;
        
        // Get the text of the expression
        const exprText = exprCtxToUse.getText();
        
        // If the expression contains ternary operators, use text-based parser
        // which handles right-associativity correctly
        if (exprText && exprText.includes('?') && exprText.includes(':')) {
            // Try text-based parsing first for ternary expressions
            const simpleVal = this._evalSimpleExpr(exprText, paramMap);
            if (simpleVal !== null) {
                return { value: simpleVal, width: null };
            }
        }
        
        // Fall back to ANTLR tree-based evaluation
        return this._evaluateExpression(exprCtxToUse, paramMap);
    }

    // Helper: extract the numeric bit-width from a bitRange
    _getSignalWidth(bitRange: BitRange| null): number {
        if (!bitRange || bitRange.msb === null || bitRange.lsb === null) {
            return null;
        }
        return bitRange.msb - bitRange.lsb + 1;
    }

    // Evaluate a simple expression string using a parameter map.
    // Used as a fallback text-based evaluator for ternary and other expressions.
    // @param exprText  Expression text (e.g. "WIDTH-1", "(1<<8)-1")
    // @param paramMap  Map of parameter name -> EvalValue
    _evalSimpleExpr(exprText: string, paramMap: any): number | null {
        if (!exprText) return null;
        let text = exprText.trim();
        // Replace parameter names with their numeric values
        if (paramMap) {
            // Iterate params from longest name to shortest to avoid partial replacement
            const names: string[] = [];
            if (paramMap instanceof Map) {
                for (const [k] of paramMap) names.push(String(k));
            } else {
                names.push(...Object.keys(paramMap));
            }
            names.sort((a, b) => b.length - a.length);
            for (const name of names) {
                const evalValue = paramMap instanceof Map ? paramMap.get(name) : paramMap[name];
                const val = evalValue && typeof evalValue === 'object' ? evalValue.value : evalValue;
                if (val !== null && val !== undefined && typeof val === 'number') {
                    text = text.replace(new RegExp(`\\b${name}\\b`, 'g'), String(val));
                }
            }
        }
        // Remove any remaining identifiers (unresolved params) – bail out
        if (/[a-zA-Z_]/.test(text)) return null;
        try {
            // eslint-disable-next-line no-new-func
            const result = Function('"use strict"; return (' + text + ')')();
            if (typeof result === 'number' && isFinite(result)) {
                return Math.trunc(result);
            }
        } catch {
            // ignore evaluation errors
        }
        return null;
    }

    // Evaluate the bit-width of a port given instance-level parameter overrides.
    // @param port      Port object with bitRange
    // @param params    Default parameter list of the instantiated module
    // @param overrides Instance-level parameter overrides (e.g. { WIDTH: 16 })
    evaluatePortWidth(port: Port, params: any[], overrides: any): number | null {
        if (!port.bitRange) {
            return 1;
        }

        // Build param map: defaults from params, then overrides
        const paramMap = new Map<string, any>();
        if (Array.isArray(params)) {
            for (const p of params) {
                if (p.name && p.value !== null && p.value !== undefined) {
                    paramMap.set(p.name, { value: p.value, width: null });
                }
            }
        }
        if (overrides && typeof overrides === 'object') {
            for (const [name, value] of Object.entries(overrides)) {
                paramMap.set(name, { value, width: null });
            }
        }
        // Re-evaluate derived parameters in declaration order so that parameters
        // whose values depend on overridden parameters are recomputed correctly.
        // (e.g. ADR_WIDTH = f(DEPTH) must be recomputed when DEPTH is overridden)
        if (Array.isArray(params) && overrides && typeof overrides === 'object') {
            for (const p of params) {
                if (p.exprText && p.name && !(p.name in overrides)) {
                    const reeval = this._evalSimpleExpr(p.exprText, paramMap);
                    if (reeval !== null) {
                        paramMap.set(p.name, { value: reeval, width: null });
                    }
                }
            }
        }

        const msb = this._evalSimpleExpr(port.bitRange.exprMsb, paramMap);
        const lsb = this._evalSimpleExpr(port.bitRange.exprLsb, paramMap);
        if (msb !== null && lsb !== null) {
            return msb - lsb + 1;
        }
        return null;
    }

    // Compute the bit width of an lvalue context.
    // Returns the width as a number, or null if it cannot be determined.
    _getLvalueWidth(lvalCtx: any, moduleParams: any, moduleSignals: Map<string, Signal>): number | null {
        if (!lvalCtx) return null;

        // Concatenation lvalue: width is the sum of each element's expression width
        const concatCtx = lvalCtx.concatenation ? lvalCtx.concatenation() : null;
        if (concatCtx) {
            const expressions = concatCtx.expression ? concatCtx.expression() : null;
            const exprArr = Array.isArray(expressions) ? expressions : (expressions ? [expressions] : []);
            let totalWidth = 0;
            for (const exprCtx of exprArr) {
                const ev = this._evaluateExpression(exprCtx, moduleParams, moduleSignals);
                if (!ev || ev.width === null) return null;
                totalWidth += ev.width;
            }
            return totalWidth > 0 ? totalWidth : null;
        }

        // Identifier-based lvalue
        const identCtx = lvalCtx.identifier ? lvalCtx.identifier() : null;
        if (!identCtx) return null;

        const token = identCtx.SIMPLE_IDENTIFIER() || identCtx.ESCAPED_IDENTIFIER();
        if (!token) return null;
        const name = token.getText();

        // range_expression alternative: identifier '[' range_expression ']'
        const rangeExprCtx = lvalCtx.range_expression ? lvalCtx.range_expression() : null;
        if (rangeExprCtx) {
            const rangeExprs = rangeExprCtx.expression ? rangeExprCtx.expression() : null;
            const rangeArr = Array.isArray(rangeExprs) ? rangeExprs : (rangeExprs ? [rangeExprs] : []);
            if (rangeArr.length === 2) {
                const rangeText = rangeExprCtx.getText();
                if (rangeText.includes('+:') || rangeText.includes('-:')) {
                    // indexed part select: [base +: width] or [base -: width]
                    const widthVal = this._evaluateExpression(rangeArr[1], moduleParams, moduleSignals);
                    return widthVal && widthVal.value !== null ? widthVal.value : null;
                }
                // simple range: [high : low]
                const hi = this._evaluateExpression(rangeArr[0], moduleParams, moduleSignals);
                const lo = this._evaluateExpression(rangeArr[1], moduleParams, moduleSignals);
                if (hi && hi.value !== null && lo && lo.value !== null) {
                    return Math.abs(hi.value - lo.value) + 1;
                }
            }
            return null;
        }

        // expression-based alternatives: identifier '[' expression ']' ...
        const exprChildren = lvalCtx.expression ? lvalCtx.expression() : null;
        const exprArr = Array.isArray(exprChildren) ? exprChildren : (exprChildren ? [exprChildren] : []);
        if (exprArr.length === 0) {
            // Simple identifier with no range: use declared signal width (default 1 for scalars)
            const sig = moduleSignals.get(name);
            if (!sig) return null;
            return this._getSignalWidth(sig.bitRange);
        }
        if (exprArr.length === 1) {
            // Memory array access: identifier[addr] → element width (not a bit select)
            const sig = moduleSignals.get(name);
            if (sig && sig.isMemory) {
                return this._getSignalWidth(sig.bitRange);
            }
            // Single bit select: identifier[expr] → width is 1
            return 1;
        }
        if (exprArr.length >= 2) {
            // Part select, e.g.: identifier[expr][high:low] or identifier[expr][base +: width]
            const fullText = lvalCtx.getText();
            if (fullText.includes('+:') || fullText.includes('-:')) {
                const widthVal = this._evaluateExpression(exprArr[exprArr.length - 1], moduleParams, moduleSignals);
                return widthVal && widthVal.value !== null ? widthVal.value : null;
            }
            if (exprArr.length === 3) {
                // identifier[expr][high:low]
                const hi = this._evaluateExpression(exprArr[1], moduleParams, moduleSignals);
                const lo = this._evaluateExpression(exprArr[2], moduleParams, moduleSignals);
                if (hi && hi.value !== null && lo && lo.value !== null) {
                    return Math.abs(hi.value - lo.value) + 1;
                }
            }
            return null;
        }
        return null;
    }

    // Check bit width mismatch between lvalue and expression, and record if mismatched.
    _checkWidthMismatch(lvalCtx: any, exprCtx: any, moduleParams: any, moduleSignals: Map<string, any>) {
        if (!lvalCtx || !exprCtx || !this._currentModule) return;
        const lvalWidth = this._getLvalueWidth(lvalCtx, moduleParams, moduleSignals);
        if (lvalWidth === null) return;
        const exprVal = this._evaluateExpression(exprCtx, moduleParams, moduleSignals);
        if (!exprVal || exprVal.width === null) return;
        if (lvalWidth !== exprVal.width) {
            // Get position from lvalue identifier
            const identCtx = lvalCtx.identifier ? lvalCtx.identifier() : null;
            let line = 0, character = 0, length = 1;
            if (identCtx) {
                const token = identCtx.SIMPLE_IDENTIFIER() || identCtx.ESCAPED_IDENTIFIER();
                if (token) {
                    line = token.symbol.line - 1;
                    character = token.symbol.column;
                    length = lvalCtx.getText().length;
                }
            } else {
                // Concatenation: use the lvalue start token position
                if (lvalCtx.start) {
                    line = lvalCtx.start.line - 1;
                    character = lvalCtx.start.column;
                }
                length = lvalCtx.getText().length;
            }
            // Warning 10: bit width mismatch between lvalue and expression
            this.warnings.push({
                line: line,
                character: character,
                length: length,
                message: `Bit width mismatch: '${lvalCtx.getText()}' has width ${lvalWidth}, but expression has width ${exprVal.width}`,
                severity: vscode.DiagnosticSeverity.Warning
            });
        }
    }

    // Recursively evaluate an expression context; returns an EvalValue or null
    _evaluateExpression(ctx: any, paramMap: any, moduleSignals?: Map<string, Signal>): EvalValue | null {
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

        // Ternary: condition ? then : else
        if (exprsArr.length >= 3) {
            const cond = this._evaluateExpression(exprsArr[0], paramMap, moduleSignals);
            if (cond === null || cond.value === null) return null;
            
            if (cond.value) {
                return this._evaluateExpression(exprsArr[1], paramMap, moduleSignals);
            } else {
                if (exprsArr.length === 3) {
                    return this._evaluateExpression(exprsArr[2], paramMap, moduleSignals);
                }
                
                // More than 3 expressions - create synthetic context for remaining
                const syntheticCtx = { expression: () => exprsArr.slice(2) };
                return this._evaluateExpression(syntheticCtx, paramMap, moduleSignals);
            }
        }

        return null;
    }

    // Evaluate a primary context; returns an EvalValue or null
    _evaluatePrimary(ctx: any, paramMap: any, moduleSignals?: Map<string, Signal>): EvalValue | null {
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

                    // Check for range_expression: identifier '[' range_expression ']'
                    const rangeExprCtx = ctx.range_expression ? ctx.range_expression() : null;
                    if (rangeExprCtx) {
                        const rangeExprs = rangeExprCtx.expression ? rangeExprCtx.expression() : null;
                        const rangeArr = Array.isArray(rangeExprs) ? rangeExprs : (rangeExprs ? [rangeExprs] : []);
                        if (rangeArr.length === 2) {
                            const rangeText = rangeExprCtx.getText();
                            if (rangeText.includes('+:') || rangeText.includes('-:')) {
                                const widthVal = this._evaluateExpression(rangeArr[1], paramMap, moduleSignals);
                                return { value: null, width: widthVal && widthVal.value !== null ? widthVal.value : null };
                            }
                            const hi = this._evaluateExpression(rangeArr[0], paramMap, moduleSignals);
                            const lo = this._evaluateExpression(rangeArr[1], paramMap, moduleSignals);
                            if (hi && hi.value !== null && lo && lo.value !== null) {
                                return { value: null, width: Math.abs(hi.value - lo.value) + 1 };
                            }
                        }
                        return null;
                    }

                    // Check for bit/part select: identifier '[' expression ']' ...
                    const exprChildren = ctx.expression ? ctx.expression() : null;
                    const exprArr = Array.isArray(exprChildren) ? exprChildren : (exprChildren ? [exprChildren] : []);
                    if (exprArr.length === 1) {
                        // Memory array access: identifier[addr] → element width (not a bit select)
                        if (sig.isMemory) {
                            const w = this._getSignalWidth(sig.bitRange);
                            return { value: null, width: w};
                        }
                        // Single bit select: identifier[expr] → width is 1
                        return { value: null, width: 1 };
                    }
                    if (exprArr.length >= 2) {
                        const fullText = ctx.getText();
                        if (fullText.includes('+:') || fullText.includes('-:')) {
                            const widthVal = this._evaluateExpression(exprArr[exprArr.length - 1], paramMap, moduleSignals);
                            return { value: null, width: widthVal && widthVal.value !== null ? widthVal.value : null };
                        }
                        if (exprArr.length === 3) {
                            const hi = this._evaluateExpression(exprArr[1], paramMap, moduleSignals);
                            const lo = this._evaluateExpression(exprArr[2], paramMap, moduleSignals);
                            if (hi && hi.value !== null && lo && lo.value !== null) {
                                return { value: null, width: Math.abs(hi.value - lo.value) + 1 };
                            }
                        }
                        return null;
                    }

                    // Plain identifier: use declared signal width (default 1 for scalars)
                    const w = this._getSignalWidth(sig.bitRange);
                    return { value: null, width: w};
                }
            }
            return null;
        }

        // Concatenation: '{' expression (',' expression)* '}'
        const concatCtx = ctx.concatenation ? ctx.concatenation() : null;
        if (concatCtx) {
            const expressions = concatCtx.expression ? concatCtx.expression() : null;
            const exprArr = Array.isArray(expressions) ? expressions : (expressions ? [expressions] : []);
            let totalWidth = 0;
            for (const exprCtx of exprArr) {
                const ev = this._evaluateExpression(exprCtx, paramMap, moduleSignals);
                if (!ev || ev.width === null) return null;
                totalWidth += ev.width;
            }
            return { value: null, width: totalWidth > 0 ? totalWidth : null };
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
        const bitRange = this._getRange(ctx.range());

        const info = this._getIdentifierInfo(ctx.port_identifier().identifier());
        if (!info) return null;

        const signal: Signal = {
            name: info.name,
            line: info.line,
            character: info.character,
            direction,
            type,
            bitRange,
            assigned: direction === 'output' ? false : true, // inputs and inouts are treated assigned
        };

        this._currentModule.addPort(signal);
        this._signalMap.set(signal.name, signal);
        this._currentModule.addDefinition(this._makePortDefinition(signal));
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
        const bitRange = this._getRange(ctx.range());

        const portIdsCtx = ctx.list_of_port_identifiers();
        const rawIds = portIdsCtx.port_identifier();
        const ids = Array.isArray(rawIds) ? rawIds : (rawIds ? [rawIds] : []);

        for (const portIdCtx of ids) {
            const info = this._getIdentifierInfo(portIdCtx.identifier());
            if (!info) continue;

            const signal: Signal = {
                name: info.name,
                line: info.line,
                character: info.character,
                direction,
                type,
                bitRange,
                assigned: direction === 'output' ? false : true, // inputs and inouts are treated assigned
            };

            this._currentModule.addPort(signal);
            this._signalMap.set(signal.name, signal);
            this._currentModule.addDefinition(this._makePortDefinition(signal));
        }
    }

    // Internal wire/net declarations: wire [7:0] data;
    visitNet_declaration(ctx: any) {
        if (!this._currentModule) return null;

        const type = ctx.net_type().getText();
        const bitRange = this._getRange(ctx.range());

        const netIdsCtx = ctx.list_of_net_identifiers();
        const rawIds = netIdsCtx.net_identifier();
        const ids = Array.isArray(rawIds) ? rawIds : (rawIds ? [rawIds] : []);

        // Detect which net identifiers have initial values (e.g., wire a = 1;)
        const idsWithInit = this._identifiersWithInitialValue(netIdsCtx, ids);

        for (const netIdCtx of ids) {
            const info = this._getIdentifierInfo(netIdCtx.identifier());
            if (!info) continue;

            // Detect array wire: wire [W:0] arr [0:N-1] — the identifier has a range
            // (array dimension) in the list_of_net_identifiers context.
            const isMemory = this._registerIdentifierHasArrayRange(netIdsCtx, netIdCtx);

            const signal: Signal = {
                name: info.name,
                line: info.line,
                character: info.character,
                direction: null,
                type,
                bitRange,
                isMemory,
                assigned: idsWithInit.has(netIdCtx), // treat net with initial value as assigned
            };
            this._signalMap.set(signal.name, signal);
            const netDesc = [type, bitRange ? bitRange.toString() : '', info.name].filter(Boolean).join(' ');
            this._currentModule.addDefinition(new Definition(info.name, info.line, info.character, type, netDesc));
        }
        this.visitChildren(ctx);
        return null;
    }

    // Internal reg declarations: reg [15:0] counter;
    visitReg_declaration(ctx: any) {
        if (!this._currentModule) return null;

        const bitRange = this._getRange(ctx.range());

        const regIdsCtx = ctx.list_of_register_identifiers();
        const rawIds = regIdsCtx.register_identifier();
        const ids = Array.isArray(rawIds) ? rawIds : (rawIds ? [rawIds] : []);

        // Detect which register identifiers have initial values (e.g., reg a = 1;)
        const idsWithInit = this._identifiersWithInitialValue(regIdsCtx, ids);

        for (const regIdCtx of ids) {
            const info = this._getIdentifierInfo(regIdCtx.identifier());
            if (!info) continue;

            // Detect memory array: reg [W:0] mem [0:N-1] — the identifier has a range
            // (array dimension) in the list_of_register_identifiers context.
            const isMemory = this._registerIdentifierHasArrayRange(regIdsCtx, regIdCtx);

            const signal: Signal = {
                name: info.name,
                line: info.line,
                character: info.character,
                direction: null,
                type: 'reg',
                bitRange,
                isMemory,
                assigned: idsWithInit.has(regIdCtx), // treat reg with initial value as assigned
            };
            this._signalMap.set(signal.name, signal);
            const regDesc = ['reg', bitRange ? bitRange.toString() : '', info.name].filter(Boolean).join(' ');
            this._currentModule.addDefinition(new Definition(info.name, info.line, info.character, 'reg', regDesc));
        }
        this.visitChildren(ctx);
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

            const signal: Signal = {
                name: info.name,
                line: info.line,
                character: info.character,
                direction: null,
                type: 'integer',
                bitRange: new BitRange(31, 0),
                isMemory: false,
                assigned: idsWithInit.has(intIdCtx), // treat integer with initial value as assigned
            };
            this._signalMap.set(signal.name, signal);
            this._currentModule.addDefinition(new Definition(info.name, info.line, info.character, 'integer', `integer ${info.name}`));
        }
        this.visitChildren(ctx);
        return null;
    }

    // Helper: detect whether a register_identifier in list_of_register_identifiers is followed by
    // an array range (e.g. ram [0:N-1]), indicating a memory array declaration.
    _registerIdentifierHasArrayRange(listCtx: any, regIdCtx: any): boolean {
        const children = listCtx.children;
        if (!children) return false;
        let found = false;
        for (const child of children) {
            if (!found) {
                if (child === regIdCtx) found = true;
            } else {
                const text = typeof child.getText === 'function' ? child.getText() : '';
                if (text === ',' || text === '=') break;
                if (text.startsWith('[')) return true;
                break;
            }
        }
        return false;
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
            this._genvars.add(info.name);
        }
        return null;
    }

    /**
     * Generate per-module signal-usage warnings directly using live state,
     * and save minimal data for cross-module warnings.
     * Called from visitModule_declaration after visitChildren.
     */
    _generateWarnings() {
        if (!this._currentModule) return;

        // Warning 2: signal declared but never used.
        // A signal is "used" if it appears as an r-value in an expression (refNames)
        // or is connected to an input/inout port of an instantiated module (usedViaPortInput).
        // L-value assignments and connections to output ports do NOT count as "using" a signal.
        // Exception: output/inout port signals that are assigned are considered used externally.
        for (const signal of this._signalMap.values()) {
            if (!signal.used) {
                // Output/inout ports that are assigned drive the module interface;
                // they are consumed externally and must not trigger "never used".
                if ((signal.direction === 'output' || signal.direction === 'inout')) {
                    continue;
                }
                this.warnings.push({
                    line: signal.line,
                    character: signal.character,
                    length: signal.name.length,
                    message: `Signal '${signal.name}' is declared but never used`,
                    severity: vscode.DiagnosticSeverity.Warning
                });
            }
        }

        // Warning 7: output or internal signal never assigned
        for (const signal of this._signalMap.values()) {
            if (signal.assigned === false) {
                this.warnings.push({
                    line: signal.line,
                    character: signal.character,
                    length: signal.name.length,
                    message: `Signal '${signal.name}' is never assigned`,
                    severity: vscode.DiagnosticSeverity.Warning
                });
            }
        }
    }

    /**
     * Return the warnings that were generated during parsing.
     */
    getWarnings(): any[] {
        return this.warnings;
    }
}

/**
 * ANTLR-based Verilog Parser
 * Provides the same interface as the regex-based parser for compatibility
 */
class AntlrVerilogParser {
    errorListener: VerilogErrorListener;
    _lastVisitor: VerilogSymbolVisitor | null;
    _dirtry: boolean = false;

    constructor() {
        this.errorListener = new VerilogErrorListener();
        this._lastVisitor = null;
    }

    dirty() {
        this._dirtry = true;
    }

    /**
     * Run the ANTLR parser on preprocessed text and return the populated visitor.
     * @param text       Preprocessed Verilog source text
     * @param uri        Document URI string
     * @param moduleDatabase  Optional module database for cross-file lookup
     */
    private _parse(text: string, uri: string, moduleDatabase: ModuleDatabase | null = null) : void {
        const chars = new antlr4.InputStream(text);
        const lexer = new VerilogLexer(chars as any);
        const tokens = new antlr4.CommonTokenStream(lexer as any);
        const parser = new VerilogParser(tokens);

        // Remove default error listeners and attach our custom one
        this.errorListener.clearErrors();
        (parser as any).removeErrorListeners();
        (parser as any).addErrorListener(this.errorListener);

        const tree = parser.source_text();

        const visitor = new VerilogSymbolVisitor(uri, moduleDatabase || new ModuleDatabase());
        visitor.visit(tree);
        // Generate cross-module warnings now that all modules in the file are available.

        this._lastVisitor = visitor;
    }

    /**
     * Parse Verilog document and extract module definitions with only parameters and ports.
     * Returns an array of Module objects populated with parameters and ports.
     * At first it strips document text after first 'wire|reg|integer|genvar' occurence, and add 'endmodule'.
     * The it extracts module definitions.
     * @param {vscode.TextDocument} document
     * @param {ModuleDatabase} moduleDatabase - module database to update extract modules
     * @param {Function} [fileReader] - Optional file reader for `include resolution
     */
    parseModules(document: any, moduleDatabase: ModuleDatabase, fileReader: ((resolvedPath: string) => string | null) | null = null): void {
        const uri = document.uri.toString();
        let text: string = document.getText();

        // Determine base path for `include resolution
        let basePath: string | null = null;
        if (fileReader && uri.startsWith('file://')) {
            const path = require('path') as typeof import('path');
            const fsPath = fileURLToPath(uri);
            basePath = path.dirname(fsPath);
        }

        // Strip document body after the first body-level wire/reg/integer/genvar declaration.
        // These keywords at the start of a line (after optional whitespace) indicate the module
        // body rather than port declarations, which always have a direction keyword before them.
        const bodyRe = /\n[ \t]*(wire|reg|integer|genvar)\b/;
        const bodyMatch = bodyRe.exec(text);
        if (bodyMatch && bodyMatch.index !== undefined) {
            text = text.substring(0, bodyMatch.index) + '\nendmodule\n';
        }

        // Preprocess (handle `include, `define, etc.)
        text = preprocessVerilog(text, basePath, fileReader);
        this._parse(text, uri, moduleDatabase);
    }

    /**
     * Parse Verilog document and generate errors and warnings.
     * Returns an array of error objects with line, character, length, message, and severity.
     *
     * @param {vscode.TextDocument} document
     * @param {ModuleDatabase} [moduleDatabase] - module database for confirm port connections of instances
     * @param {Function} [fileReader] - Optional file reader for `include resolution
     */
    parseSymbols(document: any, moduleDatabase: ModuleDatabase | null = null, fileReader: ((resolvedPath: string) => string | null) | null = null): void {
        const uri = document.uri.toString();
        if (this._lastVisitor && this._lastVisitor.uri === uri && this._dirtry === false) {
            // If the same file is parsed again without being marked dirty
            return;
        }
        this._dirtry = false;

        let text: string = document.getText();

        // Determine base path for `include resolution
        let basePath: string | null = null;
        if (fileReader && uri.startsWith('file://')) {
            const path = require('path') as typeof import('path');
            const fsPath = fileURLToPath(uri);
            basePath = path.dirname(fsPath);
        }

        // Preprocess (handle `include, `define, etc.)
        text = preprocessVerilog(text, basePath, fileReader);
        this._parse(text, uri, moduleDatabase);
    }

    getDiagnostics(moduleDatabase: ModuleDatabase) : any[] {
        // Collect ANTLR syntax errors
        const syntaxErrors = this.errorListener.getErrors();

        return [...syntaxErrors, ...this._lastVisitor.getWarnings()];
    }

}

export = AntlrVerilogParser;
