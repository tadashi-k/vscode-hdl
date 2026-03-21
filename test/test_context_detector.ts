#!/usr/bin/env node
/**
 * Tests for isInsideProceduralBlock().
 *
 * Exercises the context-detector logic with various Verilog snippets to
 * ensure the function correctly identifies whether a cursor offset lies
 * inside an always/initial procedural block or in the module body.
 */

const { isInsideProceduralBlock } = require('../src/context-detector');

// ── Simple test harness ────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
    if (condition) {
        console.log(`  ✓ ${message}`);
        passed++;
    } else {
        console.error(`  ✗ ${message}`);
        failed++;
    }
}

// Helper: return the byte offset just before the marker string "<<CURSOR>>"
// within src, after removing the marker.
function parseCursorMarker(src: string): { text: string; offset: number } {
    const marker = '<<CURSOR>>';
    const idx = src.indexOf(marker);
    if (idx < 0) throw new Error('No <<CURSOR>> marker found in test string');
    return { text: src.replace(marker, ''), offset: idx };
}

// ── Tests ─────────────────────────────────────────────────────────────────

console.log('\nTest: cursor outside any block (module body)');
{
    const { text, offset } = parseCursorMarker(`
module foo;
  wire a;
  <<CURSOR>>
endmodule
`);
    assert(!isInsideProceduralBlock(text, offset), 'returns false outside any block');
}

console.log('\nTest: cursor inside always begin/end');
{
    const { text, offset } = parseCursorMarker(`
module foo;
  always @(posedge clk) begin
    <<CURSOR>>
  end
endmodule
`);
    assert(isInsideProceduralBlock(text, offset), 'returns true inside always begin/end');
}

console.log('\nTest: cursor inside initial begin/end');
{
    const { text, offset } = parseCursorMarker(`
module foo;
  initial begin
    <<CURSOR>>
  end
endmodule
`);
    assert(isInsideProceduralBlock(text, offset), 'returns true inside initial begin/end');
}

console.log('\nTest: cursor after always/initial block has closed');
{
    const { text, offset } = parseCursorMarker(`
module foo;
  always @(posedge clk) begin
    a <= 1;
  end
  <<CURSOR>>
endmodule
`);
    assert(!isInsideProceduralBlock(text, offset), 'returns false after block has closed');
}

console.log('\nTest: cursor inside nested begin/end within always');
{
    const { text, offset } = parseCursorMarker(`
module foo;
  always @(posedge clk) begin
    if (x) begin
      <<CURSOR>>
    end
  end
endmodule
`);
    assert(isInsideProceduralBlock(text, offset), 'returns true inside nested always block');
}

console.log('\nTest: cursor in module body after multiple always blocks');
{
    const { text, offset } = parseCursorMarker(`
module foo;
  always @(posedge clk) begin
    a <= 1;
  end
  always @* begin
    b = c;
  end
  <<CURSOR>>
endmodule
`);
    assert(!isInsideProceduralBlock(text, offset), 'returns false between always blocks');
}

console.log('\nTest: comments containing always/initial are ignored');
{
    const { text, offset } = parseCursorMarker(`
module foo;
  // always @(posedge clk) begin
  /* initial begin */
  <<CURSOR>>
endmodule
`);
    assert(!isInsideProceduralBlock(text, offset), 'comments with always/initial are ignored');
}

console.log('\nTest: cursor in second module, first module has always block');
{
    const { text, offset } = parseCursorMarker(`
module foo;
  always @(posedge clk) begin
    a <= 1;
  end
endmodule

module bar;
  <<CURSOR>>
endmodule
`);
    assert(!isInsideProceduralBlock(text, offset), 'previous module always block does not affect second module');
}

console.log('\nTest: no always/initial keyword before cursor');
{
    const { text, offset } = parseCursorMarker(`
module foo;
  wire a;
  reg b;
  <<CURSOR>>
`);
    assert(!isInsideProceduralBlock(text, offset), 'returns false when no always/initial found');
}

console.log('\nTest: cursor inside unclosed block comment spanning an always block');
{
    // The cursor is technically inside a block comment that was never closed;
    // the unclosed-comment stripping should neutralise the always keyword.
    const { text, offset } = parseCursorMarker(`
module foo;
  /* always @(posedge clk) begin
    <<CURSOR>>
`);
    assert(!isInsideProceduralBlock(text, offset), 'unclosed block comment suppresses always keyword');
}

// ── Summary ────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
