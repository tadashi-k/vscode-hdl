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
        this._currentModule = null;
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

        this.visitChildren(ctx);

        this.modules.push(this._currentModule);
        this._currentModule = null;
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
     * @param {vscode.TextDocument} document 
     * @returns {Array} Array of diagnostic objects
     */
    parse(document) {
        this.errorListener.clearErrors();
        
        const text = document.getText();
        
        try {
            // Create the lexer and parser
            const chars = new antlr4.InputStream(text, true);
            const lexer = new VerilogLexer(chars);
            
            // Remove default error listeners and add our custom one
            lexer.removeErrorListeners();
            lexer.addErrorListener(this.errorListener);
            
            const tokens = new antlr4.CommonTokenStream(lexer);
            const parser = new VerilogParser(tokens);
            
            // Remove default error listeners and add our custom one
            parser.removeErrorListeners();
            parser.addErrorListener(this.errorListener);
            
            // Build the parse tree
            parser.buildParseTrees = true;
            
            // Parse the source text (this will trigger error collection)
            parser.source_text();
            
        } catch (error) {
            // In case of unexpected errors during parsing
            console.error('ANTLR parsing error:', error);
            // Add a generic error
            this.errorListener.errors.push({
                line: 0,
                character: 0,
                length: 1,
                message: `Parser error: ${error.message}`,
                severity: vscode.DiagnosticSeverity.Error
            });
        }

        return this.errorListener.getErrors();
    }

    /**
     * Parse Verilog document and extract module/signal symbols plus syntax errors.
     * Replaces the regex-based parseVerilogSymbols function.
     *
     * @param {vscode.TextDocument} document
     * @returns {{ modules: Array, signals: Array, errors: Array }}
     *   modules: [{ name, uri, line, character, ports[] }]
     *   signals: [{ name, uri, line, character, direction, type, bitWidth, moduleName }]
     *   errors:  same format as parse()
     */
    parseSymbols(document) {
        this.errorListener.clearErrors();

        const text = document.getText();
        const uri = document.uri.toString();
        let modules = [];
        let signals = [];

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

            const visitor = new VerilogSymbolVisitor(uri);
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

        return { modules, signals, errors: this.errorListener.getErrors() };
    }
}

module.exports = AntlrVerilogParser;
