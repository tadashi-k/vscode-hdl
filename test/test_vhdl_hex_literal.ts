#!/usr/bin/env node
/**
 * Tests for VHDL-2008 bit-string literals with size/modifier prefix.
 *
 * Exercises forms such as:
 *   8x"FF"     — 8-bit hex
 *   4b"1010"   — 4-bit binary
 *   6o"17"     — 6-bit octal
 *   16x"ABCD"  — 16-bit hex
 *   12ux"FAB"  — unsigned 12-bit hex (VHDL-2008 modifier)
 *   8sx"7F"    — signed 8-bit hex
 *
 * The ANTLR-based parser must parse these without generating errors and must
 * still correctly extract entity names, ports, and generics.
 */

(global as any).vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};

import * as path from 'path';
import * as fs from 'fs';

const AntlrVhdlParser = require('../src/vhdl-parser');
const { ModuleDatabase } = require('../src/database');

// ── Test harness ───────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
    if (condition) { console.log(`  ✓ ${message}`); passed++; }
    else           { console.error(`  ✗ ${message}`); failed++; }
}

function assertEqual(actual: any, expected: any, message: string): void {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) { console.log(`  ✓ ${message}`); passed++; }
    else {
        console.error(`  ✗ ${message}`);
        console.error(`    expected: ${JSON.stringify(expected)}`);
        console.error(`    actual:   ${JSON.stringify(actual)}`);
        failed++;
    }
}

const contentsDir = path.join(__dirname, '..', 'contents', 'vhdl');

function makeDoc(filename: string) {
    const text = fs.readFileSync(path.join(contentsDir, filename), 'utf8');
    return {
        getText: () => text,
        uri: { toString: () => `file://${path.join(contentsDir, filename)}` }
    };
}

function makeInlineDoc(text: string, name = 'inline.vhd') {
    return {
        getText: () => text,
        uri: { toString: () => `file:///test/${name}` }
    };
}

// ── Test: file-based — test_hex_literal.vhd ────────────────────────────────────

console.log('\nTest: VHDL-2008 bit-string literals — entity extraction');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseModules(makeDoc('test_hex_literal.vhd'), db);
    const mod = db.getModule('test_hex_literal');

    assert(mod !== undefined, 'entity test_hex_literal found');

    const ports = mod?.ports ?? [];
    assertEqual(ports.length, 3, 'entity has 3 ports');

    const clk  = ports.find((p: any) => p.name === 'clk');
    const din  = ports.find((p: any) => p.name === 'din');
    const dout = ports.find((p: any) => p.name === 'dout');

    assert(clk  !== undefined, 'clk port exists');
    assert(din  !== undefined, 'din port exists');
    assert(dout !== undefined, 'dout port exists');
    assert(clk?.direction  === 'input',  'clk is input');
    assert(din?.direction  === 'input',  'din is input');
    assert(dout?.direction === 'output', 'dout is output');

    const params = mod?.parameterList ?? [];
    assertEqual(params.length, 3, 'entity has 3 generics');
    assert(params.find((p: any) => p.name === 'MASK')    !== undefined, 'MASK generic found');
    assert(params.find((p: any) => p.name === 'INIT')    !== undefined, 'INIT generic found');
    assert(params.find((p: any) => p.name === 'OCT_DEF') !== undefined, 'OCT_DEF generic found');
}

// ── Test: no parse errors from VHDL-2008 hex literals ─────────────────────────

console.log('\nTest: VHDL-2008 bit-string literals — no parse errors');
{
    const cases: Array<{ label: string; literal: string; entity: string }> = [
        { label: '8x"FF"  (hex with size)',       literal: '8x"FF"',       entity: 'e_hex_8'    },
        { label: '16x"ABCD" (hex 16-bit)',         literal: '16x"ABCD"',    entity: 'e_hex_16'   },
        { label: '4b"1010" (binary with size)',    literal: '4b"1010"',     entity: 'e_bin_4'    },
        { label: '6o"17"  (octal with size)',      literal: '6o"17"',       entity: 'e_oct_6'    },
        { label: '12ux"FAB" (unsigned hex)',       literal: '12ux"FAB"',    entity: 'e_uhex_12'  },
        { label: '8sx"7F"  (signed hex)',          literal: '8sx"7F"',      entity: 'e_shex_8'   },
        { label: '8sb"01111111" (signed binary)',  literal: '8sb"01111111"',entity: 'e_sbin_8'   },
        { label: '6so"37"  (signed octal)',        literal: '6so"37"',      entity: 'e_soct_6'   },
    ];

    for (const { label, literal, entity } of cases) {
        const vhdl = `
library ieee;
use ieee.std_logic_1164.all;
entity ${entity} is
    port (clk : in std_logic);
end entity ${entity};
architecture rtl of ${entity} is
    constant C : std_logic_vector(15 downto 0) := ${literal};
begin
    process(clk) begin
        if rising_edge(clk) then null; end if;
    end process;
end architecture rtl;
`;
        const db = new ModuleDatabase();
        const parser = new AntlrVhdlParser();
        parser.parseSymbols(makeInlineDoc(vhdl, `${entity}.vhd`), db, null);
        const errors = parser.getDiagnostics(db).filter((d: any) =>
            d.severity === 0  // DiagnosticSeverity.Error
        );
        assert(errors.length === 0, `no parse errors for ${label}`);
    }
}

// ── Test: counter.vhd — existing file with 8x"00" ─────────────────────────────

console.log('\nTest: counter.vhd — 8x"00" in case statement causes no errors');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseSymbols(makeDoc('counter.vhd'), db, null);
    const errors = parser.getDiagnostics(db).filter((d: any) =>
        d.severity === 0
    );
    assert(errors.length === 0, 'counter.vhd produces no parse errors (8x"00" is valid)');
}

// ── Summary ────────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
