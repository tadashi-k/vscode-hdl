/**
 * Tests for preprocessVerilog – the Verilog compile-directive preprocessor.
 * Covers `define macro expansion, `include file inlining, and directive stripping.
 */

import { preprocessVerilog } from '../src/verilog-scanner';
import * as path from 'path';

function runTests() {
    console.log('Running Verilog Preprocessor Tests...\n');
    console.log('='.repeat(60));

    let totalTests = 0;
    let passedTests = 0;

    // Helper
    function assert(condition, testName, detail?) {
        totalTests++;
        if (condition) {
            console.log(`  ✓ ${testName} PASSED`);
            passedTests++;
        } else {
            console.log(`  ✗ ${testName} FAILED${detail ? ': ' + detail : ''}`);
        }
    }

    // ------------------------------------------------------------------ //
    // `define expansion
    // ------------------------------------------------------------------ //

    console.log('\n--- `define tests ---');

    {
        const src = '`define WIDTH 8\nwire [`WIDTH-1:0] bus;';
        const result = preprocessVerilog(src, null, null);
        const lines = result.split('\n');
        // define line is blanked
        assert(lines[0].trim() === '', 'define line becomes blank');
        // macro is expanded in subsequent lines
        assert(lines[1].includes('8-1:0'), 'macro expanded in source line', `got: ${lines[1]}`);
    }

    {
        // `define with no value
        const src = '`define RESET_ACTIVE\nwire x;';
        const result = preprocessVerilog(src, null, null);
        assert(result.split('\n')[0].trim() === '', 'valueless define line becomes blank');
        assert(result.split('\n')[1] === 'wire x;', 'non-directive line unchanged when no substitution needed');
    }

    {
        // Multi-use macro replacement
        const src = '`define CLK_PERIOD 10\nassign #`CLK_PERIOD out = in;';
        const result = preprocessVerilog(src, null, null);
        assert(result.includes('10'), 'macro value substituted');
        assert(!result.includes('`CLK_PERIOD'), 'original macro token gone');
    }

    {
        // Unknown backtick identifier left untouched
        const src = 'wire [`UNKNOWN-1:0] bus;';
        const result = preprocessVerilog(src, null, null);
        assert(result.includes('`UNKNOWN'), 'undefined macro left intact');
    }

    // ------------------------------------------------------------------ //
    // `undef
    // ------------------------------------------------------------------ //

    console.log('\n--- `undef tests ---');

    {
        const src = '`define FOO bar\n`undef FOO\nwire `FOO;';
        const result = preprocessVerilog(src, null, null);
        // After undef, `FOO should not be replaced
        assert(result.split('\n')[2].includes('`FOO'), 'undef removes macro definition');
    }

    // ------------------------------------------------------------------ //
    // Other directives stripped
    // ------------------------------------------------------------------ //

    console.log('\n--- Directive stripping tests ---');

    {
        const src = '`timescale 1ns/1ps\nmodule m; endmodule';
        const result = preprocessVerilog(src, null, null);
        const lines = result.split('\n');
        assert(lines[0].trim() === '', 'timescale directive blanked');
        assert(lines[1] === 'module m; endmodule', 'module line after timescale unchanged');
    }

    {
        const directives = ['`ifdef SOMETHING', '`ifndef SOMETHING', '`else', '`elsif COND',
                            '`endif', '`default_nettype none', '`resetall', '`celldefine',
                            '`endcelldefine', '`pragma something 1'];
        for (const d of directives) {
            const result = preprocessVerilog(d, null, null);
            assert(result.trim() === '', `directive stripped: ${d}`);
        }
    }

    // ------------------------------------------------------------------ //
    // Block comment handling
    // ------------------------------------------------------------------ //

    console.log('\n--- Block comment tests ---');

    {
        // `define inside a block comment should be ignored
        const src = '/* `define IGNORED 99 */\nwire x;';
        const result = preprocessVerilog(src, null, null);
        assert(!result.includes('IGNORED'), 'define inside block comment ignored');
        assert(result.includes('wire x;'), 'source after block comment preserved');
    }

    {
        // Multi-line block comment containing directives: all should be ignored,
        // and line numbering should be preserved (same number of lines).
        const src = '/*\n`define IGNORED 99\n`timescale 1ns/1ps\n*/\nwire x;';
        const result = preprocessVerilog(src, null, null);
        const lines = result.split('\n');
        assert(lines.length === 5, 'multi-line block comment preserves line count');
        assert(!result.includes('IGNORED'), 'define inside multi-line block comment ignored');
        assert(result.includes('wire x;'), 'source after multi-line block comment preserved');
    }

    // ------------------------------------------------------------------ //
    // `include expansion
    // ------------------------------------------------------------------ //

    console.log('\n--- `include tests ---');

    {
        // Simple include: inline a file's content
        const includeContent = 'wire included_wire;';
        const fileMap: Record<string, string> = {
            [path.resolve('/base', 'myinclude.vh')]: includeContent,
        };
        const fileReader = (p: string) => fileMap[p] ?? null;

        const src = '`include "myinclude.vh"\nmodule m; endmodule';
        const result = preprocessVerilog(src, '/base', fileReader);
        assert(result.includes('wire included_wire;'), 'included file content inlined');
        assert(result.includes('module m; endmodule'), 'source after include preserved');
    }

    {
        // include with angle brackets
        const fileMap: Record<string, string> = {
            [path.resolve('/base', 'lib.vh')]: 'wire lib_wire;',
        };
        const fileReader = (p: string) => fileMap[p] ?? null;

        const src = '`include <lib.vh>\nwire x;';
        const result = preprocessVerilog(src, '/base', fileReader);
        assert(result.includes('wire lib_wire;'), 'angle-bracket include inlined');
    }

    {
        // include with defines in the included file
        const fileMap: Record<string, string> = {
            [path.resolve('/base', 'defs.vh')]: '`define DATA_W 16',
        };
        const fileReader = (p: string) => fileMap[p] ?? null;

        const src = '`include "defs.vh"\nwire [`DATA_W-1:0] bus;';
        const result = preprocessVerilog(src, '/base', fileReader);
        assert(result.includes('16-1:0'), 'macro defined in included file expanded in parent', `got: ${result}`);
    }

    {
        // Circular include guard: same file included twice should not loop
        const fileMap: Record<string, string> = {
            [path.resolve('/base', 'a.vh')]: '`include "a.vh"\nwire cycle_wire;',
        };
        const fileReader = (p: string) => fileMap[p] ?? null;

        let threw = false;
        let result = '';
        try {
            result = preprocessVerilog('`include "a.vh"', '/base', fileReader);
        } catch (_) {
            threw = true;
        }
        assert(!threw, 'circular include does not throw');
        assert(result.includes('wire cycle_wire;'), 'first include of circular file is inlined');
    }

    {
        // Missing file: silently treated as empty include
        const fileReader = (_p: string) => null;
        const src = '`include "missing.vh"\nwire x;';
        let threw = false;
        try {
            preprocessVerilog(src, '/base', fileReader);
        } catch (_) {
            threw = true;
        }
        assert(!threw, 'missing include file does not throw');
    }

    {
        // No fileReader: include directive is blanked, no expansion
        const src = '`include "something.vh"\nwire x;';
        const result = preprocessVerilog(src, '/base', null);
        assert(!result.includes('something'), 'no fileReader: include directive blanked');
        assert(result.includes('wire x;'), 'source after skipped include preserved');
    }

    // ------------------------------------------------------------------ //
    // Line number preservation
    // ------------------------------------------------------------------ //

    console.log('\n--- Line number preservation tests ---');

    {
        const src = '`timescale 1ns/1ps\n`define W 4\nmodule m(input wire [`W-1:0] a); endmodule';
        const result = preprocessVerilog(src, null, null);
        const lines = result.split('\n');
        assert(lines.length === 3, 'output has same number of lines as input');
        assert(lines[2].includes('4-1:0'), 'macro replaced on correct line');
    }

    // ------------------------------------------------------------------ //
    // Summary
    // ------------------------------------------------------------------ //

    console.log('\n' + '='.repeat(60));
    console.log(`\nTest Results: ${passedTests}/${totalTests} tests passed`);
    console.log('='.repeat(60));

    return passedTests === totalTests;
}

const success = runTests();
process.exit(success ? 0 : 1);
