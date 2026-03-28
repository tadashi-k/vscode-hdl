# HDL Language Support for VS Code

A Visual Studio Code extension that provides syntax highlighting, symbol extraction, goto definition, and syntax error detection for Verilog (`*.v`) and VHDL (`*.vhd`, `*.vhdl`) files.

## Features

### Verilog

- **Syntax Highlighting**: Comprehensive syntax highlighting for Verilog reserved words
- **Syntax Error Detection**: Real-time parsing and error detection with diagnostics displayed in the editor
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

### VHDL

- **Syntax Highlighting**: Comprehensive syntax highlighting for VHDL reserved words
- **Syntax Error Detection**: Real-time ANTLR4-based parsing and error detection
- **Symbol Extraction**: Automatically extracts entities, architectures, ports, signals, generics, constants, and component instantiations
- **Outline View**: Hierarchical symbol tree showing entities with their ports and internal signals
- **Hover Information**: Shows port mode and type (e.g., `input std_logic_vector(7 downto 0)`)
- **Goto Definition**: Navigate to port, signal, constant, and generic declarations within the same file or across the workspace
- **Code Completion**: Auto-generates component instantiation snippets with full generic maps and port maps
- **File Detection**: Automatically detects and activates for `*.vhd` and `*.vhdl` files

## Verilog Parser and Syntax Error Detection

The extension includes a comprehensive Verilog parser that performs real-time syntax checking. Errors are displayed directly in the editor with squiggly underlines and detailed error messages.

## Verilog Warning Conditions

The extension performs semantic analysis beyond syntax checking and generates warnings for the following typical conditions:

### Never Used / Never Assigned Signal

- **Never used**: A signal is declared but never appears as an r-value in any expression or port connection.

```verilog
module example (
    input wire clk,
    output reg [7:0] data_out
);
    wire unused_signal;  // Warning: 'unused_signal' is declared but never used
    reg [7:0] count;

    always @(posedge clk)
        data_out <= count;
endmodule
```

- **Never assigned**: An output port or internal signal is never given a value (never appears as an l-value).

```verilog
module example (
    input wire clk,
    output reg [7:0] data_out
);
    wire undriven;       // Warning: 'undriven' is never assigned
    reg [7:0] count;     // Warning: 'count' is never assigned

    always @(posedge clk)
        data_out <= 8'b0;
endmodule
```

### Not Declared Signal

A signal is referenced in an expression but has not been declared in the module.

```verilog
module example (
    input wire clk,
    output reg [7:0] count
);
    always @(posedge clk)
        count <= undeclared_signal;  // Warning: 'undeclared_signal' is referenced but not declared
endmodule
```

### Bit Width Mismatch

The extension detects bit width mismatches in assignments and port connections.

- **Assignment mismatch**: The left-hand side and right-hand side of an assignment have different bit widths.

```verilog
module example (
    input wire [7:0] data_in,
    output reg [7:0] data_out
);
    wire valid;
    assign valid = data_in[0];       // OK: both sides are 1 bit

    always @(*) begin
        // Warning: 'data_out' has width 8, but expression has width 9
        data_out <= {valid, data_in};
    end
endmodule
```

- **Port connection mismatch**: A signal connected to a module port has a different bit width than the port.

```verilog
module top (
    input wire clk,
    input wire reset
);
    wire [15:0] wide_signal;

    counter u_counter (
        .clk(clk),
        .reset(reset),
        // Warning: Port 'count_in' has width 8, but connected signal 'wide_signal' has width 16
        .count_in(wide_signal),
        .count_out()
    );
endmodule
```

### Not Defined Module

A module instantiation refers to a module name that is not found anywhere in the workspace.

```verilog
module top (
    input wire clk
);
    // Warning: Module 'undefined_module' is not defined
    undefined_module u_inst (
        .clk(clk)
    );
endmodule
```

### Unconnected Port

When using named port connections (`.port(signal)` style), if a port of the instantiated module is not listed at all, the extension warns about the omitted port.  An explicit empty connection (`.port()`) is recognised as an intentionally unconnected port and does **not** trigger a warning.

```verilog
module top (
    input wire clk,
    input wire reset
);
    reg [7:0] init_val;

    // Warning on counter_i: 'count_out' unconnected
    // (.reset() is an explicit empty connection, so no warning for reset)
    counter counter_i (
        .clk(clk),
        .reset(),
        .count_in(init_val)
        // .count_out is missing entirely → warning
    );
endmodule
```

## VHDL Parser and Syntax Error Detection

The extension includes an ANTLR4-based VHDL parser (VHDL 2008 grammar) that performs real-time syntax checking. Errors are displayed directly in the editor with squiggly underlines and detailed error messages. VHDL keywords and identifiers are matched case-insensitively.

## VHDL Warning Conditions

The extension performs semantic analysis and generates warnings for the following conditions:

### Signal Declared but Never Used (VHDL-W1)

A signal declared in an architecture is never read in any expression.

```vhdl
architecture rtl of example is
    signal unused_sig : std_logic;  -- Warning: 'unused_sig' is declared but never used
begin
end architecture;
```

### Input Port Used as L-Value (VHDL-W2)

An `in` mode port appears on the left side of an assignment.

```vhdl
architecture rtl of example is
begin
    process(clk)
    begin
        clk <= '0';  -- Warning: Input port 'clk' cannot be used as l-value
    end process;
end architecture;
```

### Signal Never Assigned (VHDL-W3)

A signal declared in an architecture is never driven.

```vhdl
architecture rtl of example is
    signal never_driven : std_logic;  -- Warning: 'never_driven' is never assigned
begin
end architecture;
```

### Unconnected Port (VHDL-W4)

When using named port map connections, a port of the instantiated entity is not listed.

```vhdl
architecture rtl of top is
begin
    -- Warning: Port 'b' unconnected in instantiation of 'submod'
    u1 : entity work.submod
        port map (a => sig_a);  -- 'b' is missing entirely
end architecture;
```

### Not Defined Entity (VHDL-W5)

A component instantiation references an entity not found anywhere in the workspace.

```vhdl
architecture rtl of top is
begin
    -- Warning: Entity 'ghost_entity' is not defined in the module database
    u1 : entity work.ghost_entity
        port map (clk => clk);
end architecture;
```

## VHDL Symbol Database

The extension maintains a workspace-wide entity database for VHDL:

- **Entities**: All entity declarations with their port and generic lists
- **Ports**: Direction (`in`, `out`, `inout`, `buffer`) and type information
- **Generics**: Parameterizable constants with default values
- **Signals / Variables / Constants**: Internal declarations within architectures and processes
- **Component Instantiations**: Tracked for cross-module connectivity analysis

The database is automatically updated when VHDL files are opened, modified, or deleted.

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

- execute 'npm run pack' or download from release
- select 'Install from VSIX...' in Extension side panel

## Usage

Simply open any file with the `.v` extension (Verilog) or `.vhd` / `.vhdl` extension (VHDL), and the extension will automatically:
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
3. Open a `.v` or `.vhd` file to see the syntax highlighting and symbol extraction in action
4. Use the command "Verilog: Show Symbols Database" to view extracted symbols

## License

MIT
