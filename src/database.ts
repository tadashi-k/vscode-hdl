/**
 * Internal database types for the Verilog Language Support extension.
 *
 * A single ModuleDatabase instance holds every module discovered in the
 * workspace.  Each Module carries its own parameter, signal, and instance
 * lists so that the separate per-category databases are no longer needed.
 *
 * No VS Code dependency – safe for use in tests.
 */

export class BitRange {
    exprMsb: string;
    exprLsb: string;
    msb: number | null; // null if the expression has paramerters, e.g. [WIDTH-1:0]
    lsb: number | null;
}

export class Port {
    name: string;
    line: number;
    character: number;
    direction: 'input' | 'output' | 'inout';
    bitRange: BitRange | null; // treated as 1-bit if null
}

export class Parameter {
    name: string;
    line: number;
    character: number;
    bitRange: BitRange | null; // treated as [31:0] if null
    exprText: string;
    value: number | null;
}

export class Definition {
    name: string;
    line: number;
    character: number;
    type: 'module' | 'port' | 'wire' | 'reg' | 'integer' | 'parameter' | 'localparam';
    description: string;

    constructor(name: string, line: number, character: number, type: any, description: string) {
        this.name = name;
        this.line = line;
        this.character = character;
        this.type = type;
        this.description = description;
    }
}

/**
 * A Verilog module definition stored in the workspace-wide database.
 *
 * After the initial regex scan a module only has name / uri / line /
 * character with scanned === false.  Once the ANTLR parser has processed
 * the file the remaining fields are populated and scanned is set to true.
 */
export class Module {
    name: string;
    uri: string;
    line: number; // line of the module name identifier (0-based)
    character: number; // column of the module name identifier (0-based)
    endLine: number; // line of the module end (0-based)
    scanned: boolean;

    /** Ports in declaration order (populated by the ANTLR parser, empty before scan). */
    ports: Port[] = [];

    /** Parameters as an ordered list. */
    parameterList: any[] = [];

    /** Map from definition name to Definition for O(1) lookup. */
    definitionMap: Map<string, Definition> = new Map();

    constructor(name: string, uri: string, line: number, character: number, endLine: number, scanned = false) {
        this.name = name;
        this.uri = uri;
        this.line = line;
        this.character = character;
        this.endLine = endLine;
        this.scanned = scanned;
    }

    /** Add a definition to both the list and the map. */
    addDefinition(def: Definition) {
        this.definitionMap.set(def.name, def);
    }
}

/**
 * Workspace-wide module database.
 *
 * Stores every module discovered via regex scan or ANTLR parse.
 * Consumers can look up modules by name and query signals / parameters /
 * instances directly from the Module object.
 */
export class ModuleDatabase {
    moduleMap: Map<string, Module>;
    moduleUriMap: Map<string, Module[]>; // for fast lookup of modules by file URI
    

    constructor() {
        this.moduleMap = new Map<string, Module>();
        this.moduleUriMap = new Map<string, Module[]>();
    }

    /** Add a module entry. */
    addModule(module: Module) {
        this.moduleMap.set(module.name, module);
        let modules = this.moduleUriMap.get(module.uri);
        if (!modules) {
            modules = [];
            this.moduleUriMap.set(module.uri, modules);
        }
        modules.push(module);
    }

    /** Retrieve a module by name. */
    getModule(name: string): Module | undefined {
        return this.moduleMap.get(name);
    }

    /** Remove all modules whose uri matches the given file URI. */
    removeModulesFromFile(uri: string) {
        for (const [name, mod] of this.moduleMap.entries()) {
            if (mod.uri === uri) {
                this.moduleMap.delete(name);
            }
        }
        this.moduleUriMap.delete(uri);
    }

    /** Return all modules as an array. */
    getAllModules(): Module[] {
        return Array.from(this.moduleMap.values());
    }

    /** Get all modules belonging to modules defined in the given file URI. */
    getModulesByUri(uri: string): Module[] {
        return this.moduleUriMap.get(uri) || [];
    }

    getModuleByUriPosition(uri: string, line: number): Module | null {
        for (const mod of this.getModulesByUri(uri)) {
            if (mod.line <= line && line <= mod.endLine) {
                return mod;
            }
        }
        return null;
    }
}
