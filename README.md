# Verilog Language Support for VS Code

A Visual Studio Code extension that provides syntax highlighting, symbol extraction, goto definition, and syntax error detection for Verilog (*.v) files.

## Features

- **Syntax Highlighting**: Comprehensive syntax highlighting for Verilog reserved words
- **Syntax Error Detection**: Real-time parsing and error detection with diagnostics displayed in the editor
  - Module/endmodule matching
  - Bracket matching (parentheses, square brackets, curly braces)
  - Missing semicolons in declarations
  - Invalid identifiers and reserved keyword usage
  - Malformed assign statements
  - **Always block syntax validation**
    - Missing timing control (@)
    - Empty sensitivity lists
    - Invalid timing control syntax
    - Missing statements
  - **Initial block syntax validation**
    - Initial blocks with sensitivity lists (error)
    - Missing statements
  - Duplicate signal declarations
- **Enhanced Symbol Extraction**: Automatically extracts and stores Verilog symbols with detailed information
  - Module names
  - Wire declarations with bit width (e.g., `data[7:0]`)
  - Register (reg) declarations with bit width (e.g., `counter[15:0]`)
  - Port direction information (input, output, inout)
- **Enhanced Outline View**: 
  - Variables displayed with bit definitions (e.g., `count[7:0]`)
  - Hover information shows full type details (e.g., `clk (input wire)`)
- **Document Symbol Provider**: Navigate symbols using VS Code's built-in symbol navigation (Ctrl+Shift+O)
- **Goto Definition**: Navigate to signal and module definitions
  - Click on a signal (wire/reg) to jump to its declaration
  - Click on a module instantiation to jump to the module definition (even in different files)
  - Workspace-wide module scanning to find definitions across all .v files
- **File Detection**: Automatically detects and activates for *.v files
- **Language Configuration**: Proper comment handling, bracket matching, and auto-closing pairs

## Syntax Error Detection

The extension includes a Verilog parser that performs real-time syntax checking and displays errors directly in the editor. The parser detects:

## Verilog Symbol Database

The extension maintains two separate internal databases for Verilog symbols:

### Signal Database (Per-File)
Stores signals (wire and reg declarations) separately for each file:
- **Wire Symbols**: Wire declarations with or without port directions and bit widths
  - Examples: `wire enable`, `input wire [7:0] data_in`, `output wire [3:0] addr`
- **Reg Symbols**: Register declarations with or without port directions and bit widths
  - Examples: `reg state`, `output reg [7:0] data_out`, `reg [15:0] counter`

The signal database is automatically updated when:
- A Verilog file is opened
- A Verilog file is modified
- A Verilog file is closed (signals for that file are removed)

### Module Database (Workspace-Wide)
Stores all module declarations across the entire workspace in a single database:
- **Module Symbols**: All module declarations (`module module_name`)
- Modules are indexed by name for fast lookup
- The module database persists across file operations

The module database is automatically updated when:
- A Verilog file is opened or modified (modules are added/updated)
- A Verilog file is closed (modules from that file are removed)
- Files are created or deleted in the workspace

## Verilog Parser and Syntax Error Detection

The extension includes a comprehensive Verilog parser that performs real-time syntax checking. Errors are displayed directly in the editor with squiggly underlines and detailed error messages.

### Error Types Detected

1. **Module Structure Errors**
   - Missing `endmodule` statements
   - Extra `endmodule` without matching `module`
   - Module names that are reserved keywords

2. **Bracket Matching Errors**
   - Unmatched opening brackets: `(`, `[`, `{`
   - Unmatched closing brackets: `)`, `]`, `}`
   - Mismatched bracket types (e.g., `(` closed with `]`)

3. **Declaration Errors**
   - Missing semicolons in wire/reg/parameter declarations
   - Duplicate signal declarations
   - Invalid identifiers (e.g., starting with a digit)
   - Port names that are reserved keywords

4. **Statement Errors**
   - Assign statements without assignment operator (`=`)
   - Assign statements missing semicolons

5. **Always Block Errors**
   - Always blocks without timing control (`@`)
   - Always blocks with empty sensitivity lists `@()`
   - Invalid timing control syntax
   - Always blocks missing statements
   - Support for valid syntax: `@(posedge clk)`, `@(*)`, `@*`

6. **Initial Block Errors**
   - Initial blocks with sensitivity lists (not allowed in Verilog)
   - Initial blocks missing statements

### Example Errors Detected

```verilog
// Error: Missing endmodule
module test_module (
    input wire clk
);
    assign out = clk;
// Missing endmodule - parser will flag this

// Error: Unmatched bracket
module bracket_error (
    input wire a
);
    assign result = (a & 1'b1;  // Missing closing parenthesis
endmodule

// Error: Reserved keyword as module name
module wire (  // 'wire' is a reserved keyword
    input a
);
endmodule

// Error: Always block without timing control
module always_error (
    input wire clk,
    output reg q
);
    always begin  // Missing @ timing control
        q <= 1'b1;
    end
endmodule

// Error: Always block with empty sensitivity list
module empty_sens (
    input wire clk,
    output reg q
);
    always @() begin  // Empty sensitivity list
        q <= 1'b1;
    end
endmodule

// Error: Initial block with sensitivity list
module initial_error (
    output reg q
);
    initial @(posedge clk) begin  // Initial blocks cannot have @ sensitivity
        q = 1'b0;
    end
endmodule

// Valid: Always block with proper timing control
module valid_always (
    input wire clk,
    output reg q
);
    always @(posedge clk) begin  // Correct syntax
        q <= 1'b1;
    end
endmodule

// Valid: Always block with @*
module valid_always_star (
    input wire a, b,
    output reg c
);
    always @* begin  // Valid syntax
        c = a & b;
    end
endmodule

// Error: Missing semicolon
module decl_error (
    input wire clk
);
    wire temp  // Missing semicolon
    assign temp = clk;
endmodule
```

The parser runs automatically whenever you:
- Open a Verilog file
- Edit a Verilog file
- Save a Verilog file

Errors are displayed in:
- The editor with squiggly underlines
- The Problems panel (Ctrl+Shift+M or Cmd+Shift+M)
- Hover tooltips when you mouse over the error

## Goto Definition

The extension provides "goto definition" functionality for:

1. **Signals (wire/reg)**: Right-click or F12 on a signal name to jump to its declaration in the current file
   - Uses the per-file signal database for fast lookups
2. **Modules**: Right-click or F12 on a module instantiation to jump to the module definition
   - Uses the workspace-wide module database to find modules across all files

The extension scans the current workspace folder tree to find all Verilog modules.

### Example Usage

```verilog
// In counter.v
module counter (
    input wire clk,
    output reg [7:0] count
);
    // implementation
endmodule

// In top_module.v
module top_module (
    input wire clk
);
    wire [7:0] count_value;
    
    // F12 on "counter" will jump to counter.v
    counter u_counter (
        .clk(clk),
        .count(count_value)  // F12 on "count_value" will jump to declaration above
    );
endmodule
```

## Commands

- **Verilog: Show Symbols Database**: Display all symbols currently in the database
  - Use Command Palette (Ctrl+Shift+P) and search for "Verilog: Show Symbols Database"

## Verilog Reserved Words

This extension provides syntax highlighting for all Verilog reserved words including:
- Control keywords: `always`, `begin`, `end`, `if`, `else`, `case`, `for`, `while`, etc.
- Module keywords: `module`, `endmodule`, `input`, `output`, `inout`, etc.
- Data types: `reg`, `wire`, `integer`, `real`, `time`, etc.
- Primitives: `and`, `or`, `nand`, `nor`, `xor`, `xnor`, `buf`, `not`, etc.
- And many more...

## Installation

1. Copy this extension to your VS Code extensions directory:
   - Windows: `%USERPROFILE%\.vscode\extensions`
   - macOS/Linux: `~/.vscode/extensions`

2. Reload VS Code

## Usage

Simply open any file with the `.v` extension, and the extension will automatically:
- Provide syntax highlighting
- Extract and store symbols in the internal database
- Enable symbol navigation through VS Code's outline view

### Symbol Navigation

- **Outline View**: View all symbols in the current file in the Outline panel
  - Variables are displayed with their bit width (e.g., `data[7:0]`, `counter[31:0]`)
  - Hover over symbols to see detailed type information (e.g., `input wire`, `output reg`)
- **Quick Symbol Search**: Press `Ctrl+Shift+O` (or `Cmd+Shift+O` on Mac) to search and jump to symbols
- **Breadcrumbs**: Symbol names appear in the breadcrumb navigation at the top of the editor

### Symbol Display Examples

In the Outline view, symbols are displayed as:
- `count[7:0]` - with hover showing `output reg`
- `clk` - with hover showing `input wire`
- `data_in[7:0]` - with hover showing `input wire`
- `enable` - with hover showing `wire`
- `counter[15:0]` - with hover showing `reg`

## Development

To test this extension locally:

1. Open this folder in VS Code
2. Press F5 to open a new VS Code window with the extension loaded
3. Open a `.v` file to see the syntax highlighting and symbol extraction in action
4. Use the command "Verilog: Show Symbols Database" to view extracted symbols

## License

MIT
