// ANTLR-based Verilog Parser
// Replaces regex-based parser with formal grammar-based parser

let vscode;
try {
    vscode = require('vscode');
} catch (e) {
    // In test environment, use global vscode
    if (typeof global !== 'undefined' && global.vscode) {
        vscode = global.vscode;
    } else {
        throw new Error('vscode module not found. Make sure to set global.vscode in test environment.');
    }
}

const antlr4 = require('antlr4');
const VerilogLexer = require('../antlr/generated/VerilogLexer.js').VerilogLexer;
const VerilogParser = require('../antlr/generated/VerilogParser.js').VerilogParser;
const VerilogVisitor = require('../antlr/generated/VerilogVisitor.js').VerilogVisitor;

/**
 * Custom error listener to capture ANTLR parsing errors
 */
class VerilogErrorListener extends antlr4.error.ErrorListener {
    constructor() {
        super();
        this.errors = [];
    }

    syntaxError(recognizer, offendingSymbol, line, column, msg, e) {
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
    constructor(uri) {
        super();
        this.uri = uri;
        this.modules = [];
        this.signals = [];
        // Per-module signal reference tracking (for warnings)
        this._moduleSignalRefs = new Map();   // moduleName -> Set<signalName>
        this._signalRefList = [];             // [{name, moduleName, line, character}]
        this.assignLvalues = [];             // [{name, moduleName, line, character}] continuous assign lvalues
        this.procLvalues = [];               // [{name, moduleName, line, character}] blocking/non-blocking lvalues
        this._moduleParamNames = new Map();  // moduleName -> Set<paramName>
        this._currentModule = null;
        this._inProcedural = false;
        this._inContinuousAssign = false;
    }

    _addSignalRef(name, line, character) {
        if (!this._currentModule) return;
        const moduleName = this._currentModule.name;
        const refs = this._moduleSignalRefs.get(moduleName);
        if (refs && !refs.has(name)) {
            refs.add(name);
            this._signalRefList.push({ name, moduleName, line, character });
        }
    }

    _getLvalueIdentifierInfo(lvalCtx) {
        if (!lvalCtx) return null;
        const identCtx = lvalCtx.identifier ? lvalCtx.identifier() : null;
        if (!identCtx) return null;
        return this._getIdentifierInfo(identCtx);
    }

    _getIdentifierInfo(identCtx) {
        const token = identCtx.SIMPLE_IDENTIFIER() || identCtx.ESCAPED_IDENTIFIER();
        if (!token) return null;
        return {
            name: token.getText(),
            line: token.symbol.line - 1,   // ANTLR is 1-based; VS Code is 0-based
            character: token.symbol.column // ANTLR column is already 0-based
        };
    }

    _getRangeText(rangeCtx) {
        return rangeCtx ? rangeCtx.getText() : null;
    }

    visitModule_declaration(ctx) {
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

        this.visitChildren(ctx);

        this.modules.push(this._currentModule);
        this._currentModule = null;
        return null;
    }

    // Track always/initial block context for procedural assignment warnings
    visitAlways_construct(ctx) {
        if (!this._currentModule) return null;
        const prev = this._inProcedural;
        this._inProcedural = true;
        this.visitChildren(ctx);
        this._inProcedural = prev;
        return null;
    }

    visitInitial_construct(ctx) {
        if (!this._currentModule) return null;
        const prev = this._inProcedural;
        this._inProcedural = true;
        this.visitChildren(ctx);
        this._inProcedural = prev;
        return null;
    }

    // Track continuous assign context for "assign lvalue is reg" warning
    visitContinuous_assign(ctx) {
        if (!this._currentModule) return null;
        const prev = this._inContinuousAssign;
        this._inContinuousAssign = true;
        this.visitChildren(ctx);
        this._inContinuousAssign = prev;
        return null;
    }

    // Capture lvalue of continuous assign (assignment rule) or FOR loop (in procedural)
    visitAssignment(ctx) {
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
    visitBlocking_assignment(ctx) {
        if (!this._currentModule) return null;
        const lvalInfo = this._getLvalueIdentifierInfo(ctx.lvalue());
        if (lvalInfo) {
            this.procLvalues.push({ ...lvalInfo, moduleName: this._currentModule.name });
        }
        this.visitChildren(ctx);
        return null;
    }

    // Capture lvalue of non-blocking assignment (always/initial body)
    visitNon_blocking_assignment(ctx) {
        if (!this._currentModule) return null;
        const lvalInfo = this._getLvalueIdentifierInfo(ctx.lvalue());
        if (lvalInfo) {
            this.procLvalues.push({ ...lvalInfo, moduleName: this._currentModule.name });
        }
        this.visitChildren(ctx);
        return null;
    }

    // Capture all identifiers used in expressions (r-value signal references)
    visitPrimary(ctx) {
        if (this._currentModule && ctx.identifier && ctx.identifier()) {
            const info = this._getIdentifierInfo(ctx.identifier());
            if (info) {
                this._addSignalRef(info.name, info.line, info.character);
            }
        }
        this.visitChildren(ctx);
        return null;
    }

    // Capture identifiers used as l-values (counts as a signal reference)
    visitLvalue(ctx) {
        if (this._currentModule && ctx.identifier && ctx.identifier()) {
            const info = this._getIdentifierInfo(ctx.identifier());
            if (info) {
                this._addSignalRef(info.name, info.line, info.character);
            }
        }
        this.visitChildren(ctx);
        return null;
    }

    // Track parameter declarations to exclude from "undefined signal" warnings
    visitParam_assignment(ctx) {
        if (!this._currentModule) return null;
        if (ctx.parameter_identifier && ctx.parameter_identifier()) {
            const identCtx = ctx.parameter_identifier().identifier();
            if (identCtx) {
                const info = this._getIdentifierInfo(identCtx);
                if (info) {
                    const paramNames = this._moduleParamNames.get(this._currentModule.name);
                    if (paramNames) paramNames.add(info.name);
                }
            }
        }
        this.visitChildren(ctx);
        return null;
    }

    // ANSI-style port declaration: input wire [7:0] data_in
    visitAnsi_port_declaration(ctx) {
        if (!this._currentModule) return null;

        const direction = ctx.port_direction().getText();
        const dataTypeCtx = ctx.port_data_type();
        const type = dataTypeCtx ? dataTypeCtx.getText() : DEFAULT_NET_TYPE;
        const bitWidth = this._getRangeText(ctx.range());

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
    visitInput_declaration(ctx) {
        if (!this._currentModule) return null;
        this._processPortDeclaration(ctx, 'input');
        return null;
    }

    visitOutput_declaration(ctx) {
        if (!this._currentModule) return null;
        this._processPortDeclaration(ctx, 'output');
        return null;
    }

    visitInout_declaration(ctx) {
        if (!this._currentModule) return null;
        this._processPortDeclaration(ctx, 'inout');
        return null;
    }

    _processPortDeclaration(ctx, direction) {
        const netTypeCtx = ctx.net_type();
        const type = netTypeCtx ? netTypeCtx.getText() : DEFAULT_NET_TYPE;
        const bitWidth = this._getRangeText(ctx.range());

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
    visitNet_declaration(ctx) {
        if (!this._currentModule) return null;

        const type = ctx.net_type().getText();
        const bitWidth = this._getRangeText(ctx.range());

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
    visitReg_declaration(ctx) {
        if (!this._currentModule) return null;

        const bitWidth = this._getRangeText(ctx.range());

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
    constructor() {
        this.errorListener = new VerilogErrorListener();
    }

    /**
     * Parse Verilog document and detect syntax errors
     * Also generates semantic warnings (signal usage issues).
     * @param {vscode.TextDocument} document 
     * @returns {Array} Array of diagnostic objects (syntax errors + signal warnings)
     */
    parse(document) {
        const { errors, warnings } = this.parseSymbols(document);
        return [...errors, ...warnings];
    }

    /**
     * Parse Verilog document and extract module/signal symbols plus syntax errors.
     * Replaces the regex-based parseVerilogSymbols function.
     *
     * @param {vscode.TextDocument} document
     * @returns {{ modules: Array, signals: Array, errors: Array, warnings: Array }}
     *   modules: [{ name, uri, line, character, ports[] }]
     *   signals: [{ name, uri, line, character, direction, type, bitWidth, moduleName }]
     *   errors:  syntax errors
     *   warnings: signal usage warnings
     */
    parseSymbols(document) {
        this.errorListener.clearErrors();

        const text = document.getText();
        const uri = document.uri.toString();
        let modules = [];
        let signals = [];
        let visitor = null;

        try {
            const chars = new antlr4.InputStream(text, true);
            const lexer = new VerilogLexer(chars);
            lexer.removeErrorListeners();
            lexer.addErrorListener(this.errorListener);

            const tokens = new antlr4.CommonTokenStream(lexer);
            const parser = new VerilogParser(tokens);
            parser.removeErrorListeners();
            parser.addErrorListener(this.errorListener);
            parser.buildParseTrees = true;

            const tree = parser.source_text();

            visitor = new VerilogSymbolVisitor(uri);
            tree.accept(visitor);
            modules = visitor.modules;
            signals = visitor.signals;

        } catch (error) {
            console.error('ANTLR symbol extraction error:', error);
            this.errorListener.errors.push({
                line: 0,
                character: 0,
                length: 1,
                message: `Parser error: ${error.message}`,
                severity: vscode.DiagnosticSeverity.Error
            });
        }

        const warnings = visitor ? this._generateSignalWarnings(modules, signals, visitor) : [];

        return { modules, signals, errors: this.errorListener.getErrors(), warnings };
    }

    /**
     * Generate signal-usage warnings for all modules in the parsed result.
     * @param {Array} modules
     * @param {Array} signals
     * @param {VerilogSymbolVisitor} visitor
     * @returns {Array} Array of warning diagnostic objects
     */
    _generateSignalWarnings(modules, signals, visitor) {
        const warnings = [];
        const wireTypes = new Set(['wire', 'tri', 'supply0', 'supply1']);

        for (const module of modules) {
            const moduleName = module.name;
            const declaredSignals = signals.filter(s => s.moduleName === moduleName);
            const declaredByName = new Map(declaredSignals.map(s => [s.name, s]));
            const paramNames = visitor._moduleParamNames.get(moduleName) || new Set();
            const refNames = visitor._moduleSignalRefs.get(moduleName) || new Set();

            // Warning 1: signal reference without declaration
            const reportedUndefined = new Set();
            for (const refEntry of visitor._signalRefList.filter(r => r.moduleName === moduleName)) {
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

            // Warning 2: signal declared but never used
            for (const signal of declaredSignals) {
                if (!refNames.has(signal.name)) {
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
            for (const lval of visitor.assignLvalues.filter(l => l.moduleName === moduleName)) {
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
            for (const lval of visitor.procLvalues.filter(l => l.moduleName === moduleName)) {
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
        }

        return warnings;
    }
}

module.exports = AntlrVerilogParser;
