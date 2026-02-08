# Verilog Language Support for VS Code

A Visual Studio Code extension that provides syntax highlighting and symbol extraction for Verilog (*.v) files.

## Features

- **Syntax Highlighting**: Comprehensive syntax highlighting for Verilog reserved words
- **Symbol Extraction**: Automatically extracts and stores Verilog symbols in an internal database
  - Module names
  - Wire declarations
  - Register (reg) declarations
- **Document Symbol Provider**: Navigate symbols using VS Code's built-in symbol navigation (Ctrl+Shift+O)
- **File Detection**: Automatically detects and activates for *.v files
- **Language Configuration**: Proper comment handling, bracket matching, and auto-closing pairs

## Verilog Symbol Database

The extension maintains an internal database of all Verilog symbols found in your workspace:

- **Module Symbols**: All module declarations (`module module_name`)
- **Wire Symbols**: Wire declarations with or without port directions (`wire`, `input wire`, `output wire`)
- **Reg Symbols**: Register declarations with or without port directions (`reg`, `output reg`)

The symbol database is automatically updated when:
- A Verilog file is opened
- A Verilog file is modified
- A Verilog file is closed (symbols are removed)

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
- **Quick Symbol Search**: Press `Ctrl+Shift+O` (or `Cmd+Shift+O` on Mac) to search and jump to symbols
- **Breadcrumbs**: Symbol names appear in the breadcrumb navigation at the top of the editor

## Development

To test this extension locally:

1. Open this folder in VS Code
2. Press F5 to open a new VS Code window with the extension loaded
3. Open a `.v` file to see the syntax highlighting and symbol extraction in action
4. Use the command "Verilog: Show Symbols Database" to view extracted symbols

## License

MIT
