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
}

module.exports = AntlrVerilogParser;
