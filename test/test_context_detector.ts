#!/usr/bin/env node
/**
 * Tests for AntlrVerilogParser.parseContext() and AntlrVhdlParser.parseContext().
 *
 * Exercises the context detection logic with various Verilog/VHDL snippets to
 * ensure parseContext() correctly returns 'out_module', 'in_module', or
 * 'in_expression' depending on where the cursor (end of text) lies.
 */

// Set up VS Code mock before requiring any source files
(global as any).vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};

const AntlrVerilogParser = require('../src/verilog-parser');
const AntlrVhdlParser = require('../src/vhdl-parser');

// ── Simple test harness ────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assertEqual(actual: string, expected: string, message: string): void {
    if (actual === expected) {
        console.log(`  ✓ ${message}`);
        passed++;
    } else {
        console.error(`  ✗ ${message}`);
        console.error(`    expected: ${JSON.stringify(expected)}`);
        console.error(`    actual:   ${JSON.stringify(actual)}`);
        failed++;
    }
}

// Helper: return the text up to (not including) the <<CURSOR>> marker.
function parseCursorMarker(src: string): string {
    const marker = '<<CURSOR>>';
    const idx = src.indexOf(marker);
    if (idx < 0) throw new Error('No <<CURSOR>> marker found in test string');
    return src.substring(0, idx);
}

const verilogParser = new AntlrVerilogParser();
const vhdlParser = new AntlrVhdlParser();

// ── Verilog tests ──────────────────────────────────────────────────────────

console.log('\nVerilog: cursor before any module');
assertEqual(
    verilogParser.parseContext(parseCursorMarker(`<<CURSOR>>\nmodule foo;\nendmodule\n`)),
    'out_module', 'cursor before module → out_module'
);

console.log('\nVerilog: cursor after endmodule');
assertEqual(
    verilogParser.parseContext(parseCursorMarker(`
module foo;
endmodule
<<CURSOR>>
`)),
    'out_module', 'cursor after endmodule → out_module'
);

console.log('\nVerilog: cursor in module body (no procedural block)');
assertEqual(
    verilogParser.parseContext(parseCursorMarker(`
module foo;
  wire a;
  <<CURSOR>>
endmodule
`)),
    'in_module', 'cursor in module body → in_module'
);

console.log('\nVerilog: cursor inside always begin/end');
assertEqual(
    verilogParser.parseContext(parseCursorMarker(`
module foo;
  always @(posedge clk) begin
    <<CURSOR>>
  end
endmodule
`)),
    'in_expression', 'cursor inside always begin/end → in_expression'
);

console.log('\nVerilog: cursor inside initial begin/end');
assertEqual(
    verilogParser.parseContext(parseCursorMarker(`
module foo;
  initial begin
    <<CURSOR>>
  end
endmodule
`)),
    'in_expression', 'cursor inside initial begin/end → in_expression'
);

console.log('\nVerilog: cursor after always/initial block has closed');
assertEqual(
    verilogParser.parseContext(parseCursorMarker(`
module foo;
  always @(posedge clk) begin
    a <= 1;
  end
  <<CURSOR>>
endmodule
`)),
    'in_module', 'cursor after closed block → in_module'
);

console.log('\nVerilog: cursor inside nested begin/end within always');
assertEqual(
    verilogParser.parseContext(parseCursorMarker(`
module foo;
  always @(posedge clk) begin
    if (x) begin
      <<CURSOR>>
    end
  end
endmodule
`)),
    'in_expression', 'cursor inside nested begin/end → in_expression'
);

console.log('\nVerilog: cursor in module body after multiple always blocks');
assertEqual(
    verilogParser.parseContext(parseCursorMarker(`
module foo;
  always @(posedge clk) begin
    a <= 1;
  end
  always @* begin
    b = c;
  end
  <<CURSOR>>
endmodule
`)),
    'in_module', 'cursor between always blocks → in_module'
);

console.log('\nVerilog: comments containing always/initial are ignored');
assertEqual(
    verilogParser.parseContext(parseCursorMarker(`
module foo;
  // always @(posedge clk) begin
  /* initial begin */
  <<CURSOR>>
endmodule
`)),
    'in_module', 'commented always/initial ignored → in_module'
);

console.log('\nVerilog: cursor in second module, first module has always block');
assertEqual(
    verilogParser.parseContext(parseCursorMarker(`
module foo;
  always @(posedge clk) begin
    a <= 1;
  end
endmodule

module bar;
  <<CURSOR>>
endmodule
`)),
    'in_module', 'previous module always block does not affect second module → in_module'
);

console.log('\nVerilog: no always/initial keyword before cursor');
assertEqual(
    verilogParser.parseContext(parseCursorMarker(`
module foo;
  wire a;
  reg b;
  <<CURSOR>>
`)),
    'in_module', 'no always/initial → in_module'
);

console.log('\nVerilog: unclosed block comment suppresses always keyword');
assertEqual(
    verilogParser.parseContext(parseCursorMarker(`
module foo;
  /* always @(posedge clk) begin
    <<CURSOR>>
`)),
    'in_module', 'unclosed block comment suppresses always → in_module'
);

console.log('\nVerilog: cursor inside incomplete assign expression');
assertEqual(
    verilogParser.parseContext(parseCursorMarker(`
module foo;
  wire a;
  assign a = <<CURSOR>>
endmodule
`)),
    'in_expression', 'cursor in assign RHS → in_expression'
);

// ── VHDL tests ─────────────────────────────────────────────────────────────

console.log('\nVHDL: cursor before any architecture');
assertEqual(
    vhdlParser.parseContext(parseCursorMarker(`
entity foo is end;
<<CURSOR>>
architecture rtl of foo is
begin
end architecture;
`)),
    'out_module', 'cursor before architecture → out_module'
);

console.log('\nVHDL: cursor in architecture declarative region');
assertEqual(
    vhdlParser.parseContext(parseCursorMarker(`
architecture rtl of foo is
  signal a : std_logic;
  <<CURSOR>>
begin
end architecture;
`)),
    'in_module', 'cursor in declarative region → in_module'
);

console.log('\nVHDL: cursor in architecture concurrent body (not in process)');
assertEqual(
    vhdlParser.parseContext(parseCursorMarker(`
architecture rtl of foo is
begin
  <<CURSOR>>
end architecture;
`)),
    'in_module', 'cursor in concurrent body → in_module'
);

console.log('\nVHDL: cursor inside open process body');
assertEqual(
    vhdlParser.parseContext(parseCursorMarker(`
architecture rtl of foo is
begin
  process(clk)
  begin
    <<CURSOR>>
  end process;
end architecture;
`)),
    'in_expression', 'cursor inside process begin...end → in_expression'
);

console.log('\nVHDL: cursor after closed process');
assertEqual(
    vhdlParser.parseContext(parseCursorMarker(`
architecture rtl of foo is
begin
  process(clk)
  begin
    a <= b;
  end process;
  <<CURSOR>>
end architecture;
`)),
    'in_module', 'cursor after end process → in_module'
);

// ── Summary ────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
