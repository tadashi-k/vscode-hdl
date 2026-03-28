# VHDL Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full-parity VHDL support (parsing, diagnostics, hover, goto-def, completion, semantic tokens, formatting) to vscode-hdl alongside the existing Verilog tier.

**Architecture:** VHDL entities are stored in the existing `ModuleDatabase` as `Module` objects (entity=module, generic=parameter, signal=wire/Definition, variable=reg/Definition, constant=localparam). A new `AntlrVhdlParser` in `src/vhdl-parser.ts` mirrors `AntlrVerilogParser` using an ANTLR vhdl2008 grammar. `extension.ts` providers dispatch on `document.languageId === 'vhdl'` in addition to `'verilog'`.

**Tech Stack:** TypeScript, ANTLR4 (antlr4-tool, antlr4 runtime), Node.js, VS Code extension API.

**Spec:** `docs/superpowers/specs/2026-03-28-vhdl-support-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `antlr/Vhdl2008.g4` | vhdl2008 grammar adapted from antlr/grammars-v4 |
| Modify | `antlr/build.js` | Build both Verilog and VHDL grammars |
| Create | `contents/counter.vhd` | Counter entity sample |
| Create | `contents/full_adder.vhd` | Combinational entity sample |
| Create | `contents/test_entity.vhd` | Entity with signals and multiple generics |
| Create | `contents/test_instance.vhd` | Entity with component instantiation |
| Create | `contents/test_warnings.vhd` | One entity per VHDL-W1..W5 warning |
| Create | `src/vhdl-parser.ts` | `AntlrVhdlParser` + `VhdlSymbolVisitor` |
| Create | `src/vhdl-scanner.ts` | Regex entity-name indexer for fast scan |
| Modify | `src/extension.ts` | Add VHDL dispatch to all event handlers and providers |
| Create | `vhdl-language-configuration.json` | VHDL comment/bracket config |
| Create | `syntaxes/vhdl.tmLanguage.json` | TextMate grammar for syntax highlighting |
| Modify | `package.json` | Register vhdl language, grammar, activation |
| Create | `test/test_vhdl_parse_modules.ts` | Tests for entity/port/generic extraction |
| Create | `test/test_vhdl_parse_symbols.ts` | Tests for signals, variables, instances |
| Create | `test/test_vhdl_definitions.ts` | Tests for Definition objects |
| Create | `test/test_vhdl_warnings.ts` | Tests for VHDL-W1..W5 warnings |
| Create | `test/test_vhdl_completion.ts` | Tests for entity instantiation snippets |
| Modify | `test/test_all.ts` | Add VHDL test files to suite |

---

## Task 1: VHDL Grammar + Updated Build Script

**Files:**
- Create: `antlr/Vhdl2008.g4`
- Modify: `antlr/build.js`

- [ ] **Step 1.1: Download vhdl2008.g4 from antlr/grammars-v4**

```
https://raw.githubusercontent.com/antlr/grammars-v4/master/vhdl/vhdl2008/vhdl2008.g4
```

Save to `antlr/Vhdl2008.g4`. Then open the file and change the grammar declaration on line 1 from:
```antlr
grammar vhdl2008;
```
to:
```antlr
grammar Vhdl2008;
```
This ensures the generated classes are named `Vhdl2008Lexer`, `Vhdl2008Parser`, `Vhdl2008Visitor` (matching the Verilog naming convention).

> **Note:** The vhdl2008 grammar on grammars-v4 may be a split lexer+parser grammar (two `.g4` files). If so, download both, rename `grammar vhdl2008Lexer;` → `grammar Vhdl2008Lexer;` and `grammar vhdl2008;` → `grammar Vhdl2008;`, and adjust the `tokenVocab = vhdl2008Lexer;` reference accordingly.

- [ ] **Step 1.2: Add VHDL grammar build to `antlr/build.js`**

In `antlr/build.js`, replace the existing single-grammar build with a loop that builds both grammars. Replace the entire file content with:

```javascript
#!/usr/bin/env node

/**
 * Build script for generating JavaScript parsers from ANTLR grammars.
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const antlrDir = __dirname;
const outputDir = path.join(antlrDir, 'generated');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const grammars = [
    { file: 'Verilog.g4', visitorBase: 'VerilogVisitor' },
    { file: 'Vhdl2008.g4', visitorBase: 'Vhdl2008Visitor' },
];

function buildGrammar(grammarFile, callback) {
    console.log(`\nBuilding: ${grammarFile}`);
    const command = `npx antlr4-tool -l typescript -o "${outputDir}" "${path.join(antlrDir, grammarFile)}"`;
    exec(command, { cwd: antlrDir }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error building ${grammarFile}:`, error.message);
            process.exit(1);
        }
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
        console.log(`✓ ${grammarFile} built`);
        callback();
    });
}

function fixImports(callback) {
    const fixImportsScript = path.join(antlrDir, 'fix-imports.js');
    exec(`node "${fixImportsScript}"`, (error, stdout, stderr) => {
        if (error) { console.error('Error fixing imports:', error.message); process.exit(1); }
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
        callback();
    });
}

function generateVisitorDeclaration(visitorBase) {
    const visitorDts = path.join(outputDir, `${visitorBase}.d.ts`);
    const visitorJs = path.join(outputDir, `${visitorBase}.js`);
    if (!fs.existsSync(visitorJs)) { return; }

    const content = fs.readFileSync(visitorJs, 'utf8');
    const methods = [];
    const re = new RegExp(`${visitorBase}\\.prototype\\.(visit\\w+)\\s*=`, 'g');
    let m;
    while ((m = re.exec(content)) !== null) { methods.push(m[1]); }

    const lines = [
        "import ParseTreeVisitor from 'antlr4/tree/ParseTreeVisitor';",
        '',
        `export declare class ${visitorBase} extends ParseTreeVisitor {`,
        ...methods.map(name => `    ${name}(ctx: any): any;`),
        '}',
        ''
    ];
    fs.writeFileSync(visitorDts, lines.join('\n'), 'utf8');
    console.log(`Generated ${visitorBase}.d.ts with ${methods.length} visitor methods`);
}

// Build grammars sequentially then fix imports and generate .d.ts files
function buildAll(index) {
    if (index >= grammars.length) {
        fixImports(() => {
            grammars.forEach(g => generateVisitorDeclaration(g.visitorBase));
            console.log('\n✓ All grammars built successfully!');
            const files = fs.readdirSync(outputDir);
            console.log('\nGenerated files:');
            files.forEach(f => console.log(`  - ${f}`));
        });
        return;
    }
    buildGrammar(grammars[index].file, () => buildAll(index + 1));
}

buildAll(0);
```

- [ ] **Step 1.3: Run the build and verify**

```
cd C:\home\work\vscode-hdl
npm run build:antlr
```

Expected output includes:
```
✓ Verilog.g4 built
✓ Vhdl2008.g4 built
Generated Vhdl2008Visitor.d.ts with N visitor methods
✓ All grammars built successfully!
```

Verify these files exist in `antlr/generated/`:
- `Vhdl2008Lexer.js`
- `Vhdl2008Parser.js`
- `Vhdl2008Visitor.js`
- `Vhdl2008Visitor.d.ts`

> **Key step:** Open `antlr/generated/Vhdl2008Visitor.d.ts` and note the exact visitor method names for these rules (used in Tasks 3–5). Expected names (adjust code in later tasks if different):
> - `visitEntity_declaration`
> - `visitInterface_port_declaration`
> - `visitInterface_constant_declaration` (for generics)
> - `visitArchitecture_body`
> - `visitSignal_declaration`
> - `visitVariable_declaration`
> - `visitConstant_declaration`
> - `visitProcess_statement`
> - `visitConcurrent_signal_assignment_statement`
> - `visitSignal_assignment_statement` (sequential, inside process)
> - `visitComponent_instantiation_statement`

- [ ] **Step 1.4: Commit**

```
git add antlr/Vhdl2008.g4 antlr/build.js antlr/generated/
git commit -m "feat: add Vhdl2008 ANTLR grammar and update build script

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: Sample VHDL Content Files

**Files:**
- Create: `contents/counter.vhd`
- Create: `contents/full_adder.vhd`
- Create: `contents/test_entity.vhd`
- Create: `contents/test_instance.vhd`
- Create: `contents/test_warnings.vhd`

- [ ] **Step 2.1: Create `contents/counter.vhd`**

```vhdl
library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity counter is
    generic (
        WIDTH : integer := 8
    );
    port (
        clk       : in  std_logic;
        reset     : in  std_logic;
        count_in  : in  std_logic_vector(WIDTH-1 downto 0);
        count_out : out std_logic_vector(WIDTH-1 downto 0)
    );
end entity counter;

architecture rtl of counter is
    signal count_reg : std_logic_vector(WIDTH-1 downto 0);
begin
    process(clk)
    begin
        if rising_edge(clk) then
            if reset = '1' then
                count_reg <= (others => '0');
            else
                count_reg <= std_logic_vector(unsigned(count_in) + 1);
            end if;
        end if;
    end process;
    count_out <= count_reg;
end architecture rtl;
```

- [ ] **Step 2.2: Create `contents/full_adder.vhd`**

```vhdl
library ieee;
use ieee.std_logic_1164.all;

entity full_adder is
    port (
        a    : in  std_logic;
        b    : in  std_logic;
        cin  : in  std_logic;
        sum  : out std_logic;
        cout : out std_logic
    );
end entity full_adder;

architecture rtl of full_adder is
begin
    sum  <= a xor b xor cin;
    cout <= (a and b) or (b and cin) or (a and cin);
end architecture rtl;
```

- [ ] **Step 2.3: Create `contents/test_entity.vhd`**

```vhdl
library ieee;
use ieee.std_logic_1164.all;

entity test_entity is
    generic (
        DATA_WIDTH : integer := 8;
        ADDR_WIDTH : integer := 4
    );
    port (
        clk      : in    std_logic;
        reset    : in    std_logic;
        data_in  : in    std_logic_vector(DATA_WIDTH-1 downto 0);
        data_out : out   std_logic_vector(DATA_WIDTH-1 downto 0);
        addr     : inout std_logic_vector(ADDR_WIDTH-1 downto 0)
    );
end entity test_entity;

architecture rtl of test_entity is
    signal   buf_reg  : std_logic_vector(DATA_WIDTH-1 downto 0);
    constant IDLE     : std_logic_vector(1 downto 0) := "00";
begin
    process(clk)
    begin
        if rising_edge(clk) then
            if reset = '1' then
                buf_reg <= (others => '0');
            else
                buf_reg <= data_in;
            end if;
        end if;
    end process;
    data_out <= buf_reg;
end architecture rtl;
```

- [ ] **Step 2.4: Create `contents/test_instance.vhd`**

```vhdl
library ieee;
use ieee.std_logic_1164.all;

entity test_instance is
    port (
        clk   : in  std_logic;
        reset : in  std_logic;
        q     : out std_logic_vector(7 downto 0)
    );
end entity test_instance;

architecture rtl of test_instance is
    component counter is
        generic (WIDTH : integer := 8);
        port (
            clk       : in  std_logic;
            reset     : in  std_logic;
            count_in  : in  std_logic_vector(WIDTH-1 downto 0);
            count_out : out std_logic_vector(WIDTH-1 downto 0)
        );
    end component;

    signal cnt_in : std_logic_vector(7 downto 0);
begin
    u_counter : counter
        generic map (WIDTH => 8)
        port map (
            clk       => clk,
            reset     => reset,
            count_in  => cnt_in,
            count_out => q
        );
end architecture rtl;
```

- [ ] **Step 2.5: Create `contents/test_warnings.vhd`**

```vhdl
library ieee;
use ieee.std_logic_1164.all;

-- VHDL-W1: signal declared but never read
entity warn_w1 is
    port (clk : in std_logic; q : out std_logic);
end entity;
architecture rtl of warn_w1 is
    signal never_used : std_logic;
begin
    q <= clk;
end architecture;

-- VHDL-W2: input port used as l-value
entity warn_w2 is
    port (clk : in std_logic; q : out std_logic);
end entity;
architecture rtl of warn_w2 is
begin
    clk <= '0';
    q   <= clk;
end architecture;

-- VHDL-W3: signal never assigned
entity warn_w3 is
    port (clk : in std_logic; q : out std_logic);
end entity;
architecture rtl of warn_w3 is
    signal never_assigned : std_logic;
begin
    q <= never_assigned;
end architecture;

-- VHDL-W4: missing port in named connection
entity submod_w4 is
    port (a : in std_logic; b : in std_logic; c : out std_logic);
end entity;
architecture rtl of submod_w4 is
begin
    c <= a and b;
end architecture;

entity warn_w4 is
    port (x : in std_logic; y : out std_logic);
end entity;
architecture rtl of warn_w4 is
    component submod_w4 is
        port (a : in std_logic; b : in std_logic; c : out std_logic);
    end component;
begin
    u1 : submod_w4 port map (a => x, c => y);
end architecture;

-- VHDL-W5: instantiated entity not found in database
entity warn_w5 is
    port (x : in std_logic; y : out std_logic);
end entity;
architecture rtl of warn_w5 is
    component nonexistent_entity is
        port (a : in std_logic; z : out std_logic);
    end component;
begin
    u1 : nonexistent_entity port map (a => x, z => y);
end architecture;
```

- [ ] **Step 2.6: Commit**

```
git add contents/counter.vhd contents/full_adder.vhd contents/test_entity.vhd contents/test_instance.vhd contents/test_warnings.vhd
git commit -m "feat: add VHDL sample content files

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: TDD — `parseModules` (entities, ports, generics)

**Files:**
- Create: `test/test_vhdl_parse_modules.ts`
- Create: `src/vhdl-parser.ts` (parseModules only — full class skeleton)

- [ ] **Step 3.1: Write failing test `test/test_vhdl_parse_modules.ts`**

```typescript
#!/usr/bin/env node
/**
 * Tests for AntlrVhdlParser.parseModules().
 * Verifies entity names, ports, and generics are extracted correctly.
 */

(global as any).vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};

import * as path from 'path';
import * as fs from 'fs';

const AntlrVhdlParser = require('../src/vhdl-parser');
const { ModuleDatabase } = require('../src/database');

// ── Test harness ─────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const contentsDir = path.join(__dirname, '..', 'contents');

function makeDoc(filename: string) {
    const text = fs.readFileSync(path.join(contentsDir, filename), 'utf8');
    return {
        getText: () => text,
        uri: { toString: () => `file://${path.join(contentsDir, filename)}` }
    };
}

// ── Test 1: counter.vhd — entity with one generic and four ports ──────────────

console.log('\nTest: parseModules on counter.vhd');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseModules(makeDoc('counter.vhd'), db);
    const modules = db.getAllModules();

    assert(modules.length === 1, 'finds exactly one entity');
    assert(modules[0].name === 'counter', 'entity name is "counter"');

    const ports = modules[0].ports;
    assert(ports.length === 4, 'counter has 4 ports');

    const portNames = ports.map((p: any) => p.name);
    assert(portNames.includes('clk'),       'has clk port');
    assert(portNames.includes('reset'),     'has reset port');
    assert(portNames.includes('count_in'),  'has count_in port');
    assert(portNames.includes('count_out'), 'has count_out port');

    const clkPort = ports.find((p: any) => p.name === 'clk');
    assert(clkPort?.direction === 'input',  'clk is input');

    const countOutPort = ports.find((p: any) => p.name === 'count_out');
    assert(countOutPort?.direction === 'output', 'count_out is output');

    const params = modules[0].parameterList;
    assert(params.length === 1, 'counter has 1 generic');
    assert(params[0].name === 'WIDTH', 'generic name is WIDTH');
    assert(params[0].kind === 'parameter', 'generic kind is parameter');
}

// ── Test 2: full_adder.vhd — entity with no generics and five ports ───────────

console.log('\nTest: parseModules on full_adder.vhd');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseModules(makeDoc('full_adder.vhd'), db);
    const modules = db.getAllModules();

    assert(modules.length === 1, 'finds exactly one entity');
    assert(modules[0].name === 'full_adder', 'entity name is "full_adder"');

    const ports = modules[0].ports;
    assert(ports.length === 5, 'full_adder has 5 ports');

    const inputs = ports.filter((p: any) => p.direction === 'input');
    const outputs = ports.filter((p: any) => p.direction === 'output');
    assert(inputs.length === 3, 'full_adder has 3 input ports');
    assert(outputs.length === 2, 'full_adder has 2 output ports');

    assert(modules[0].parameterList.length === 0, 'full_adder has no generics');
}

// ── Test 3: test_entity.vhd — entity with two generics and inout port ─────────

console.log('\nTest: parseModules on test_entity.vhd');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseModules(makeDoc('test_entity.vhd'), db);
    const modules = db.getAllModules();

    assert(modules.length === 1, 'finds exactly one entity');
    assert(modules[0].name === 'test_entity', 'entity name is "test_entity"');

    const params = modules[0].parameterList;
    assert(params.length === 2, 'test_entity has 2 generics');
    assert(params.find((p: any) => p.name === 'DATA_WIDTH') !== undefined, 'has DATA_WIDTH generic');
    assert(params.find((p: any) => p.name === 'ADDR_WIDTH') !== undefined, 'has ADDR_WIDTH generic');

    const ports = modules[0].ports;
    const addrPort = ports.find((p: any) => p.name === 'addr');
    assert(addrPort?.direction === 'inout', 'addr port is inout');
}

// ── Test 4: parseModules returns only ports and parameterList ──────────────────

console.log('\nTest: parseModules returns Module with only ports and parameterList');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseModules(makeDoc('counter.vhd'), db);
    const modules = db.getAllModules();
    const m = modules[0];

    assert(Array.isArray(m.ports), 'Module.ports is an array');
    assert(Array.isArray(m.parameterList), 'Module.parameterList is an array');
    assert(Array.isArray(m.instanceList) && m.instanceList.length === 0,
        'Module.instanceList is empty (not populated by parseModules)');
}

// ── Test 5: test_warnings.vhd — multiple entities in one file ─────────────────

console.log('\nTest: parseModules on test_warnings.vhd');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseModules(makeDoc('test_warnings.vhd'), db);
    const modules = db.getAllModules();

    assert(modules.length >= 5, 'finds at least 5 entities in test_warnings.vhd');
    assert(modules.find((m: any) => m.name === 'warn_w1') !== undefined, 'warn_w1 entity found');
    assert(modules.find((m: any) => m.name === 'warn_w5') !== undefined, 'warn_w5 entity found');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
```

- [ ] **Step 3.2: Run test to verify it fails**

```
npm test -- test/test_vhdl_parse_modules.ts
```

Or run directly:
```
node --import=tsx test/test_vhdl_parse_modules.ts
```

Expected: fail with `Cannot find module '../src/vhdl-parser'`.

- [ ] **Step 3.3: Create `src/vhdl-parser.ts` — full class skeleton with parseModules**

> **Note:** Before writing this file, open `antlr/generated/Vhdl2008Visitor.d.ts` and confirm the exact visitor method names. If any method names listed here differ from the generated file, update them accordingly.

```typescript
// ANTLR-based VHDL Parser
// Mirrors antlr-parser.ts for the Verilog tier.

import type * as vsCodeModule from 'vscode';
import antlr4 from 'antlr4';
import { Vhdl2008Lexer } from '../antlr/generated/Vhdl2008Lexer';
import { Vhdl2008Parser } from '../antlr/generated/Vhdl2008Parser';
import { Vhdl2008Visitor } from '../antlr/generated/Vhdl2008Visitor';
import { Module, ModuleDatabase, Definition, Port, Parameter, Instance } from './database';

let vscode: typeof vsCodeModule;
try {
    vscode = require('vscode');
} catch (e) {
    if (typeof global !== 'undefined' && (global as any).vscode) {
        vscode = (global as any).vscode;
    } else {
        throw new Error('vscode module not found. Set global.vscode in test environment.');
    }
}

// ── Error listener ────────────────────────────────────────────────────────────

class VhdlErrorListener extends antlr4.error.ErrorListener {
    errors: any[] = [];

    syntaxError(_recognizer: any, offendingSymbol: any, line: any, column: any, msg: any, _e: any) {
        const length = offendingSymbol?.text?.length ?? 1;
        this.errors.push({
            line: line - 1,
            character: column,
            length,
            message: msg,
            severity: vscode.DiagnosticSeverity.Error,
        });
    }
}

// ── VHDL mode mapping ─────────────────────────────────────────────────────────

function vhdlModeToDirection(mode: string): 'input' | 'output' | 'inout' {
    switch (mode.toLowerCase()) {
        case 'out':    return 'output';
        case 'inout':  return 'inout';
        case 'buffer': return 'output';
        default:       return 'input';   // 'in', 'linkage', or no mode
    }
}

// ── VhdlSymbolVisitor ─────────────────────────────────────────────────────────

class VhdlSymbolVisitor extends Vhdl2008Visitor {
    uri: string;
    errors: any[] = [];
    warnings: any[] = [];

    _moduleDatabase: ModuleDatabase;
    _parseModulesOnly: boolean;
    _currentModule: Module | null = null;
    _inProcess: boolean = false;

    // Per-architecture signal tracking (for warnings)
    _signalList: Array<{ name: string; line: number; character: number }> = [];
    _signalRefs: Set<string> = new Set();
    _assignedSignals: Set<string> = new Set();
    _instPortConnections: Map<string, Set<string>> = new Map();

    // All entity names referenced in instantiations — used by ensureInstanceDependenciesParsed
    allModuleRefs: Set<string> = new Set();

    _pendingWarningData: Array<{
        module: Module;
        signalList: Array<{ name: string; line: number; character: number }>;
        signalRefs: Set<string>;
        assignedSignals: Set<string>;
        instPortConnections: Map<string, Set<string>>;
    }> = [];

    constructor(uri: string, db: ModuleDatabase, parseModulesOnly = false) {
        super();
        this.uri = uri;
        this._moduleDatabase = db;
        this._parseModulesOnly = parseModulesOnly;
    }

    // ── Entity declaration ────────────────────────────────────────────────────

    visitEntity_declaration(ctx: any): any {
        // First identifier child is the entity name.
        const entityName = ctx.identifier(0).getText();
        const line = ctx.start.line - 1;
        const character = ctx.start.column;

        this._currentModule = new Module(entityName, this.uri, line, character, -1, true);
        this._moduleDatabase.addModule(this._currentModule);

        this.visitChildren(ctx);

        const endToken = ctx.stop ?? ctx.start;
        this._currentModule.endLine = endToken.line - 1;
        this._currentModule = null;
        return null;
    }

    // ── Port declarations ─────────────────────────────────────────────────────

    visitInterface_port_declaration(ctx: any): any {
        if (!this._currentModule) return null;

        // identifier_list holds one or more port names
        const idList = ctx.identifier_list ? ctx.identifier_list() : null;
        const names: string[] = idList
            ? idList.identifier().map((id: any) => id.getText())
            : [ctx.identifier ? ctx.identifier(0).getText() : 'unknown'];

        const modeCtx = ctx.signal_mode ? ctx.signal_mode() : null;
        const direction = vhdlModeToDirection(modeCtx ? modeCtx.getText() : 'in');
        const line = ctx.start.line - 1;
        const character = ctx.start.column;

        for (const name of names) {
            this._currentModule.addPort({ name, direction, line, character, bitRange: null });
            const typeText = ctx.subtype_indication ? ctx.subtype_indication().getText() : '';
            const desc = `${direction.padEnd(6)}  ${typeText}`;
            this._currentModule.addDefinition(
                new Definition(name, line, character, 'port', desc)
            );
        }
        return null;
    }

    // ── Generic declarations ──────────────────────────────────────────────────

    visitInterface_constant_declaration(ctx: any): any {
        if (!this._currentModule) return null;

        const idList = ctx.identifier_list ? ctx.identifier_list() : null;
        const names: string[] = idList
            ? idList.identifier().map((id: any) => id.getText())
            : [ctx.identifier ? ctx.identifier(0).getText() : 'unknown'];

        const line = ctx.start.line - 1;
        const character = ctx.start.column;
        const typeText = ctx.subtype_indication ? ctx.subtype_indication().getText() : '';
        const exprText = ctx.expression ? ctx.expression().getText() : '';
        const defaultValue = exprText !== '' ? (parseInt(exprText, 10) || null) : null;

        for (const name of names) {
            const param = new Parameter();
            param.name = name;
            param.line = line;
            param.character = character;
            param.value = defaultValue;
            param.bitRange = null;
            param.exprText = exprText;
            param.kind = 'parameter';
            this._currentModule.parameterList.push(param);

            const desc = `generic  ${name} : ${typeText}${exprText ? ' := ' + exprText : ''}`;
            this._currentModule.addDefinition(
                new Definition(name, line, character, 'parameter', desc)
            );
        }
        return null;
    }

    // ── Architecture body ─────────────────────────────────────────────────────

    visitArchitecture_body(ctx: any): any {
        if (this._parseModulesOnly) return null;

        // Arch syntax: architecture <archId> of <entityName> is ...
        // The grammar rule uses `name` for the entity reference.
        const entityNameCtx = ctx.name ? ctx.name() : null;
        const entityName = entityNameCtx ? entityNameCtx.getText().toLowerCase() : '';
        const existingModule = entityName ? this._moduleDatabase.getModule(entityName) : null;

        if (existingModule) {
            this._currentModule = existingModule;
        } else {
            // Arch before entity (unusual); create a placeholder
            const archId = ctx.identifier ? ctx.identifier(0)?.getText() ?? 'unknown' : 'unknown';
            this._currentModule = new Module(
                entityName || archId, this.uri,
                ctx.start.line - 1, ctx.start.column, -1, true
            );
            this._moduleDatabase.addModule(this._currentModule);
        }

        this._signalList = [];
        this._signalRefs = new Set();
        this._assignedSignals = new Set();
        this._instPortConnections = new Map();

        this.visitChildren(ctx);

        const endToken = ctx.stop ?? ctx.start;
        this._currentModule.endLine = endToken.line - 1;

        this._pendingWarningData.push({
            module: this._currentModule,
            signalList: [...this._signalList],
            signalRefs: new Set(this._signalRefs),
            assignedSignals: new Set(this._assignedSignals),
            instPortConnections: new Map(this._instPortConnections),
        });

        this._currentModule = null;
        return null;
    }

    // ── Signal declarations ───────────────────────────────────────────────────

    visitSignal_declaration(ctx: any): any {
        if (!this._currentModule || this._parseModulesOnly) return null;

        const idList = ctx.identifier_list ? ctx.identifier_list() : null;
        const names: string[] = idList
            ? idList.identifier().map((id: any) => id.getText())
            : [ctx.identifier ? ctx.identifier(0).getText() : 'unknown'];

        const line = ctx.start.line - 1;
        const character = ctx.start.column;
        const typeText = ctx.subtype_indication ? ctx.subtype_indication().getText() : '';

        for (const name of names) {
            const desc = `signal  ${name} : ${typeText}`;
            this._currentModule.addDefinition(new Definition(name, line, character, 'wire', desc));
            this._signalList.push({ name, line, character });
        }
        return null;
    }

    // ── Variable declarations ─────────────────────────────────────────────────

    visitVariable_declaration(ctx: any): any {
        if (!this._currentModule || this._parseModulesOnly) return null;

        const idList = ctx.identifier_list ? ctx.identifier_list() : null;
        const names: string[] = idList
            ? idList.identifier().map((id: any) => id.getText())
            : [ctx.identifier ? ctx.identifier(0).getText() : 'unknown'];

        const line = ctx.start.line - 1;
        const character = ctx.start.column;
        const typeText = ctx.subtype_indication ? ctx.subtype_indication().getText() : '';

        for (const name of names) {
            const desc = `variable  ${name} : ${typeText}`;
            this._currentModule.addDefinition(new Definition(name, line, character, 'reg', desc));
            this._signalList.push({ name, line, character });
        }
        return null;
    }

    // ── Constant declarations ─────────────────────────────────────────────────

    visitConstant_declaration(ctx: any): any {
        if (!this._currentModule || this._parseModulesOnly) return null;

        const idList = ctx.identifier_list ? ctx.identifier_list() : null;
        const names: string[] = idList
            ? idList.identifier().map((id: any) => id.getText())
            : [ctx.identifier ? ctx.identifier(0).getText() : 'unknown'];

        const line = ctx.start.line - 1;
        const character = ctx.start.column;
        const typeText = ctx.subtype_indication ? ctx.subtype_indication().getText() : '';
        const exprText = ctx.expression ? ctx.expression().getText() : '';

        for (const name of names) {
            const param = new Parameter();
            param.name = name;
            param.line = line;
            param.character = character;
            param.value = null;
            param.bitRange = null;
            param.exprText = exprText;
            param.kind = 'localparam';
            this._currentModule.parameterList.push(param);

            const desc = `constant  ${name} : ${typeText}${exprText ? ' := ' + exprText : ''}`;
            this._currentModule.addDefinition(
                new Definition(name, line, character, 'localparam', desc)
            );
        }
        return null;
    }

    // ── Process statements ────────────────────────────────────────────────────

    visitProcess_statement(ctx: any): any {
        if (this._parseModulesOnly) return null;
        this._inProcess = true;
        this.visitChildren(ctx);
        this._inProcess = false;
        return null;
    }

    // ── Concurrent signal assignment (target tracking) ────────────────────────

    visitConcurrent_signal_assignment_statement(ctx: any): any {
        if (!this._currentModule || this._parseModulesOnly) return null;
        if (ctx.target) {
            const targetName = ctx.target().getText().toLowerCase().replace(/\(.*/, '');
            this._assignedSignals.add(targetName);

            // VHDL-W2: concurrent assignment to input port
            const port = this._currentModule.getPort(targetName);
            if (port && port.direction === 'input') {
                this.warnings.push({
                    line: ctx.start.line - 1,
                    character: ctx.start.column,
                    message: `VHDL-W2: Input port '${targetName}' cannot be used as l-value`,
                    severity: vscode.DiagnosticSeverity.Warning,
                });
            }
        }
        this.visitChildren(ctx);
        return null;
    }

    // ── Sequential signal assignment (inside process) ─────────────────────────

    visitSignal_assignment_statement(ctx: any): any {
        if (!this._currentModule || this._parseModulesOnly) return null;
        if (ctx.target) {
            const targetName = ctx.target().getText().toLowerCase().replace(/\(.*/, '');
            this._assignedSignals.add(targetName);

            // VHDL-W2: procedural assignment to input port
            const port = this._currentModule.getPort(targetName);
            if (port && port.direction === 'input') {
                this.warnings.push({
                    line: ctx.start.line - 1,
                    character: ctx.start.column,
                    message: `VHDL-W2: Input port '${targetName}' cannot be used as l-value`,
                    severity: vscode.DiagnosticSeverity.Warning,
                });
            }
        }
        this.visitChildren(ctx);
        return null;
    }

    // ── Name references (track signal reads) ──────────────────────────────────

    visitName(ctx: any): any {
        if (!this._parseModulesOnly) {
            const text = ctx.getText().toLowerCase();
            if (/^[a-z_][a-z0-9_]*$/.test(text)) {
                this._signalRefs.add(text);
            }
        }
        // Do NOT call visitChildren here to avoid double-counting sub-names
        return null;
    }

    // ── Component instantiation ───────────────────────────────────────────────

    visitComponent_instantiation_statement(ctx: any): any {
        if (!this._currentModule || this._parseModulesOnly) return null;

        // Label is the instance name (required in VHDL component instantiations)
        const labelCtx = ctx.label_colon ? ctx.label_colon() : null;
        const instanceName = labelCtx ? labelCtx.label().getText() : 'unknown';

        // Instantiated unit: component name or entity reference
        const unitCtx = ctx.instantiated_unit ? ctx.instantiated_unit() : null;
        let entityName = '';
        if (unitCtx) {
            const text = unitCtx.getText().toLowerCase();
            if (text.startsWith('entity')) {
                // 'entity work.entityName' or 'entity entityName'
                entityName = text.replace(/^entity(work\.)?/, '');
            } else if (!text.startsWith('configuration')) {
                entityName = text;  // bare component name
            }
        }

        if (entityName) {
            this.allModuleRefs.add(entityName);
            const inst = new Instance(
                instanceName, entityName,
                ctx.start.line - 1, ctx.start.column,
                ctx.start.line - 1, ctx.start.column
            );
            this._currentModule.instanceList.push(inst);

            // Track connected ports for VHDL-W4
            const portMapCtx = ctx.port_map_aspect ? ctx.port_map_aspect() : null;
            if (portMapCtx) {
                const connectedPorts = new Set<string>();
                const assocList = portMapCtx.association_list
                    ? portMapCtx.association_list().association_element()
                    : [];
                for (const assoc of assocList) {
                    if (assoc.formal_part) {
                        connectedPorts.add(assoc.formal_part().getText().toLowerCase());
                    }
                }
                this._instPortConnections.set(instanceName, connectedPorts);
            }
        }
        return null;
    }

    // ── Warning generation ────────────────────────────────────────────────────

    generateWarnings(moduleDatabase: ModuleDatabase): void {
        this._moduleDatabase = moduleDatabase;

        for (const pending of this._pendingWarningData) {
            const { module, signalList, signalRefs, assignedSignals, instPortConnections } = pending;

            for (const sig of signalList) {
                const nameLow = sig.name.toLowerCase();

                // VHDL-W1: declared but never read
                if (!signalRefs.has(nameLow)) {
                    this.warnings.push({
                        line: sig.line,
                        character: sig.character,
                        message: `VHDL-W1: Signal '${sig.name}' is declared but never used`,
                        severity: vscode.DiagnosticSeverity.Warning,
                    });
                }

                // VHDL-W3: never assigned
                if (!assignedSignals.has(nameLow)) {
                    this.warnings.push({
                        line: sig.line,
                        character: sig.character,
                        message: `VHDL-W3: Signal '${sig.name}' is never assigned`,
                        severity: vscode.DiagnosticSeverity.Warning,
                    });
                }
            }

            // VHDL-W4: missing port in named connection
            for (const [instanceName, connectedPorts] of instPortConnections) {
                const inst = module.instanceList.find(i => i.instanceName === instanceName);
                if (!inst) continue;
                const entityMod = moduleDatabase.getModule(inst.moduleName);
                if (!entityMod) continue;
                for (const port of entityMod.ports) {
                    if (!connectedPorts.has(port.name.toLowerCase())) {
                        this.warnings.push({
                            line: inst.line,
                            character: inst.character,
                            message: `VHDL-W4: Port '${port.name}' unconnected in instantiation of '${inst.moduleName}'`,
                            severity: vscode.DiagnosticSeverity.Warning,
                        });
                    }
                }
            }

            // VHDL-W5: instantiated entity not found
            for (const inst of module.instanceList) {
                if (!moduleDatabase.getModule(inst.moduleName)) {
                    this.warnings.push({
                        line: inst.line,
                        character: inst.character,
                        message: `VHDL-W5: Entity '${inst.moduleName}' is not defined in the module database`,
                        severity: vscode.DiagnosticSeverity.Warning,
                    });
                }
            }
        }
    }
}

// ── AntlrVhdlParser ───────────────────────────────────────────────────────────

/**
 * Preprocess VHDL text: strip -- line comments, preserving line count.
 * Block comments are stripped by ANTLR's lexer grammar.
 */
function preprocessVhdl(text: string): string {
    return text.replace(/--[^\n]*/g, (m) => ' '.repeat(m.length));
}

class AntlrVhdlParser {
    _lastVisitor: VhdlSymbolVisitor | null = null;
    _dirty: boolean = true;
    _cachedErrors: any[] = [];
    _cachedWarnings: any[] = [];

    dirty() { this._dirty = true; }

    _parse(doc: any, db: ModuleDatabase, fileReader: any, parseModulesOnly: boolean): VhdlSymbolVisitor {
        const text = preprocessVhdl(doc.getText());
        const uri = doc.uri.toString();

        const inputStream = new antlr4.InputStream(text);
        const lexer = new Vhdl2008Lexer(inputStream);
        const tokenStream = new antlr4.CommonTokenStream(lexer);
        const parser = new Vhdl2008Parser(tokenStream);

        const errorListener = new VhdlErrorListener();
        parser.removeErrorListeners();
        parser.addErrorListener(errorListener);

        const tree = parser.design_file();
        const visitor = new VhdlSymbolVisitor(uri, db, parseModulesOnly);
        visitor.visit(tree);
        visitor.errors.push(...errorListener.errors);
        return visitor;
    }

    parseModules(doc: any, db: ModuleDatabase, fileReader?: any): void {
        this._parse(doc, db, fileReader ?? null, true);
    }

    parseSymbols(doc: any, db: ModuleDatabase, fileReader: any): void {
        const visitor = this._parse(doc, db, fileReader, false);
        visitor.generateWarnings(db);
        this._lastVisitor = visitor;
        this._cachedErrors = [...visitor.errors];
        this._cachedWarnings = [...visitor.warnings];
        this._dirty = false;
    }

    getDiagnostics(_db: ModuleDatabase): any[] {
        return [...this._cachedErrors, ...this._cachedWarnings];
    }
}

module.exports = AntlrVhdlParser;
```

- [ ] **Step 3.4: Run tests to verify they pass**

```
node --import=tsx test/test_vhdl_parse_modules.ts
```

Expected: `Results: N passed, 0 failed`

If tests fail with wrong visitor method names, open `antlr/generated/Vhdl2008Visitor.d.ts`, find the actual method names for the rules listed in Step 1.3, and update the visitor accordingly.

- [ ] **Step 3.5: Run all existing Verilog tests to verify no regressions**

```
npm test
```

Expected: all existing tests still pass.

- [ ] **Step 3.6: Commit**

```
git add src/vhdl-parser.ts test/test_vhdl_parse_modules.ts
git commit -m "feat: implement AntlrVhdlParser.parseModules with TDD

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: TDD — `parseSymbols` (signals, variables, constants, instances)

**Files:**
- Create: `test/test_vhdl_parse_symbols.ts`
- Create: `test/test_vhdl_definitions.ts`
- Modify: `src/vhdl-parser.ts` (architecture body already implemented above — these tests validate it)

- [ ] **Step 4.1: Write failing test `test/test_vhdl_parse_symbols.ts`**

```typescript
#!/usr/bin/env node
/**
 * Tests for AntlrVhdlParser.parseSymbols().
 * Verifies signals, variables, constants, and component instances are extracted.
 */

(global as any).vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};

import * as path from 'path';
import * as fs from 'fs';

const AntlrVhdlParser = require('../src/vhdl-parser');
const { ModuleDatabase } = require('../src/database');

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
    if (condition) { console.log(`  ✓ ${message}`); passed++; }
    else           { console.error(`  ✗ ${message}`); failed++; }
}

const contentsDir = path.join(__dirname, '..', 'contents');

function makeDoc(filename: string) {
    const text = fs.readFileSync(path.join(contentsDir, filename), 'utf8');
    return {
        getText: () => text,
        uri: { toString: () => `file://${path.join(contentsDir, filename)}` }
    };
}

function makeInlineDoc(text: string, name: string) {
    return {
        getText: () => text,
        uri: { toString: () => `file:///test/${name}` }
    };
}

// ── Test 1: counter.vhd — architecture signals ────────────────────────────────

console.log('\nTest: parseSymbols on counter.vhd — architecture signals');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseSymbols(makeDoc('counter.vhd'), db, null);
    const m = db.getModule('counter');

    assert(m !== undefined, 'counter entity found in db');

    const countReg = m?.definitionMap.get('count_reg');
    assert(countReg !== undefined, 'count_reg signal found');
    assert(countReg?.type === 'wire', 'count_reg type is wire (signal)');
    assert(countReg?.description.includes('count_reg'), 'count_reg description includes signal name');
}

// ── Test 2: test_entity.vhd — signals and constants ──────────────────────────

console.log('\nTest: parseSymbols on test_entity.vhd — signals and constants');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseSymbols(makeDoc('test_entity.vhd'), db, null);
    const m = db.getModule('test_entity');

    assert(m !== undefined, 'test_entity found in db');

    const bufReg = m?.definitionMap.get('buf_reg');
    assert(bufReg !== undefined, 'buf_reg signal found');
    assert(bufReg?.type === 'wire', 'buf_reg is wire (signal)');

    const idleConst = m?.definitionMap.get('IDLE');
    assert(idleConst !== undefined, 'IDLE constant found');
    assert(idleConst?.type === 'localparam', 'IDLE type is localparam (constant)');
}

// ── Test 3: test_instance.vhd — component instantiation ──────────────────────

console.log('\nTest: parseSymbols on test_instance.vhd — component instantiation');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseSymbols(makeDoc('test_instance.vhd'), db, null);
    const m = db.getModule('test_instance');

    assert(m !== undefined, 'test_instance found in db');
    assert(m?.instanceList.length >= 1, 'test_instance has at least one instance');

    const inst = m?.instanceList.find((i: any) => i.instanceName === 'u_counter');
    assert(inst !== undefined, 'u_counter instance found');
    assert(inst?.moduleName === 'counter', 'u_counter instantiates counter');
}

// ── Test 4: variable inside process ──────────────────────────────────────────

console.log('\nTest: parseSymbols — variable inside process is type reg');
{
    const vhdl = `
library ieee; use ieee.std_logic_1164.all;
entity var_test is
    port (clk : in std_logic; q : out std_logic);
end entity;
architecture rtl of var_test is
begin
    process(clk)
        variable my_var : std_logic := '0';
    begin
        my_var := clk;
        q <= my_var;
    end process;
end architecture;
`;
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseSymbols(makeInlineDoc(vhdl, 'var_test.vhd'), db, null);
    const m = db.getModule('var_test');

    assert(m !== undefined, 'var_test entity found');
    const myVar = m?.definitionMap.get('my_var');
    assert(myVar !== undefined, 'my_var variable found');
    assert(myVar?.type === 'reg', 'my_var type is reg (variable)');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
```

- [ ] **Step 4.2: Write failing test `test/test_vhdl_definitions.ts`**

```typescript
#!/usr/bin/env node
/**
 * Tests for VHDL Definition objects — correct type, description, and position.
 */

(global as any).vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};

import * as path from 'path';
import * as fs from 'fs';

const AntlrVhdlParser = require('../src/vhdl-parser');
const { ModuleDatabase } = require('../src/database');

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
    if (condition) { console.log(`  ✓ ${message}`); passed++; }
    else           { console.error(`  ✗ ${message}`); failed++; }
}

const contentsDir = path.join(__dirname, '..', 'contents');

function makeDoc(filename: string) {
    const text = fs.readFileSync(path.join(contentsDir, filename), 'utf8');
    return {
        getText: () => text,
        uri: { toString: () => `file://${path.join(contentsDir, filename)}` }
    };
}

// ── Test 1: port definitions have correct types ────────────────────────────────

console.log('\nTest: port definitions in counter.vhd');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseSymbols(makeDoc('counter.vhd'), db, null);
    const m = db.getModule('counter');

    const clkDef = m?.definitionMap.get('clk');
    assert(clkDef?.type === 'port', 'clk definition type is port');
    assert(typeof clkDef?.line === 'number', 'clk definition has line number');
    assert(clkDef?.description.includes('input') || clkDef?.description.includes('in'),
        'clk description includes direction');
}

// ── Test 2: signal definition type and description ────────────────────────────

console.log('\nTest: signal definition in counter.vhd');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseSymbols(makeDoc('counter.vhd'), db, null);
    const m = db.getModule('counter');

    const countRegDef = m?.definitionMap.get('count_reg');
    assert(countRegDef?.type === 'wire', 'count_reg definition type is wire');
    assert(countRegDef?.description.includes('signal'), 'count_reg description says signal');
    assert(countRegDef?.description.includes('count_reg'), 'count_reg description includes name');
}

// ── Test 3: constant definition type and description ──────────────────────────

console.log('\nTest: constant definition in test_entity.vhd');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseSymbols(makeDoc('test_entity.vhd'), db, null);
    const m = db.getModule('test_entity');

    const idleDef = m?.definitionMap.get('IDLE');
    assert(idleDef?.type === 'localparam', 'IDLE definition type is localparam');
    assert(idleDef?.description.includes('constant'), 'IDLE description says constant');
}

// ── Test 4: generic definition type ───────────────────────────────────────────

console.log('\nTest: generic definition in counter.vhd');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseSymbols(makeDoc('counter.vhd'), db, null);
    const m = db.getModule('counter');

    const widthDef = m?.definitionMap.get('WIDTH');
    assert(widthDef?.type === 'parameter', 'WIDTH definition type is parameter');
    assert(widthDef?.description.includes('generic'), 'WIDTH description says generic');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
```

- [ ] **Step 4.3: Run tests to verify they fail**

```
node --import=tsx test/test_vhdl_parse_symbols.ts
node --import=tsx test/test_vhdl_definitions.ts
```

Expected: tests fail (architecture body visitor methods not reaching the right nodes, or returning wrong types).

- [ ] **Step 4.4: Debug and fix `visitArchitecture_body` and related visitors**

If tests are still failing after Step 3.3's implementation, the most likely causes are:
1. **Wrong rule name** for architecture body — check `Vhdl2008Visitor.d.ts` for the exact method name.
2. **`ctx.name()` not available** — in the grammar, the entity name in `architecture X of EntityName is` may be accessed via a different context method. Try `ctx.name(0)`, `ctx.entity_name()`, or inspect the tree with `ctx.toStringTree()`.
3. **Architecture body is a secondary unit** — the visitor may need to handle it at the `design_unit` level.

To debug, add this temporary logging:
```typescript
visitArchitecture_body(ctx: any): any {
    console.log('Architecture body ctx:', Object.getOwnPropertyNames(ctx).filter(n => typeof (ctx as any)[n] === 'function'));
    ...
}
```

Fix any naming issues, then re-run.

- [ ] **Step 4.5: Run tests to verify they pass**

```
node --import=tsx test/test_vhdl_parse_symbols.ts
node --import=tsx test/test_vhdl_definitions.ts
```

Expected: `Results: N passed, 0 failed` for both.

- [ ] **Step 4.6: Run all tests to verify no regressions**

```
npm test
```

- [ ] **Step 4.7: Commit**

```
git add src/vhdl-parser.ts test/test_vhdl_parse_symbols.ts test/test_vhdl_definitions.ts
git commit -m "feat: implement AntlrVhdlParser.parseSymbols (architecture body) with TDD

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 5: TDD — VHDL Warnings (W1–W5)

**Files:**
- Create: `test/test_vhdl_warnings.ts`
- Modify: `src/vhdl-parser.ts` (warning generation already implemented — tests validate it)

- [ ] **Step 5.1: Write failing test `test/test_vhdl_warnings.ts`**

```typescript
#!/usr/bin/env node
/**
 * Tests for VHDL-W1..W5 diagnostic warnings.
 */

(global as any).vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};

const SEVERITY_WARNING = 1;

import * as path from 'path';
import * as fs from 'fs';

const AntlrVhdlParser = require('../src/vhdl-parser');
const { ModuleDatabase } = require('../src/database');

const contentsDir = path.join(__dirname, '..', 'contents');

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
    if (condition) { console.log(`  ✓ ${message}`); passed++; }
    else           { console.error(`  ✗ ${message}`); failed++; }
}

function makeInlineDoc(text: string, name: string) {
    return {
        getText: () => text,
        uri: { toString: () => `file:///test/${name}` }
    };
}

function makeFileDoc(filename: string) {
    const text = fs.readFileSync(path.join(contentsDir, filename), 'utf8');
    return {
        getText: () => text,
        uri: { toString: () => `file://${path.join(contentsDir, filename)}` }
    };
}

function getWarnings(vhdl: string, name: string, db?: any): any[] {
    const parser = new AntlrVhdlParser();
    const moduleDb = db ?? new ModuleDatabase();
    parser.parseSymbols(makeInlineDoc(vhdl, name), moduleDb, null);
    return parser.getDiagnostics(moduleDb).filter((d: any) => d.severity === SEVERITY_WARNING);
}

function getFileWarnings(filename: string, db?: any): any[] {
    const parser = new AntlrVhdlParser();
    const moduleDb = db ?? new ModuleDatabase();
    parser.parseSymbols(makeFileDoc(filename), moduleDb, null);
    return parser.getDiagnostics(moduleDb).filter((d: any) => d.severity === SEVERITY_WARNING);
}

// ── VHDL-W1: signal declared but never read ───────────────────────────────────

console.log('\nVHDL-W1: signal declared but never used');
{
    const vhdl = `
library ieee; use ieee.std_logic_1164.all;
entity w1_test is port (clk : in std_logic; q : out std_logic); end entity;
architecture rtl of w1_test is
    signal never_used : std_logic;
begin
    q <= clk;
end architecture;
`;
    const warnings = getWarnings(vhdl, 'w1.vhd');
    const w = warnings.find((w: any) =>
        w.message.includes("'never_used'") && w.message.includes('never used'));
    assert(w !== undefined, "W1: warning for 'never_used' signal declared but never used");
}

// ── VHDL-W2: input port used as l-value (concurrent) ─────────────────────────

console.log('\nVHDL-W2: input port used as l-value in concurrent assignment');
{
    const vhdl = `
library ieee; use ieee.std_logic_1164.all;
entity w2_test is port (clk : in std_logic; q : out std_logic); end entity;
architecture rtl of w2_test is
begin
    clk <= '0';
    q   <= clk;
end architecture;
`;
    const warnings = getWarnings(vhdl, 'w2_conc.vhd');
    const w = warnings.find((w: any) =>
        w.message.includes("'clk'") && w.message.includes('l-value'));
    assert(w !== undefined, "W2: warning for input port 'clk' assigned concurrently");
}

// ── VHDL-W2: input port used as l-value (inside process) ─────────────────────

console.log('\nVHDL-W2: input port used as l-value inside process');
{
    const vhdl = `
library ieee; use ieee.std_logic_1164.all;
entity w2_proc_test is port (clk : in std_logic; q : out std_logic); end entity;
architecture rtl of w2_proc_test is
begin
    process(clk)
    begin
        clk <= '0';
        q   <= '1';
    end process;
end architecture;
`;
    const warnings = getWarnings(vhdl, 'w2_proc.vhd');
    const w = warnings.find((w: any) =>
        w.message.includes("'clk'") && w.message.includes('l-value'));
    assert(w !== undefined, "W2: warning for input port 'clk' assigned inside process");
}

// ── VHDL-W3: signal never assigned ───────────────────────────────────────────

console.log('\nVHDL-W3: signal never assigned');
{
    const vhdl = `
library ieee; use ieee.std_logic_1164.all;
entity w3_test is port (clk : in std_logic; q : out std_logic); end entity;
architecture rtl of w3_test is
    signal never_assigned : std_logic;
begin
    q <= never_assigned;
end architecture;
`;
    const warnings = getWarnings(vhdl, 'w3.vhd');
    const w = warnings.find((w: any) =>
        w.message.includes("'never_assigned'") && w.message.includes('never assigned'));
    assert(w !== undefined, "W3: warning for 'never_assigned' signal never driven");
}

// ── VHDL-W4: missing port in named connection ─────────────────────────────────

console.log('\nVHDL-W4: missing port in named connection');
{
    const vhdl = `
library ieee; use ieee.std_logic_1164.all;
entity submod is port (a : in std_logic; b : in std_logic; c : out std_logic); end entity;
architecture rtl of submod is begin c <= a and b; end architecture;

entity w4_test is port (x : in std_logic; y : out std_logic); end entity;
architecture rtl of w4_test is
    component submod is
        port (a : in std_logic; b : in std_logic; c : out std_logic);
    end component;
begin
    u1 : submod port map (a => x, c => y);
end architecture;
`;
    const db = new ModuleDatabase();
    const warnings = getWarnings(vhdl, 'w4.vhd', db);
    const w = warnings.find((w: any) =>
        w.message.includes("'b'") && w.message.includes('unconnected'));
    assert(w !== undefined, "W4: warning for port 'b' unconnected");
}

// ── VHDL-W5: instantiated entity not found ────────────────────────────────────

console.log('\nVHDL-W5: instantiated entity not found');
{
    const vhdl = `
library ieee; use ieee.std_logic_1164.all;
entity w5_test is port (x : in std_logic; y : out std_logic); end entity;
architecture rtl of w5_test is
    component ghost_entity is
        port (a : in std_logic; z : out std_logic);
    end component;
begin
    u1 : ghost_entity port map (a => x, z => y);
end architecture;
`;
    const db = new ModuleDatabase();
    const warnings = getWarnings(vhdl, 'w5.vhd', db);
    const w = warnings.find((w: any) =>
        w.message.includes("'ghost_entity'") && w.message.includes('not defined'));
    assert(w !== undefined, "W5: warning for entity 'ghost_entity' not in database");
}

// ── No spurious warnings on clean files ──────────────────────────────────────

console.log('\nNo spurious warnings on counter.vhd');
{
    const warnings = getFileWarnings('counter.vhd');
    const w1w3 = warnings.filter((w: any) =>
        w.message.includes('VHDL-W1') || w.message.includes('VHDL-W3'));
    assert(w1w3.length === 0,
        'counter.vhd has no W1/W3 warnings (all signals are used and assigned)');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
```

- [ ] **Step 5.2: Run test to verify it fails**

```
node --import=tsx test/test_vhdl_warnings.ts
```

Expected: some assertions fail (warning generation may be partially working from Task 3).

- [ ] **Step 5.3: Debug and fix warning generation if needed**

If W1/W3 fire spuriously on counter.vhd (all signals should be read and assigned), the most likely cause is that `visitName` is not being reached inside architecture bodies. Check:
1. Does `visitArchitecture_body` call `this.visitChildren(ctx)`? — it must.
2. Is `visitName` too greedy (counting names that appear in declarations as reads)? If so, exclude names that appear as declaration targets.

For W4, if the test with inline VHDL fails, the issue is likely that `submod` entity is in the same inline document. The `parseSymbols` call parses both entities in one pass. The W4 check runs in `generateWarnings` after the full parse, so `submod` should be in the database.

For W5, ensure `ghost_entity` is genuinely absent from the database (it is, since it's not defined anywhere in the inline VHDL).

- [ ] **Step 5.4: Run tests to verify they pass**

```
node --import=tsx test/test_vhdl_warnings.ts
```

Expected: `Results: N passed, 0 failed`

- [ ] **Step 5.5: Run all tests**

```
npm test
```

- [ ] **Step 5.6: Commit**

```
git add src/vhdl-parser.ts test/test_vhdl_warnings.ts
git commit -m "feat: implement VHDL-W1..W5 diagnostic warnings with TDD

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 6: TDD — Completion (instantiation snippet)

**Files:**
- Create: `test/test_vhdl_completion.ts`

No new implementation code is needed — `buildInstantiationSnippet` in `src/instantiation-snippet.ts` already works for any `Module`, including VHDL entities.

- [ ] **Step 6.1: Write test `test/test_vhdl_completion.ts`**

```typescript
#!/usr/bin/env node
/**
 * Tests for instantiation snippet generation for VHDL entities.
 * Uses the shared buildInstantiationSnippet from instantiation-snippet.ts.
 */

(global as any).vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};

import * as path from 'path';
import * as fs from 'fs';

const AntlrVhdlParser = require('../src/vhdl-parser');
const { ModuleDatabase } = require('../src/database');
const { buildInstantiationSnippet } = require('../src/instantiation-snippet');

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
    if (condition) { console.log(`  ✓ ${message}`); passed++; }
    else           { console.error(`  ✗ ${message}`); failed++; }
}

const contentsDir = path.join(__dirname, '..', 'contents');

function makeDoc(filename: string) {
    const text = fs.readFileSync(path.join(contentsDir, filename), 'utf8');
    return {
        getText: () => text,
        uri: { toString: () => `file://${path.join(contentsDir, filename)}` }
    };
}

// ── Test 1: counter.vhd snippet includes generic and all ports ────────────────

console.log('\nTest: snippet for counter entity');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseModules(makeDoc('counter.vhd'), db);
    const m = db.getModule('counter');
    assert(m !== undefined, 'counter entity in db');

    const snippet = buildInstantiationSnippet(m!);

    assert(snippet.includes('counter'), 'snippet includes entity name');
    assert(snippet.includes('WIDTH'), 'snippet includes WIDTH generic');
    assert(snippet.includes('clk'), 'snippet includes clk port');
    assert(snippet.includes('count_out'), 'snippet includes count_out port');
    assert(snippet.includes('${'), 'snippet uses VS Code tab-stop syntax');
}

// ── Test 2: full_adder.vhd snippet — no generics, five ports ─────────────────

console.log('\nTest: snippet for full_adder entity');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseModules(makeDoc('full_adder.vhd'), db);
    const m = db.getModule('full_adder');
    assert(m !== undefined, 'full_adder entity in db');

    const snippet = buildInstantiationSnippet(m!);

    assert(snippet.includes('full_adder'), 'snippet includes entity name');
    assert(snippet.includes('sum'),  'snippet includes sum port');
    assert(snippet.includes('cout'), 'snippet includes cout port');
    assert(!snippet.includes('#('),  'snippet has no generic map (no generics)');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
```

- [ ] **Step 6.2: Run test — expect pass (no new code needed)**

```
node --import=tsx test/test_vhdl_completion.ts
```

Expected: `Results: N passed, 0 failed`

- [ ] **Step 6.3: Commit**

```
git add test/test_vhdl_completion.ts
git commit -m "test: add VHDL completion/instantiation-snippet test

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 7: Static Metadata (package.json, language config, syntax highlighting)

**Files:**
- Modify: `package.json`
- Create: `vhdl-language-configuration.json`
- Create: `syntaxes/vhdl.tmLanguage.json`

- [ ] **Step 7.1: Update `package.json`**

Add to `"activationEvents"`:
```json
"onLanguage:vhdl"
```

Add to `"contributes.languages"`:
```json
{
    "id": "vhdl",
    "aliases": ["VHDL", "vhdl"],
    "extensions": [".vhd", ".vhdl"],
    "configuration": "./vhdl-language-configuration.json"
}
```

Add to `"contributes.grammars"`:
```json
{
    "language": "vhdl",
    "scopeName": "source.vhdl",
    "path": "./syntaxes/vhdl.tmLanguage.json"
}
```

Add to `"contributes.semanticTokenScopes"` (after the verilog entry):
```json
{
    "language": "vhdl",
    "scopes": {
        "hdlReg":       ["variable.other.variable.vhdl"],
        "hdlWire":      ["variable.other.signal.vhdl"],
        "hdlParameter": ["variable.other.constant.vhdl"],
        "hdlModule":    ["entity.name.type.entity.vhdl"]
    }
}
```

Add to `"contributes.configurationDefaults"`:
```json
"[vhdl]": {
    "editor.semanticHighlighting.enabled": true
}
```

- [ ] **Step 7.2: Create `vhdl-language-configuration.json`**

```json
{
    "comments": {
        "lineComment": "--"
    },
    "brackets": [
        ["(", ")"],
        ["begin", "end"]
    ],
    "autoClosingPairs": [
        { "open": "(", "close": ")" },
        { "open": "\"", "close": "\"", "notIn": ["string"] },
        { "open": "'", "close": "'",   "notIn": ["string", "comment"] }
    ],
    "surroundingPairs": [
        ["(", ")"],
        ["\"", "\""],
        ["'", "'"]
    ]
}
```

- [ ] **Step 7.3: Create `syntaxes/vhdl.tmLanguage.json`**

```json
{
    "name": "VHDL",
    "scopeName": "source.vhdl",
    "fileTypes": ["vhd", "vhdl"],
    "patterns": [
        { "include": "#comment_line" },
        { "include": "#comment_block" },
        { "include": "#string_literal" },
        { "include": "#keywords" },
        { "include": "#types" },
        { "include": "#entity_declaration" },
        { "include": "#number_literal" },
        { "include": "#operator" }
    ],
    "repository": {
        "comment_line": {
            "match": "--.*$",
            "name": "comment.line.double-dash.vhdl"
        },
        "comment_block": {
            "begin": "/\\*",
            "end": "\\*/",
            "name": "comment.block.vhdl"
        },
        "string_literal": {
            "begin": "\"",
            "end": "\"",
            "name": "string.quoted.double.vhdl"
        },
        "keywords": {
            "match": "(?i)\\b(entity|architecture|is|of|begin|end|port|generic|signal|variable|constant|process|component|package|library|use|work|all|map|port|in|out|inout|buffer|if|then|else|elsif|case|when|loop|for|while|return|type|subtype|record|array|downto|to|others|rising_edge|falling_edge|not|and|or|xor|nor|nand|xnor)\\b",
            "name": "keyword.control.vhdl"
        },
        "types": {
            "match": "(?i)\\b(std_logic|std_logic_vector|std_ulogic|std_ulogic_vector|integer|natural|positive|boolean|bit|bit_vector|signed|unsigned|real|time|string|character)\\b",
            "name": "support.type.vhdl"
        },
        "entity_declaration": {
            "match": "(?i)\\bentity\\s+(\\w+)\\s+is\\b",
            "captures": {
                "1": { "name": "entity.name.type.entity.vhdl" }
            }
        },
        "number_literal": {
            "patterns": [
                {
                    "match": "(?i)X\"[0-9a-f_]+\"",
                    "name": "constant.numeric.hex.vhdl"
                },
                {
                    "match": "\"[01_]+\"",
                    "name": "constant.numeric.binary.vhdl"
                },
                {
                    "match": "\\b[0-9][0-9_]*\\b",
                    "name": "constant.numeric.decimal.vhdl"
                }
            ]
        },
        "operator": {
            "match": "<=|:=|=>|/=|>=|<=|<|>|\\+|-|\\*|/|&|\\|",
            "name": "keyword.operator.vhdl"
        }
    }
}
```

- [ ] **Step 7.4: Build TypeScript to verify package.json changes don't break compilation**

```
npm run build
```

Expected: TypeScript compiles without errors.

- [ ] **Step 7.5: Commit**

```
git add package.json vhdl-language-configuration.json syntaxes/vhdl.tmLanguage.json
git commit -m "feat: add VHDL language metadata, configuration, and syntax highlighting

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 8: `src/vhdl-scanner.ts`

**Files:**
- Create: `src/vhdl-scanner.ts`

- [ ] **Step 8.1: Create `src/vhdl-scanner.ts`**

```typescript
/**
 * VHDL file scanner utilities.
 * Regex-based entity-name scanning for fast workspace-wide indexing.
 * No VS Code dependency - suitable for use in tests.
 *
 * Mirrors the regexScanModules function in verilog-scanner.ts.
 */

/**
 * Lightweight, regex-based scan of a single VHDL source file.
 * Extracts entity declarations (name + line number) without a full parse.
 *
 * @param content - Text content of the .vhd or .vhdl file.
 * @param uri     - Document URI string used to tag each result.
 * @returns Array of { name, uri, line, character } descriptors.
 */
export function regexScanEntities(
    content: string,
    uri: string
): Array<{ name: string; uri: string; line: number; character: number }> {
    const results: Array<{ name: string; uri: string; line: number; character: number }> = [];

    // Strip -- line comments to prevent matching inside comments
    const stripped = content.replace(/--[^\n]*/g, (m) => ' '.repeat(m.length));
    const lines = stripped.split('\n');

    for (let i = 0; i < lines.length; i++) {
        // Match: entity <name> is  (case-insensitive)
        const match = lines[i].match(/(?i)\bentity\s+(\w+)\s+is\b/i);
        if (match) {
            const character = lines[i].toLowerCase().indexOf(match[1].toLowerCase());
            results.push({
                name: match[1],
                uri,
                line: i,
                character: character >= 0 ? character : 0,
            });
        }
    }
    return results;
}
```

- [ ] **Step 8.2: Build to verify no TypeScript errors**

```
npm run build
```

- [ ] **Step 8.3: Commit**

```
git add src/vhdl-scanner.ts
git commit -m "feat: add VHDL regex scanner for fast entity-name indexing

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 9: `extension.ts` Integration

**Files:**
- Modify: `src/extension.ts`

- [ ] **Step 9.1: Import VHDL modules at the top of `extension.ts`**

After the existing imports, add:
```typescript
import AntlrVhdlParser = require('./vhdl-parser');
import { regexScanEntities } from './vhdl-scanner';
```

- [ ] **Step 9.2: Add VHDL parser instance alongside the Verilog one**

After `const verilogParser = new AntlrVerilogParser();`, add:
```typescript
const vhdlParser = new AntlrVhdlParser();
```

- [ ] **Step 9.3: Update `updateDocumentSymbols` to handle VHDL**

Replace the existing `updateDocumentSymbols` function:
```typescript
function updateDocumentSymbols(document: vscode.TextDocument) {
    const lang = document.languageId;
    if (lang !== 'verilog' && lang !== 'vhdl') return;

    const uri = document.uri.toString();
    const currentModules = moduleDatabase.getModulesByUri(uri);

    if (lang === 'vhdl') {
        vhdlParser.parseSymbols(document, moduleDatabase, fsFileReader);
    } else {
        verilogParser.parseSymbols(document, moduleDatabase, fsFileReader);
    }

    for (const mod of currentModules) {
        if (!moduleDatabase.getModule(mod.name)) {
            moduleDatabase.removeModule(mod.name);
        }
    }
}
```

- [ ] **Step 9.4: Update `updateDocumentModules` to handle VHDL**

Replace the existing `updateDocumentModules` function:
```typescript
function updateDocumentModules(document: vscode.TextDocument) {
    const lang = document.languageId;
    if (lang !== 'verilog' && lang !== 'vhdl') return;

    const uri = document.uri.toString();
    const currentModules = moduleDatabase.getModulesByUri(uri);

    if (lang === 'vhdl') {
        vhdlParser.parseModules(document, moduleDatabase, fsFileReader);
    } else {
        verilogParser.parseModules(document, moduleDatabase, fsFileReader);
    }

    for (const mod of currentModules) {
        if (!moduleDatabase.getModule(mod.name)) {
            moduleDatabase.removeModule(mod.name);
        }
    }
}
```

- [ ] **Step 9.5: Update `ensureInstanceDependenciesParsed` for VHDL**

Replace the language guard in `ensureInstanceDependenciesParsed`:
```typescript
function ensureInstanceDependenciesParsed(document: vscode.TextDocument) {
    const lang = document.languageId;
    if (lang !== 'verilog' && lang !== 'vhdl') return;

    const visitor = lang === 'vhdl' ? vhdlParser._lastVisitor : verilogParser._lastVisitor;
    if (!visitor) return;
    // ... (rest unchanged) ...
    // In the depDoc mock, set languageId based on the file extension:
    //   languageId: mod.uri.endsWith('.vhd') || mod.uri.endsWith('.vhdl') ? 'vhdl' : 'verilog'
}
```

Specifically, find the line `languageId: 'verilog'` in `ensureInstanceDependenciesParsed` and replace it with:
```typescript
languageId: (mod.uri.endsWith('.vhd') || mod.uri.endsWith('.vhdl')) ? 'vhdl' : 'verilog'
```

- [ ] **Step 9.6: Update event handler language guards**

In `onDidOpenTextDocument`, replace:
```typescript
if (document.languageId !== 'verilog') return;
```
with:
```typescript
if (document.languageId !== 'verilog' && document.languageId !== 'vhdl') return;
```

Do the same in `onDidChangeTextDocument`, `onDidChangeTextEditorSelection`, and `onDidCloseTextDocument`.

In `onDidChangeTextEditorSelection`, update the `verilogParser.dirty()` call:
```typescript
if (lang === 'vhdl') {
    vhdlParser.dirty();
} else {
    verilogParser.dirty();
}
```

- [ ] **Step 9.7: Register providers for VHDL**

After each existing provider registration for `{ language: 'verilog' }`, add a parallel registration for `{ language: 'vhdl' }`. For providers that are language-agnostic (reading from `ModuleDatabase`), register the same instance for both languages.

```typescript
// Document symbol provider — same instance handles both languages
context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
        { language: 'vhdl' },
        new VerilogDocumentSymbolProvider()
    )
);

// Definition provider
context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
        { language: 'vhdl' },
        new VerilogDefinitionProvider()
    )
);

// Semantic token provider
context.subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider(
        { language: 'vhdl' },
        semanticTokensProvider,
        semanticTokensLegend
    )
);

// Completion provider
context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
        { language: 'vhdl' },
        new VerilogCompletionItemProvider()
    )
);

// Hover provider — register for 'vhdl' using the same inline hover implementation
context.subscriptions.push(
    vscode.languages.registerHoverProvider('vhdl', {
        provideHover(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken) {
            const wordRange = document.getWordRangeAtPosition(position);
            if (!wordRange) return null;
            const word = document.getText(wordRange);

            const lineText = document.lineAt(position.line).text;
            const charBefore = wordRange.start.character > 0 ? lineText[wordRange.start.character - 1] : '';
            if (charBefore === '.') {
                for (const mod of moduleDatabase.getAllModules()) {
                    const port = mod.getPort(word);
                    if (port) {
                        const hoverContent = `**${port.name}**\n\n${port.direction}\n\nentity ${mod.name}`;
                        return new vscode.Hover(hoverContent);
                    }
                }
            }
            const docUri = document.uri.toString();
            const currentModule = moduleDatabase.getModuleByUriPosition(docUri, position.line);
            if (currentModule) {
                const def = currentModule.definitionMap.get(word);
                if (def) {
                    return new vscode.Hover(new vscode.MarkdownString(`\`\`\`vhdl\n${def.description}\n\`\`\``));
                }
            }
            return null;
        }
    })
);

// Document formatting provider for VHDL (basic indentation)
context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
        { language: 'vhdl' },
        {
            provideDocumentFormattingEdits(document: vscode.TextDocument, _options: vscode.FormattingOptions): vscode.TextEdit[] {
                // Placeholder: return empty edits (VHDL-specific formatter is a future enhancement)
                return [];
            }
        }
    )
);
```

- [ ] **Step 9.8: Update `scanWorkspaceForModules` to also scan VHDL files**

Find the `scanWorkspaceForModules` function. After the existing glob for `**/*.v` files, add a glob for `**/*.{vhd,vhdl}` files and call `regexScanEntities` on each:

```typescript
// Scan VHDL files
const vhdlFiles = await vscode.workspace.findFiles('**/*.{vhd,vhdl}', null);
for (const file of vhdlFiles) {
    if (shouldIgnore(file.fsPath)) continue;
    try {
        const content = fs.readFileSync(file.fsPath, 'utf8');
        const entries = regexScanEntities(content, file.toString());
        const uris: Array<{ name: string; uri: string; line: number; character: number }> = [];
        for (const entry of entries) {
            if (!moduleDatabase.getModule(entry.name)) {
                moduleDatabase.addModule(
                    new Module(entry.name, entry.uri, entry.line, entry.character, -1, false)
                );
            }
            uris.push(entry);
        }
        regexModuleMap.set(file.toString(), uris);
    } catch (error) {
        console.error(`Error scanning VHDL file ${file.fsPath}:`, error);
    }
}
```

- [ ] **Step 9.9: Build to verify no TypeScript errors**

```
npm run build
```

Expected: TypeScript compiles without errors.

- [ ] **Step 9.10: Commit**

```
git add src/extension.ts src/vhdl-parser.ts
git commit -m "feat: integrate VHDL support into extension providers and workspace scanner

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 10: Update `test/test_all.ts` and Final Verification

**Files:**
- Modify: `test/test_all.ts`

- [ ] **Step 10.1: Add VHDL test files to `test/test_all.ts`**

In `test/test_all.ts`, update the `testFiles` array:
```typescript
const testFiles = [
    'test_parse_modules.ts',
    'test_parse_symbols.ts',
    'test_definitions.ts',
    'test_directive.ts',
    'test_warning.ts',
    'test_completion.ts',
    'test_context_detector.ts',
    'test_formatter.ts',
    'test_vhdl_parse_modules.ts',
    'test_vhdl_parse_symbols.ts',
    'test_vhdl_definitions.ts',
    'test_vhdl_warnings.ts',
    'test_vhdl_completion.ts',
];
```

- [ ] **Step 10.2: Run the full test suite**

```
npm run build:antlr && npm run build && npm test
```

Expected output:
```
[==============================] 13/13
All tests passed.
```

If any VHDL tests fail, fix the root cause (do not skip tests).

- [ ] **Step 10.3: Commit**

```
git add test/test_all.ts
git commit -m "test: add VHDL test suites to test_all.ts

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Out of Scope

The following are explicitly excluded from this plan (per the design spec):
- VHDL packages / package bodies
- VHDL configurations
- Protected types / shared variables
- Bit-width mismatch warnings (VHDL-W10/11/12)
- VHDL-specific formatter logic (Task 9 registers a no-op placeholder)
- Formal verification constructs (PSL, SVA)
