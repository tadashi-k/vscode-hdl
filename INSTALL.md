# Installation and Usage Guide

## Installing the Extension

### Method 1: Manual Installation
1. Copy the entire extension folder to your VS Code extensions directory:
   - **Windows**: `%USERPROFILE%\.vscode\extensions\verilog-support`
   - **macOS/Linux**: `~/.vscode/extensions/verilog-support`

2. Restart VS Code

### Method 2: Package and Install
1. Install vsce (VS Code Extension Manager):
   ```bash
   npm install -g @vscode/vsce
   ```

2. Package the extension:
   ```bash
   vsce package
   ```

3. Install the .vsix file:
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Click "..." menu → "Install from VSIX..."
   - Select the generated .vsix file

## Testing the Extension

1. Open VS Code
2. Create or open a `.v` file (Verilog file)
3. The extension will automatically activate and provide syntax highlighting

Try opening the included `test.v` file to see the syntax highlighting in action.

## Features Implemented

### ✅ File Detection
- Extension automatically activates for files with `.v` extension
- Language ID: `verilog`

### ✅ Syntax Highlighting
Comprehensive highlighting for 126+ Verilog reserved words including:
- **Control keywords**: always, begin, end, if, else, case, for, while, repeat, forever, etc.
- **Module keywords**: module, endmodule, input, output, inout, parameter, localparam
- **Data types**: reg, wire, integer, real, time, realtime, event, genvar
- **Primitives**: and, or, nand, nor, xor, xnor, buf, not, etc.
- **Gate types**: nmos, pmos, cmos, rcmos, tran, rtran, etc.
- **Edge detection**: posedge, negedge
- **Strength levels**: supply0, supply1, strong0, strong1, weak0, weak1, highz0, highz1
- **Net types**: tri, triand, trior, tri0, tri1, trireg, wand, wor, uwire
- **And many more...**

### ✅ Language Configuration
- Line comments: `//`
- Block comments: `/* */`
- Bracket matching: `{}`, `[]`, `()`
- Auto-closing pairs for brackets and quotes
- Proper string handling

### ✅ Numbers and Operators
- Binary, octal, decimal, and hexadecimal numbers
- Verilog number formats (e.g., `8'b10101010`, `16'hABCD`)
- All standard operators: `+`, `-`, `*`, `/`, `&`, `|`, `^`, `~`, `<<`, `>>`, etc.

## Development

To modify or extend this extension:

1. Open the extension folder in VS Code
2. Press F5 to launch a new VS Code window with the extension loaded
3. Make changes to the files
4. Reload the extension window to see changes

### Key Files
- `package.json` - Extension manifest and configuration
- `extension.js` - Extension entry point and activation logic
- `language-configuration.json` - Language-specific settings (comments, brackets, etc.)
- `syntaxes/verilog.tmLanguage.json` - TextMate grammar for syntax highlighting

## Troubleshooting

**Extension not activating?**
- Ensure the file has a `.v` extension
- Check that the extension is installed correctly
- Reload VS Code window (Ctrl+Shift+P → "Reload Window")

**Syntax highlighting not working?**
- Make sure the file is recognized as Verilog (check language mode in status bar)
- Manually set language: Click language mode → Select "Verilog"

## License

MIT License
