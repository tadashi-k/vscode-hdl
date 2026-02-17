// The module 'vscode' contains the VS Code extensibility API
// In test environments, vscode may be provided globally
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

// Import ANTLR4 runtime
const antlr4 = require('antlr4ts');
const { CharStreams } = require('antlr4ts');
const { CommonTokenStream } = require('antlr4ts');

// Import generated parser and lexer
const { VerilogLexer } = require('./generated/grammar/VerilogLexer');
const { VerilogParser: AntlrVerilogParser } = require('./generated/grammar/VerilogParser');

/**
 * Custom error listener to collect syntax errors
 */
class VerilogErrorListener {
    constructor(document) {
        this.errors = [];
        this.document = document;
    }

    syntaxError(recognizer, offendingSymbol, line, charPositionInLine, msg, e) {
        // Create a diagnostic for the error
        const startPos = new vscode.Position(line - 1, charPositionInLine);
        
        // Try to determine the length of the error
        let length = 1;
        if (offendingSymbol && offendingSymbol.text) {
            length = offendingSymbol.text.length;
        }
        
        const endPos = new vscode.Position(line - 1, charPositionInLine + length);
        const range = new vscode.Range(startPos, endPos);
        
        const diagnostic = {
            line: line - 1,
            character: charPositionInLine,
            length: length,
            message: msg,
            severity: vscode.DiagnosticSeverity.Error,
            range: range
        };
        
        this.errors.push(diagnostic);
    }

    getErrors() {
        return this.errors;
    }
}

/**
 * Verilog Parser - Detects syntax errors in Verilog code using ANTLR
 */
class VerilogParser {
    constructor() {
        this.errors = [];
    }

    /**
     * Parse Verilog document and detect syntax errors
     * @param {vscode.TextDocument} document 
     * @returns {Array} Array of diagnostic objects
     */
    parse(document) {
        this.errors = [];
        const text = document.getText();

        try {
            // Create input stream from document text
            const inputStream = CharStreams.fromString(text);
            
            // Create lexer
            const lexer = new VerilogLexer(inputStream);
            
            // Remove default console error listener
            lexer.removeErrorListeners();
            
            // Add custom error listener to lexer
            const lexerErrorListener = new VerilogErrorListener(document);
            lexer.addErrorListener(lexerErrorListener);
            
            // Create token stream
            const tokenStream = new CommonTokenStream(lexer);
            
            // Create parser
            const parser = new AntlrVerilogParser(tokenStream);
            
            // Remove default console error listener
            parser.removeErrorListeners();
            
            // Add custom error listener to parser
            const parserErrorListener = new VerilogErrorListener(document);
            parser.addErrorListener(parserErrorListener);
            
            // Set error recovery strategy to continue parsing after errors
            // This allows us to find multiple errors in one pass
            parser.errorHandler.reset(parser);
            
            // Parse the document starting from the root rule
            const tree = parser.source_text();
            
            // Collect all errors from both lexer and parser
            this.errors = [
                ...lexerErrorListener.getErrors(),
                ...parserErrorListener.getErrors()
            ];
            
        } catch (error) {
            // If parsing completely fails, add a general error
            const diagnostic = {
                line: 0,
                character: 0,
                length: 1,
                message: `Parse error: ${error.message}`,
                severity: vscode.DiagnosticSeverity.Error,
                range: new vscode.Range(
                    new vscode.Position(0, 0),
                    new vscode.Position(0, 1)
                )
            };
            this.errors.push(diagnostic);
        }

        return this.errors;
    }
}

module.exports = VerilogParser;
