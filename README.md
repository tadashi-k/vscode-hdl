# Verilog Language Support for VS Code

A Visual Studio Code extension that provides syntax highlighting for Verilog (*.v) files.

## Features

- **Syntax Highlighting**: Comprehensive syntax highlighting for Verilog reserved words
- **File Detection**: Automatically detects and activates for *.v files
- **Language Configuration**: Proper comment handling, bracket matching, and auto-closing pairs

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

Simply open any file with the `.v` extension, and the extension will automatically provide syntax highlighting.

## Development

To test this extension locally:

1. Open this folder in VS Code
2. Press F5 to open a new VS Code window with the extension loaded
3. Open a `.v` file to see the syntax highlighting in action

## License

MIT
