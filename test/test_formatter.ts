#!/usr/bin/env node
/**
 * Tests for the Verilog document formatter.
 *
 * Verifies that formatVerilog() correctly re-indents Verilog source code and
 * that the DocumentRangeFormattingEditProvider returns edits only within the
 * requested range.
 */

import { formatVerilog } from '../src/verilog-formatter';

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

function assertEqual(actual: string, expected: string, message: string): void {
    if (actual === expected) {
        console.log(`  ✓ ${message}`);
        passed++;
    } else {
        console.error(`  ✗ ${message}`);
        console.error(`    expected:\n${expected.split('\n').map(l => '      |' + l).join('\n')}`);
        console.error(`    actual:\n${actual.split('\n').map(l => '      |' + l).join('\n')}`);
        failed++;
    }
}

// ── Test 1: basic module indentation ─────────────────────────────────────

console.log('\nTest: basic module indentation');
{
    const input = [
        'module counter (',
        'input clk,',
        'output reg [7:0] count',
        ');',
        'always @(posedge clk) begin',
        'count <= count + 1;',
        'end',
        'endmodule',
    ].join('\n');

    const expected = [
        'module counter (',
        '    input clk,',
        '    output reg [7:0] count',
        ');',
        'always @(posedge clk) begin',
        '    count <= count + 1;',
        'end',
        'endmodule',
    ].join('\n');

    assertEqual(formatVerilog(input), expected, 'basic module indentation');
}

// ── Test 2: nested begin/end ──────────────────────────────────────────────

console.log('\nTest: nested begin/end blocks');
{
    const input = [
        'module top;',
        'always @(*) begin',
        'if (a) begin',
        'b = 1;',
        'end else begin',
        'b = 0;',
        'end',
        'end',
        'endmodule',
    ].join('\n');

    const expected = [
        'module top;',
        'always @(*) begin',
        '    if (a) begin',
        '        b = 1;',
        '    end else begin',
        '        b = 0;',
        '    end',
        'end',
        'endmodule',
    ].join('\n');

    assertEqual(formatVerilog(input), expected, 'nested begin/end');
}

// ── Test 3: case statement ────────────────────────────────────────────────

console.log('\nTest: case statement indentation');
{
    const input = [
        'module fsm;',
        'always @(*) begin',
        'case (state)',
        "2'b00: out = 0;",
        "2'b01: out = 1;",
        'endcase',
        'end',
        'endmodule',
    ].join('\n');

    const expected = [
        'module fsm;',
        'always @(*) begin',
        '    case (state)',
        "        2'b00: out = 0;",
        "        2'b01: out = 1;",
        '    endcase',
        'end',
        'endmodule',
    ].join('\n');

    assertEqual(formatVerilog(input), expected, 'case statement');
}

// ── Test 4: already-formatted code returns unchanged text ─────────────────

console.log('\nTest: already-formatted code is unchanged');
{
    const input = [
        'module top;',
        'wire a;',
        'always @(*) begin',
        '    if (a) begin',
        '        b = 1;',
        '    end',
        'end',
        'endmodule',
    ].join('\n');

    assertEqual(formatVerilog(input), input, 'already-formatted code unchanged');
}

// ── Test 5: empty lines preserved ────────────────────────────────────────

console.log('\nTest: empty lines are preserved');
{
    const input = [
        'module top;',
        '',
        'wire a;',
        '',
        'endmodule',
    ].join('\n');

    const expected = [
        'module top;',
        '',
        'wire a;',
        '',
        'endmodule',
    ].join('\n');

    assertEqual(formatVerilog(input), expected, 'empty lines preserved');
}

// ── Test 6: custom indent size ────────────────────────────────────────────

console.log('\nTest: custom indent size (2 spaces)');
{
    const input = [
        'module top;',
        'reg a;',
        'begin',
        'a = 0;',
        'end',
        'endmodule',
    ].join('\n');

    const expected = [
        'module top;',
        'reg a;',
        'begin',
        '  a = 0;',
        'end',
        'endmodule',
    ].join('\n');

    assertEqual(formatVerilog(input, 2), expected, '2-space indent');
}

// ── Test 7: keyword in comment not counted ────────────────────────────────

console.log('\nTest: keyword inside line comment not counted');
{
    const input = [
        'module top;',
        'wire a; // begin end',
        'endmodule',
    ].join('\n');

    const expected = [
        'module top;',
        'wire a; // begin end',
        'endmodule',
    ].join('\n');

    assertEqual(formatVerilog(input), expected, 'keywords in comments ignored');
}

// ── Test 8: end else begin (net zero change) ──────────────────────────────

console.log('\nTest: end else begin net indent change is zero');
{
    const input = [
        'module top;',
        'always @(*) begin',
        'if (a) begin',
        'x = 1;',
        'end else begin',
        'x = 0;',
        'end',
        'end',
        'endmodule',
    ].join('\n');

    const formatted = formatVerilog(input);
    const lines = formatted.split('\n');

    // "end else begin" line should be at depth 1 (inside module + always begin)
    const endElseBeginLine = lines.find(l => l.includes('end else begin'));
    assert(endElseBeginLine !== undefined, '"end else begin" line present');
    assert(endElseBeginLine!.startsWith(' '.repeat(4)), '"end else begin" indented at depth 1');

    // The line after "end else begin" should be at depth 2
    const idx = lines.findIndex(l => l.includes('end else begin'));
    assert(idx >= 0 && idx + 1 < lines.length, 'line after "end else begin" exists');
    assert(lines[idx + 1].startsWith(' '.repeat(8)), 'line after "end else begin" at depth 2');
}

// ── Test 9: generate block ────────────────────────────────────────────────

console.log('\nTest: generate block indentation');
{
    const input = [
        'module top;',
        'generate',
        'if (P) begin',
        'wire x;',
        'end',
        'endgenerate',
        'endmodule',
    ].join('\n');

    const expected = [
        'module top;',
        'generate',
        '    if (P) begin',
        '        wire x;',
        '    end',
        'endgenerate',
        'endmodule',
    ].join('\n');

    assertEqual(formatVerilog(input), expected, 'generate block');
}

// ── Test 10: module definition with '(' and ')' ───────────────────────────

console.log('\nTest: module definition with parameter list and port list');
{
    const input = [
        'module counter #(',
        'parameter N = 8',
        ') (',
        'input clk,',
        'output reg [N-1:0] count',
        ');',
        'endmodule',
    ].join('\n');

    const expected = [
        'module counter #(',
        '    parameter N = 8',
        ') (',
        '    input clk,',
        '    output reg [N-1:0] count',
        ');',
        'endmodule',
    ].join('\n');

    assertEqual(formatVerilog(input), expected, 'module definition with ( and )');
}

// ── Test 11: module instantiation with parameter assignment ───────────────

console.log('\nTest: module instantiation with parameter assignment');
{
    const input = [
        'module top;',
        'submod #(',
        '.PARAM1(8),',
        '.PARAM2(4)',
        ') inst (',
        '.clk(clk),',
        '.data(data)',
        ');',
        'endmodule',
    ].join('\n');

    const expected = [
        'module top;',
        'submod #(',
        '    .PARAM1(8),',
        '    .PARAM2(4)',
        ') inst (',
        '    .clk(clk),',
        '    .data(data)',
        ');',
        'endmodule',
    ].join('\n');

    assertEqual(formatVerilog(input), expected, 'module instantiation with parameter assignment');
}

// ── Test 12: if and for without begin/end ───────────────

console.log('\nTest: always, if and for without begin/end');
{
    const input = [
        'module top;',
        'always @(*)',
        'a = 0;',
        '',
        'always @(*) begin',
        'if (a)',
        'b = 1;',
        'for (i = 0; i < N; i++)',
        'x[i] = 0;',
        'end',
        'endmodule',
    ].join('\n');

    const expected = [
        'module top;',
        'always @(*)',
        '    a = 0;',
        '',
        'always @(*) begin',
        '    if (a)',
        '        b = 1;',
        '    for (i = 0; i < N; i++)',
        '        x[i] = 0;',
        'end',
        'endmodule',
    ].join('\n');

    assertEqual(formatVerilog(input), expected, 'Test: if and for without begin/end');
}

// ── Test 13: initial block without begin/end ──────────────────────────────

console.log('\nTest: initial block without begin/end');
{
    const input = [
        'module top;',
        'initial',
        'a = 0;',
        'endmodule',
    ].join('\n');

    const expected = [
        'module top;',
        'initial',
        '    a = 0;',
        'endmodule',
    ].join('\n');

    assertEqual(formatVerilog(input), expected, 'initial block without begin/end');
}

// ── Test 14: while without begin/end ─────────────────────────────────────

console.log('\nTest: while without begin/end');
{
    const input = [
        'module top;',
        'always @(*) begin',
        'while (cond)',
        'a = a + 1;',
        'end',
        'endmodule',
    ].join('\n');

    const expected = [
        'module top;',
        'always @(*) begin',
        '    while (cond)',
        '        a = a + 1;',
        'end',
        'endmodule',
    ].join('\n');

    assertEqual(formatVerilog(input), expected, 'while without begin/end');
}

// ── Test 15: repeat without begin/end ────────────────────────────────────

console.log('\nTest: repeat without begin/end');
{
    const input = [
        'module top;',
        'always @(*) begin',
        'repeat (10)',
        'a = a + 1;',
        'end',
        'endmodule',
    ].join('\n');

    const expected = [
        'module top;',
        'always @(*) begin',
        '    repeat (10)',
        '        a = a + 1;',
        'end',
        'endmodule',
    ].join('\n');

    assertEqual(formatVerilog(input), expected, 'repeat without begin/end');
}

// ── Test 16: forever without begin/end ───────────────────────────────────

console.log('\nTest: forever without begin/end');
{
    const input = [
        'module top;',
        'always begin',
        'forever',
        'clk = ~clk;',
        'end',
        'endmodule',
    ].join('\n');

    const expected = [
        'module top;',
        'always begin',
        '    forever',
        '        clk = ~clk;',
        'end',
        'endmodule',
    ].join('\n');

    assertEqual(formatVerilog(input), expected, 'forever without begin/end');
}

// ── Test 17: if/else without begin/end ───────────────────────────────────

console.log('\nTest: if/else without begin/end');
{
    const input = [
        'module top;',
        'always @(*) begin',
        'if (a)',
        'x = 1;',
        'else',
        'x = 0;',
        'end',
        'endmodule',
    ].join('\n');

    const expected = [
        'module top;',
        'always @(*) begin',
        '    if (a)',
        '        x = 1;',
        '    else',
        '        x = 0;',
        'end',
        'endmodule',
    ].join('\n');

    assertEqual(formatVerilog(input), expected, 'if/else without begin/end');
}

// ── Test 18: nested if without begin/end ─────────────────────────────────

console.log('\nTest: nested if without begin/end');
{
    const input = [
        'module top;',
        'always @(*) begin',
        'if (a)',
        'if (b)',
        'x = 1;',
        'end',
        'endmodule',
    ].join('\n');

    const expected = [
        'module top;',
        'always @(*) begin',
        '    if (a)',
        '        if (b)',
        '            x = 1;',
        'end',
        'endmodule',
    ].join('\n');

    assertEqual(formatVerilog(input), expected, 'nested if without begin/end');
}

// ── Summary ────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
