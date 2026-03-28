# VHDL Support Design

**Date:** 2026-03-28  
**Extension:** vscode-hdl  
**Scope:** Full-parity VHDL support alongside existing Verilog support

---

## Problem Statement

The vscode-hdl extension provides rich Verilog/SystemVerilog IDE features (hover, goto-definition, diagnostics, completion, semantic tokens, formatting) backed by an ANTLR parser and a `ModuleDatabase`. VHDL — the other dominant HDL — is currently unsupported. This spec defines how to add full-parity VHDL support using a parallel implementation that shares the existing database layer.

---

## Approach

**Parallel implementation (Option A):** Add VHDL-specific scanner and parser alongside the Verilog equivalents. VHDL entities are stored as `Module` objects in the existing `ModuleDatabase`. VS Code providers dispatch based on `document.languageId`. No breaking changes to the Verilog code path.

Alternatives considered and rejected:
- **Abstract language-agnostic providers** — cleaner long-term but requires refactoring working Verilog code, high regression risk.
- **LSP server** — most scalable but a complete architectural departure; too large for this milestone.

---

## File Layout

```
antlr/
  Vhdl2008.g4               adapted from antlr/grammars-v4 vhdl2008 grammar
  (generated ANTLR output)

syntaxes/
  verilog.tmLanguage.json   unchanged
  vhdl.tmLanguage.json      new TextMate grammar for VHDL

contents/
  counter.vhd               entity/architecture for a counter
  full_adder.vhd            combinational entity with generics
  test_entity.vhd           entity with generics and signals
  test_instance.vhd         component instantiation example
  test_warnings.vhd         signals triggering each VHDL warning case

  vhdl-language-configuration.json   new — VHDL comment/bracket config (-- comments, begin/end)

src/
  database.ts               unchanged — shared by both languages
  verilog-scanner.ts        unchanged
  antlr-parser.ts           unchanged
  vhdl-scanner.ts           new — regex entity-name indexer
  vhdl-parser.ts            new — ANTLR-based full VHDL parser
  extension.ts              updated — providers dispatch on languageId

test/
  test_vhdl_parse_modules.ts
  test_vhdl_parse_symbols.ts
  test_vhdl_definitions.ts
  test_vhdl_warnings.ts
  test_vhdl_completion.ts
  test_all.ts               updated to include VHDL suites
```

---

## Data Model

VHDL constructs are mapped to the existing `database.ts` classes. No new classes are needed.

| VHDL construct | Maps to | Notes |
|---|---|---|
| `entity` | `Module` | `module.name` = entity name |
| `generic` | `Parameter` (kind: `'parameter'`) | VHDL generics are overridable |
| `port (in/out/inout/buffer)` | `Port` | direction mapped directly |
| `signal` (in architecture) | `Definition` (type: `'wire'`) | architecture-level signals |
| `variable` (in process) | `Definition` (type: `'reg'`) | process-local variables |
| `constant` | `Definition` (type: `'localparam'`) | VHDL constants |
| `component instantiation` | `Instance` | instanceName + entityName |

`Module.scanned` retains its meaning: `false` = regex-indexed only, `true` = full ANTLR parse.

---

## Grammar: `antlr/Vhdl2008.g4`

Start from the [vhdl2008 grammar](https://github.com/antlr/grammars-v4/tree/master/vhdl/vhdl2008) in antlr/grammars-v4. Trim or stub out constructs not needed for semantic extraction (packages, configurations, protected types) to keep parse time fast. The rules used for semantic extraction are:

- `entity_declaration` — entity name, port clause, generic clause
- `architecture_body` — associates with entity, contains signal/constant declarations and concurrent statements
- `port_clause` / `port_element` — port name, direction (in/out/inout/buffer), type
- `generic_clause` / `generic_element` — generic name, type, default value
- `signal_declaration` — architecture-level signals
- `variable_declaration` — process-local variables
- `constant_declaration` — constants
- `concurrent_signal_assignment_statement` — write-side signal references
- `process_statement` — marks procedural context; contains sequential statements
- `component_instantiation_statement` — component instance name + entity/component reference
- `association_element` — port map connections

---

## New Source Files

### `src/vhdl-scanner.ts`

Mirrors `verilog-scanner.ts`. Responsibilities:
- Regex scan `.vhd` / `.vhdl` files to extract entity names and file URIs for fast workspace indexing
- Strip `--` line comments and `/* */` block comments before applying regex
- Return a list of lightweight `Module` objects (name + uri + line, `scanned: false`)
- Support `.hdlignore` exclusions (reuse existing logic)

### `src/vhdl-parser.ts`

Mirrors `antlr-parser.ts`. Exports `AntlrVhdlParser` with:

```ts
parseModules(doc: TextDocument, fileReader?: FileReader): Module[]
parseSymbols(doc: TextDocument, fileReader?: FileReader): Module[]
```

Internally uses `VhdlSymbolVisitor extends VhdlVisitor` which:
- Tracks `_currentModule: Module | null` and per-module signal state (same pattern as `VerilogSymbolVisitor`)
- Implements `_generateWarnings()` → saves state to `_pendingModuleData`
- Implements `_finalizeWarnings()` → generates all 5 VHDL warnings after full parse
- Emits the same semantic token types (`hdlReg`, `hdlWire`, `hdlParameter`, `hdlModule`) for shared highlighting

---

## VS Code Provider Changes (`extension.ts`)

Each provider is updated to dispatch on `document.languageId`:

| Provider | Change |
|---|---|
| `onDidOpenTextDocument` | if `languageId === 'vhdl'` → call `AntlrVhdlParser.parseSymbols()` |
| `onDidChangeTextEditorSelection` | same dispatch |
| `VerilogDefinitionProvider` | renamed `HdlDefinitionProvider`; handles both languages via shared `ModuleDatabase` |
| Hover provider | language-agnostic lookup; works unchanged |
| `VerilogCompletionItemProvider` | VHDL branch: signals inside `process`, entity instantiation snippets outside |
| `VerilogDocumentSymbolProvider` | unchanged — reads from `Module`; works for both |
| `VerilogSemanticTokensProvider` | unchanged — token types are language-agnostic |
| Formatting | new `VhdlDocumentFormattingEditProvider` for VHDL-specific indentation |

Workspace initialization: `verilog-scanner.ts` scans `.v` files; `vhdl-scanner.ts` scans `.vhd`/`.vhdl` files. Both results populate the same `ModuleDatabase`.

---

## Syntax Highlighting: `syntaxes/vhdl.tmLanguage.json`

New TextMate grammar covering:
- `--` line comments, `/* */` block comments
- String literals
- `entity`, `architecture`, `port`, `generic`, `process`, `signal`, `variable`, `constant` keywords
- VHDL-2008 type names (`std_logic`, `std_logic_vector`, `integer`, `natural`, `boolean`, etc.)
- Numeric literals (binary `"1010"`, hex `X"FF"`, decimal)
- Operators

---

## VHDL Diagnostics (5 Warnings)

Only warnings that map cleanly to VHDL are implemented. Verilog warnings tied to reg/wire semantics or bit-width types are excluded from this phase.

| ID | Warning | Condition |
|---|---|---|
| VHDL-W1 | Signal declared but never used | `signal`/`variable` declared but never read anywhere in the architecture |
| VHDL-W2 | Input port used as l-value | `in` port appears on the left side of a signal assignment |
| VHDL-W3 | Signal never assigned | `signal`/`variable` is never the target of any assignment |
| VHDL-W4 | Missing port in named connection | Component instantiation uses named port map but omits a required port |
| VHDL-W5 | Instantiated entity not found | Component refers to an entity name not present in `ModuleDatabase` |

---

## Sample VHDL Files (`contents/`)

| File | Purpose |
|---|---|
| `counter.vhd` | Basic counter entity/architecture (clk, reset, q port) |
| `full_adder.vhd` | Combinational entity with generics for bit width |
| `test_entity.vhd` | Entity with multiple port directions and internal signals |
| `test_instance.vhd` | Architecture instantiating `counter` and `full_adder` |
| `test_warnings.vhd` | Entities designed to trigger each of the 5 warning types |

---

## Testing

New test files in `test/`, each mirroring the Verilog test pattern (mock `vscode`, `MockTextDocument`, call parser, assert results):

| File | What it tests |
|---|---|
| `test_vhdl_parse_modules.ts` | Entity names, ports, generics from `contents/*.vhd` |
| `test_vhdl_parse_symbols.ts` | Full symbol extraction including instances |
| `test_vhdl_definitions.ts` | Signal/constant/variable definitions with correct position and description |
| `test_vhdl_warnings.ts` | All 5 VHDL warnings fire on `test_warnings.vhd` |
| `test_vhdl_completion.ts` | Instantiation snippet generation for VHDL entities |

`test/test_all.ts` is updated to include all 5 new VHDL suites.

---

## `package.json` Changes

```json
{
  "activationEvents": ["onLanguage:verilog", "onLanguage:vhdl"],
  "contributes": {
    "languages": [
      { "id": "vhdl", "aliases": ["VHDL", "vhdl"], "extensions": [".vhd", ".vhdl"],
        "configuration": "./vhdl-language-configuration.json" }
    ],
    "grammars": [
      { "language": "vhdl", "scopeName": "source.vhdl",
        "path": "./syntaxes/vhdl.tmLanguage.json" }
    ]
  }
}
```

A new `vhdl-language-configuration.json` is required — the existing `language-configuration.json` uses `//` for line comments and `module`/`endmodule` brackets, which is incorrect for VHDL. The VHDL config uses `--` for line comments, no block comment character (VHDL has none in standard), and `begin`/`end` bracket pairs.

---

## Out of Scope (This Phase)

- VHDL packages / package bodies
- VHDL configurations
- Protected types / shared variables
- Bit-width mismatch warnings (W-V10/11/12) — VHDL type system is too different
- SystemVerilog features — already out of scope for Verilog tier too
- Formal verification constructs (PSL, SVA)
