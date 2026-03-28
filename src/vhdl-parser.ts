// ANTLR-based VHDL Parser
// Mirrors antlr-parser.ts for the Verilog tier.

import type * as vsCodeModule from 'vscode';
import antlr4 from 'antlr4';
import { Vhdl2008Lexer } from '../antlr/generated/Vhdl2008Lexer';
import { Vhdl2008Parser } from '../antlr/generated/Vhdl2008Parser';
import { Vhdl2008Visitor } from '../antlr/generated/Vhdl2008Visitor';
import { Module, ModuleDatabase, Definition, Port, Parameter, Instance } from './database';
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
    _signalMap: Map<string, Definition> = new Map();
    _signalRefs: Set<string> = new Set();
    _visitingTarget: boolean = false;
    _assignedNames: Map<string, { line: number; character: number }> = new Map();
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

    visitInterface_port_declaration(ctx: any): any {
        if (!this._currentModule) return null;

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
            const targetCtx = ctx.target();
            const targetName = targetCtx.getText().toLowerCase().replace(/\(.*/, '');
            const loc = { line: ctx.start.line - 1, character: ctx.start.column };
            this._assignedNames.set(targetName, loc);
            this._visitingTarget = true;
            this.visitChildren(targetCtx);
            this._visitingTarget = false;
        }
        this.visitChildren(ctx);
        return null;
    }

    // ── Sequential signal assignment (inside process) ─────────────────────────

    visitSignal_assignment_statement(ctx: any): any {
        if (!this._currentModule || this._parseModulesOnly) return null;
        if (ctx.target) {
            const targetCtx = ctx.target();
            const targetName = targetCtx.getText().toLowerCase().replace(/\(.*/, '');
            const loc = { line: ctx.start.line - 1, character: ctx.start.column };
            this._assignedNames.set(targetName, loc);
            this._visitingTarget = true;
            this.visitChildren(targetCtx);
            this._visitingTarget = false;
        }
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

module.exports = AntlrVhdlParser;
