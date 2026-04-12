// ANTLR-based VHDL Parser
// Mirrors verilog-parser.ts for the Verilog tier.

import type * as vsCodeModule from 'vscode';
import antlr4 from 'antlr4';
import { Vhdl2008Lexer } from '../antlr/generated/Vhdl2008Lexer';
import { Vhdl2008Parser } from '../antlr/generated/Vhdl2008Parser';
import { Vhdl2008Visitor } from '../antlr/generated/Vhdl2008Visitor';
import { Module, ModuleDatabase, Definition, Port, Parameter, Instance, BitRange } from './database';
// Used by instantiation completion — referenced indirectly via extension.ts
import { buildInstantiationSnippet } from './instantiation-snippet'; // eslint-disable-line @typescript-eslint/no-unused-vars

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

// ── Case-insensitive input stream ─────────────────────────────────────────────
// ANTLR4 JS runtime (v4.8) does not support the grammar-level `caseInsensitive`
// option.  We work around this by overriding LA() to return the upper-case code
// point so the lexer (which was generated from uppercase literals) matches
// regardless of how the user wrote the source.

class CaseInsensitiveInputStream extends antlr4.InputStream {
    constructor(data: string) {
        super(data);
    }

    LA(offset: number): number {
        const c = (antlr4.InputStream.prototype as any).LA.call(this, offset);
        if (c <= 0) { return c; }
        // Fast path: ASCII lowercase a-z → uppercase A-Z without string allocation.
        // LA() is called for every character the lexer examines, so avoiding
        // String.fromCodePoint/toUpperCase here gives a large speedup.
        if (c >= 0x61 && c <= 0x7a) { return c - 32; }
        // Slow path for non-ASCII (rare in VHDL source)
        return String.fromCodePoint(c).toUpperCase().codePointAt(0) as number;
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

/**
 * Parse a VHDL subtype_indication text (as returned by ANTLR getText(), which
 * strips whitespace) and extract a BitRange when the type carries an explicit
 * index constraint, e.g. `std_logic_vector(7downto0)` or `unsigned(0to7)`.
 *
 * Returns null for scalar types such as `std_logic` or `boolean`.
 */
function parseVhdlBitRange(typeText: string): BitRange | null {
    // Numeric descending: (7downto0)
    const numDownto = typeText.match(/\((\d+)downto(\d+)\)/i);
    if (numDownto) {
        return new BitRange(parseInt(numDownto[1], 10), parseInt(numDownto[2], 10));
    }
    // Numeric ascending: (0to7) — store as [MSB:LSB] = [7:0]
    const numTo = typeText.match(/\((\d+)to(\d+)\)/i);
    if (numTo) {
        return new BitRange(parseInt(numTo[2], 10), parseInt(numTo[1], 10));
    }
    // Expression-based descending: (WIDTH-1downto0)
    const exprDownto = typeText.match(/\((.+?)downto(.+?)\)/i);
    if (exprDownto) {
        const br = new BitRange(0, 0);
        br.msb = null;
        br.lsb = null;
        br.exprMsb = exprDownto[1];
        br.exprLsb = exprDownto[2];
        return br;
    }
    // Expression-based ascending: (0to WIDTH-1)
    const exprTo = typeText.match(/\((.+?)to(.+?)\)/i);
    if (exprTo) {
        const br = new BitRange(0, 0);
        br.msb = null;
        br.lsb = null;
        br.exprMsb = exprTo[2];
        br.exprLsb = exprTo[1];
        return br;
    }
    return null;
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
    _signalMap: Map<string, Definition> = new Map();
    _signalRefs: Set<string> = new Set();
    _visitingTarget: boolean = false;
    _assignedNames: Map<string, { line: number; character: number }> = new Map();
    _inComponentDeclaration: boolean = false;
    _inPortClause: boolean = false;
    _instanceList: Instance[] = [];
    _instPortConnections: Map<string, Set<string>> = new Map();

    // All entity names referenced in instantiations
    allModuleRefs: Set<string> = new Set();

    _pendingWarningData: Array<{
        module: Module;
        signalList: Array<{ name: string; line: number; character: number }>;
        signalRefs: Set<string>;
        assignedNames: Map<string, { line: number; character: number }>;
        instPortConnections: Map<string, Set<string>>;
        instanceList: Instance[];
    }> = [];

    constructor(uri: string, db: ModuleDatabase, parseModulesOnly = false) {
        super();
        this.uri = uri;
        this._moduleDatabase = db;
        this._parseModulesOnly = parseModulesOnly;
    }

    // ── Entity declaration ────────────────────────────────────────────────────

    visitEntity_declaration(ctx: any): any {
        const entityName = ctx.identifier(0).getText().toLowerCase();
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

    // Suppress component declaration contents — ports/generics inside a
    // component_declaration live in the parent architecture, not in the entity.
    visitComponent_declaration(ctx: any): any {
        this._inComponentDeclaration = true;
        this.visitChildren(ctx);
        this._inComponentDeclaration = false;
        return null;
    }

    // Track when we are inside a port clause so that interface_constant_declaration
    // nodes (which the grammar uses for `in`-mode ports) are treated as ports rather
    // than as generics.
    visitPort_clause(ctx: any): any {
        this._inPortClause = true;
        this.visitChildren(ctx);
        this._inPortClause = false;
        return null;
    }

    visitInterface_signal_declaration(ctx: any): any {
        if (!this._currentModule || this._inComponentDeclaration) return null;

        const idList = ctx.identifier_list ? ctx.identifier_list() : null;
        const names: string[] = idList
            ? idList.identifier().map((id: any) => id.getText())
            : [ctx.identifier ? ctx.identifier(0).getText() : 'unknown'];

        const modeCtx = ctx.mode_rule ? ctx.mode_rule() : null;
        const direction = vhdlModeToDirection(modeCtx ? modeCtx.getText() : 'in');
        const line = ctx.start.line - 1;
        const character = ctx.start.column;

        for (const name of names) {
            const typeText = ctx.subtype_indication ? ctx.subtype_indication().getText() : '';
            const bitRange = parseVhdlBitRange(typeText);
            this._currentModule.addPort({ name, direction, line, character, bitRange });
            const desc = `${direction.padEnd(6)}  ${name} : ${typeText}`;
            this._currentModule.addDefinition(
                new Definition(name, line, character, 'port', desc)
            );
        }
        return null;
    }

    // ── Generic declarations ──────────────────────────────────────────────────

    visitInterface_constant_declaration(ctx: any): any {
        if (!this._currentModule || this._inComponentDeclaration) return null;

        const idList = ctx.identifier_list ? ctx.identifier_list() : null;
        const names: string[] = idList
            ? idList.identifier().map((id: any) => id.getText())
            : [ctx.identifier ? ctx.identifier(0).getText() : 'unknown'];

        const line = ctx.start.line - 1;
        const character = ctx.start.column;
        const typeText = ctx.subtype_indication ? ctx.subtype_indication().getText() : '';

        // Inside a port_clause the grammar reuses interface_constant_declaration
        // for `in`-mode ports (the CONSTANT keyword and IN keyword are both optional).
        // Treat those as input ports instead of generics.
        if (this._inPortClause) {
            for (const name of names) {
                const bitRange = parseVhdlBitRange(typeText);
                this._currentModule.addPort({ name, direction: 'input', line, character, bitRange });
                const desc = `input   ${name} : ${typeText}`;
                this._currentModule.addDefinition(
                    new Definition(name, line, character, 'port', desc)
                );
            }
            return null;
        }

        const exprText = ctx.expression?.()?.getText() ?? '';
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

        // Architecture syntax: architecture <archId> of <entityName> is ...
        // The entity name is accessed via name() in the grammar
        const entityNameCtx = ctx.name ? ctx.name() : null;
        const entityName = entityNameCtx ? entityNameCtx.getText().toLowerCase() : '';
        const existingModule = entityName ? this._moduleDatabase.getModule(entityName) : null;

        if (existingModule) {
            this._currentModule = existingModule;
        } else {
            const archId = ctx.identifier ? ctx.identifier(0)?.getText() ?? 'unknown' : 'unknown';
            this._currentModule = new Module(
                entityName || archId, this.uri,
                ctx.start.line - 1, ctx.start.column, -1, true
            );
            this._moduleDatabase.addModule(this._currentModule);
        }

        this._signalList = [];
        this._signalMap = new Map();
        this._signalRefs = new Set();
        this._assignedNames = new Map();
        this._instanceList = [];
        this._instPortConnections = new Map();

        this.visitChildren(ctx);

        const endToken = ctx.stop ?? ctx.start;
        this._currentModule.endLine = endToken.line - 1;

        this._pendingWarningData.push({
            module: this._currentModule,
            signalList: [...this._signalList],
            signalRefs: new Set(this._signalRefs),
            assignedNames: new Map(this._assignedNames),
            instPortConnections: new Map(this._instPortConnections),
            instanceList: [...this._instanceList],
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
            const def = new Definition(name, line, character, 'wire', desc);
            this._currentModule.addDefinition(def);
            this._signalList.push({ name, line, character });
            this._signalMap.set(def.name, def);
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
            const def = new Definition(name, line, character, 'reg', desc);
            this._currentModule.addDefinition(def);
            this._signalList.push({ name, line, character });
            this._signalMap.set(def.name, def);
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
        const exprText = ctx.expression?.()?.getText() ?? '';

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

    // ── Signal assignment target tracking ─────────────────────────────────────
    // In the VHDL2008 grammar the direct `target` child lives in:
    //   • simple_signal_assignment        (sequential, inside process)
    //   • conditional_waveform_assignment (concurrent conditional / simple concurrent)
    //   • concurrent_simple_signal_assignment (another concurrent form)
    // We hook all three so that _assignedNames is correctly populated for W2/W3.

    _recordTarget(ctx: any): void {
        if (!this._currentModule || this._parseModulesOnly) return;
        const targetCtx = ctx.target ? ctx.target() : null;
        if (!targetCtx) return;
        const targetName = targetCtx.getText().toLowerCase().replace(/[(\s].*/, '');
        const loc = { line: ctx.start.line - 1, character: ctx.start.column };
        this._assignedNames.set(targetName, loc);
        this._visitingTarget = true;
        this.visitChildren(targetCtx);
        this._visitingTarget = false;
    }

    // Sequential signal assignment inside a process
    visitSimple_signal_assignment(ctx: any): any {
        this._recordTarget(ctx);
        this.visitChildren(ctx);
        return null;
    }

    // Concurrent signal assignment: target <= [delay] waveform_or_cond;
    visitConditional_waveform_assignment(ctx: any): any {
        this._recordTarget(ctx);
        this.visitChildren(ctx);
        return null;
    }

    // Another concurrent form (WITH … SELECT … target <=)
    visitConcurrent_simple_signal_assignment(ctx: any): any {
        this._recordTarget(ctx);
        this.visitChildren(ctx);
        return null;
    }

    // ── Name references (track signal reads) ──────────────────────────────────

    visitName(ctx: any): any {
        if (!this._parseModulesOnly && !this._visitingTarget) {
            const text = ctx.getText().toLowerCase().replace(/\s/g, '');
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
        const instanceName = labelCtx ? labelCtx.identifier().getText() : 'unknown';

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
            this._instanceList.push(inst);

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
            const { module, signalList, signalRefs, assignedNames, instPortConnections } = pending;

            for (const sig of signalList) {
                const nameLow = sig.name.toLowerCase();
                const neverRead = !signalRefs.has(nameLow);

                // VHDL-W1: declared but never read
                if (neverRead) {
                    this.warnings.push({
                        line: sig.line,
                        character: sig.character,
                        length: sig.name.length,
                        message: `VHDL-W1: Signal '${sig.name}' is declared but never used`,
                        severity: vscode.DiagnosticSeverity.Warning,
                    });
                }

                // VHDL-W3: never assigned (only when not already flagged by W1)
                if (!assignedNames.has(nameLow) && !neverRead) {
                    this.warnings.push({
                        line: sig.line,
                        character: sig.character,
                        length: sig.name.length,
                        message: `VHDL-W3: Signal '${sig.name}' is never assigned`,
                        severity: vscode.DiagnosticSeverity.Warning,
                    });
                }
            }

            // VHDL-W2: input port used as l-value
            for (const [name, loc] of assignedNames) {
                const port = module.ports.find((p: any) => p.name.toLowerCase() === name.toLowerCase());
                if (port && port.direction === 'input') {
                    this.warnings.push({
                        line: loc.line,
                        character: loc.character,
                        length: name.length,
                        message: `VHDL-W2: Input port '${name}' cannot be used as l-value`,
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
                            length: inst.instanceName ? inst.instanceName.length : inst.moduleName.length,
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
                        length: inst.moduleName.length,
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
 * Preprocess VHDL text: replace -- line comments with spaces (preserving line count).
 * Block comments are handled by the ANTLR lexer grammar.
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

    _parse(doc: any, db: ModuleDatabase, _fileReader: any, parseModulesOnly: boolean): VhdlSymbolVisitor {
        const text = preprocessVhdl(doc.getText());
        const uri = doc.uri.toString();

        const inputStream = new CaseInsensitiveInputStream(text);
        const lexer = new Vhdl2008Lexer(inputStream);
        const tokenStream = new antlr4.CommonTokenStream(lexer);
        const parser = new Vhdl2008Parser(tokenStream);

        const errorListener = new VhdlErrorListener();
        parser.removeErrorListeners();
        parser.addErrorListener(errorListener);

        parser._interp.predictionMode = antlr4.atn.PredictionMode.SLL;
        let tree = parser.design_file();

        /* disabled because it has too big cost
        // Two-stage parsing: try fast SLL mode first; fall back to full LL
        // only when SLL produces errors.  SLL skips full-context ATN simulation
        if (errorListener.errors.length > 0) {
            tokenStream.seek(0);
            parser.reset();
            errorListener.errors = [];
            parser._interp.predictionMode = antlr4.atn.PredictionMode.LL;
            tree = parser.design_file();
        }
        */

        const visitor = new VhdlSymbolVisitor(uri, db, parseModulesOnly);
        visitor.visit(tree);
        visitor.errors.push(...errorListener.errors);
        return visitor;
    }

    parseModules(doc: any, db: ModuleDatabase, fileReader?: any): Module[] {
        this._parse(doc, db, fileReader ?? null, true);
        const uri = doc.uri.toString();
        return db.getModulesByUri(uri);
    }

    parseSymbols(doc: any, db: ModuleDatabase, fileReader: any): any[] {
        const uri = doc.uri.toString();
        if (this._lastVisitor && (this._lastVisitor as any).uri === uri && !this._dirty) {
            return this.getDiagnostics(db);
        }
        this._dirty = false;
        const visitor = this._parse(doc, db, fileReader, false);
        visitor.generateWarnings(db);
        this._lastVisitor = visitor;
        this._cachedErrors = [...visitor.errors];
        this._cachedWarnings = [...visitor.warnings];
        this._dirty = false;
        return this.getDiagnostics(db);
    }

    getDiagnostics(_db: ModuleDatabase): any[] {
        return [...this._cachedErrors, ...this._cachedWarnings];
    }

    generateWarnings(moduleDatabase: ModuleDatabase): void {
        if (this._lastVisitor) {
            this._lastVisitor.generateWarnings(moduleDatabase);
        }
    }
}

export = AntlrVhdlParser;
