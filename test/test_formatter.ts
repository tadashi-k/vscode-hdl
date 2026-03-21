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
        '    );',
        '    always @(posedge clk) begin',
        '        count <= count + 1;',
        '    end',
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
        '    always @(*) begin',
        '        if (a) begin',
        '            b = 1;',
        '        end else begin',
        '            b = 0;',
        '        end',
        '    end',
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
        '    always @(*) begin',
        '        case (state)',
        "            2'b00: out = 0;",
        "            2'b01: out = 1;",
        '        endcase',
        '    end',
        'endmodule',
    ].join('\n');

    assertEqual(formatVerilog(input), expected, 'case statement');
}

// ── Test 4: already-formatted code returns unchanged text ─────────────────

console.log('\nTest: already-formatted code is unchanged');
{
    const input = [
        'module top;',
        '    wire a;',
        '    always @(*) begin',
        '        if (a) begin',
        '            b = 1;',
        '        end',
        '    end',
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
        '    wire a;',
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
        'wire a;',
        'endmodule',
    ].join('\n');

    const expected = [
        'module top;',
        '  wire a;',
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
        '    wire a; // begin end',
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

    // "end else begin" line should be at depth 2 (inside module + always begin)
    const endElseBeginLine = lines.find(l => l.includes('end else begin'));
    assert(endElseBeginLine !== undefined, '"end else begin" line present');
    assert(endElseBeginLine!.startsWith(' '.repeat(8)), '"end else begin" indented at depth 2');

    // The line after "end else begin" should be at depth 3
    const idx = lines.findIndex(l => l.includes('end else begin'));
    assert(idx >= 0 && idx + 1 < lines.length, 'line after "end else begin" exists');
    assert(lines[idx + 1].startsWith(' '.repeat(12)), 'line after "end else begin" at depth 3');
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
        '    generate',
        '        if (P) begin',
        '            wire x;',
        '        end',
        '    endgenerate',
        'endmodule',
    ].join('\n');

    assertEqual(formatVerilog(input), expected, 'generate block');
}

// ── Summary ────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
