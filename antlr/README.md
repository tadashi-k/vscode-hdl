# ANTLR Verilog Grammar Setup

This directory contains the ANTLR grammar definition for Verilog and build scripts to generate JavaScript parser code.

## Overview

The ANTLR (ANother Tool for Language Recognition) setup provides a formal grammar-based parser for Verilog hardware description language. This parser can be used for:
- Syntax validation
- Parse tree generation
- Abstract syntax tree (AST) construction
- Code analysis and transformation

## Files

- **Verilog.g4** - The ANTLR4 grammar definition for Verilog
- **build.js** - Build script that generates JavaScript parser code from the grammar
- **fix-imports.js** - Post-processing script that fixes import paths in generated code
- **example.js** - Example demonstrating how to use the generated parser
- **generated/** - Directory containing generated parser files (excluded from git)

## Grammar Coverage

The Verilog.g4 grammar covers the following Verilog constructs:

### Module Structure
- Module declarations
- Port declarations (input, output, inout)
- Parameter declarations

### Data Types
- Wire declarations
- Register (reg) declarations
- Integer declarations
- Net types (wire, tri, supply0, supply1)

### Statements
- Continuous assignments (assign)
- Always blocks
- Initial blocks
- Blocking and non-blocking assignments
- Conditional statements (if-else)
- Case statements (case, casez, casex)
- Loop statements (for, while, repeat)
- Sequential blocks (begin-end)

### Expressions
- Arithmetic, logical, and bitwise operations
- Ternary operators
- Concatenation and replication
- Bit selection and range expressions

### Other Features
- Module instantiation
- Event control (@posedge, @negedge)
- Comments (single-line and multi-line)

## Building the Parser

### Prerequisites

Install the required dependencies:
```bash
npm install
```

This installs:
- **antlr4** (v4.8.0) - ANTLR4 JavaScript runtime
- **antlr4-tool** (dev dependency) - Tool for generating parser from grammar

### Build Commands

Generate parser code from the grammar:
```bash
npm run build:antlr
```

This command:
1. Runs `node antlr/build.js`
2. Generates parser files in `antlr/generated/`
3. Automatically fixes import paths for compatibility

Clean generated files:
```bash
npm run clean:antlr
```

### Generated Files

The build process generates the following files in `antlr/generated/`:

- **VerilogLexer.js** - Tokenizer that converts source code into tokens
- **VerilogParser.js** - Parser that constructs parse trees from tokens
- **VerilogListener.js** - Listener interface for tree walking
- **VerilogVisitor.js** - Visitor interface for tree traversal
- **Verilog.tokens** - Token definitions
- **VerilogLexer.tokens** - Lexer token mappings
- **Verilog.interp** - Interpreter data
- **VerilogLexer.interp** - Lexer interpreter data

## Using the Parser

### Basic Usage

```javascript
const antlr4 = require('antlr4');
const VerilogLexer = require('./antlr/generated/VerilogLexer.js').VerilogLexer;
const VerilogParser = require('./antlr/generated/VerilogParser.js').VerilogParser;

// Your Verilog code
const verilogCode = `
module counter(
    input wire clk,
    input wire reset,
    output reg [7:0] count
);

always @(posedge clk or posedge reset) begin
    if (reset)
        count <= 8'b0;
    else
        count <= count + 1;
end

endmodule
`;

// Create input stream and lexer
const chars = new antlr4.InputStream(verilogCode, true);
const lexer = new VerilogLexer(chars);

// Create token stream and parser
const tokens = new antlr4.CommonTokenStream(lexer);
const parser = new VerilogParser(tokens);

// Parse the source text
parser.buildParseTrees = true;
const tree = parser.source_text();

// Print the parse tree
console.log(tree.toStringTree(parser.ruleNames));
```

### Running the Example

To see the parser in action:
```bash
cd antlr
node example.js
```

The example demonstrates parsing a simple Verilog counter module.

### Error Handling

The parser automatically detects syntax errors. To capture errors:

```javascript
class ErrorListener extends antlr4.error.ErrorListener {
    syntaxError(recognizer, offendingSymbol, line, column, msg, e) {
        console.error(`Line ${line}:${column} - ${msg}`);
    }
}

// Add error listener to parser
const errorListener = new ErrorListener();
parser.removeErrorListeners();
parser.addErrorListener(errorListener);
```

### Tree Walking

Use the Listener pattern to walk the parse tree:

```javascript
const VerilogListener = require('./antlr/generated/VerilogListener.js').VerilogListener;

class MyVerilogListener extends VerilogListener {
    enterModule_declaration(ctx) {
        const moduleName = ctx.module_identifier().getText();
        console.log(`Found module: ${moduleName}`);
    }
    
    enterAlways_construct(ctx) {
        console.log('Found always block');
    }
}

// Walk the tree
const listener = new MyVerilogListener();
antlr4.tree.ParseTreeWalker.DEFAULT.walk(listener, tree);
```

### Tree Visiting

Use the Visitor pattern for custom tree traversal:

```javascript
const VerilogVisitor = require('./antlr/generated/VerilogVisitor.js').VerilogVisitor;

class MyVerilogVisitor extends VerilogVisitor {
    visitModule_declaration(ctx) {
        const moduleName = ctx.module_identifier().getText();
        // Process module...
        return this.visitChildren(ctx);
    }
}

const visitor = new MyVerilogVisitor();
const result = visitor.visit(tree);
```

## Technical Notes

### ANTLR Version Compatibility

- **Grammar Format**: ANTLR 4.8
- **Runtime Library**: antlr4 4.8.0
- **Build Tool**: antlr4-tool (generates ANTLR 4.8 compatible code)

The build process includes a post-processing step (`fix-imports.js`) that updates import paths in the generated code to work with the npm antlr4 package structure.

### Known Limitations

1. **Port Declaration Syntax**: The current grammar expects ports to be declared inside the module body rather than in the port list. This is a limitation that can be refined in future versions.

2. **SystemVerilog Features**: This grammar focuses on Verilog (IEEE 1364-2005). SystemVerilog features are not currently supported.

3. **Preprocessor Directives**: Preprocessor directives like `` `define ``, `` `include ``, `` `ifdef `` are not handled by this grammar.

4. **Security Warnings**: The antlr4-tool package has known security vulnerabilities. These are only relevant during development (code generation) and do not affect runtime security since antlr4-tool is a devDependency.

### Grammar Refinement

The grammar can be refined by editing `Verilog.g4`. After making changes:

1. Test the grammar with various Verilog files
2. Rebuild: `npm run build:antlr`
3. Run the example: `cd antlr && node example.js`
4. Update tests as needed

## Integration with VS Code Extension

The generated parser can be integrated into the VS Code extension for:
- **Enhanced Syntax Validation**: More accurate error detection than regex-based parsing
- **Semantic Analysis**: Understanding code structure for better autocomplete and refactoring
- **Code Navigation**: Jump to definitions using the parse tree
- **Code Formatting**: Automated code formatting based on grammar rules
- **Symbol Extraction**: More reliable symbol detection

To integrate, import the parser in `src/extension.js` or create a new parser module:

```javascript
const VerilogLexer = require('../antlr/generated/VerilogLexer.js').VerilogLexer;
const VerilogParser = require('../antlr/generated/VerilogParser.js').VerilogParser;
```

## Resources

- [ANTLR Documentation](https://www.antlr.org/)
- [ANTLR 4 Grammar Reference](https://github.com/antlr/antlr4/blob/master/doc/grammars.md)
- [Verilog IEEE 1364-2005 Standard](https://ieeexplore.ieee.org/document/1620780)
- [antlr4 npm package](https://www.npmjs.com/package/antlr4)

## License

This ANTLR grammar is part of the vscode-hdl project and follows the same license.
