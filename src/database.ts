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
    rawMsb: string;
    rawLsb: string;
    msb: number | null;
    lsb: number | null;

    constructor(rawMsb: string, rawLsb: string) {
        this.rawMsb = rawMsb;
        this.rawLsb = rawLsb;
        this.msb = null;
        this.lsb = null;
    }
}

export class Signal {
    name: string;
    line: number;
    character: number;
    type: 'wire' | 'reg' | 'integer' | 'real';
    direction: 'input' | 'output' | 'inout' | null; // null for internal signals
    bitRange: BitRange | null; // treated as 1-bit if null
}

export class Parameter {
    name: string;
    line: number;
    character: number;
    kind: 'parameter' | 'localparam';
    bitRange: BitRange | null; // treated as [31:0] if null
    rawValue: string;
    value: number | null;
}

export class Instance {
    moduleName: string;
    instanceName: string;
    startLine: number; // start line of the instance declaration (line number of the module instantiation)
    endLine: number; // end line of the instance declaration (line number of the last line of the module instantiation)
    paramOrderedConnections: string[] | null = null; // parsed parameter value assignment in order, e.g. ["8", "16"] for parameter_value_assignment #(8, 16)
    paramNamedConnections: Map<string, string> | null = null; // parsed parameter value assignment, e.g. {"WIDTH": "8", "DEPTH": "16"}
    signalOrderedConnections: string[] | null = null; // parsed signal connection in order, e.g. ["data_in", "data_out"] for ordered port connection .e.g. module_instance data_in(data_in, data_out)
    signalNamedConnections: Map<string, string> | null = null; // parsed signal connection, e.g. {"data_in": "data_in", "data_out": "data_out"} for named port connection .e.g. module_instance data_in(.data_in(data_in), .data_out(data_out))

    constructor(mouleName: string, instanceName: string, startLine: number, endLine: number) {
        this.moduleName = mouleName;
        this.instanceName = instanceName;
        this.startLine = startLine;
        this.endLine = endLine;
    }

    hasLine(line: number): boolean {
        return this.startLine <= line && line <= this.endLine;
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
    startLine: number; // start line of the module declaration (line number of the "module" keyword)
    endLine: number; // end line of the module declaration (line number of the "endmodule" keyword)
    scanned: boolean;

    /** Ports in declaration order (populated by the ANTLR parser, empty before scan). */
    ports: Signal[] = [];

    /** Signals grouped by name for fast lookup. */
    signalMap: Map<string, Signal> = new Map();

    /** Parameters grouped by name. */
    parameterMap: Map<string, Parameter> = new Map();

    /** Module instantiations keyed by instance name. */
    instanceList: Instance[] = [];

    constructor(name: string, uri: string, startLine: number, endLine: number, scanned = false) {
        this.name = name;
        this.uri = uri;
        this.startLine = startLine;
        this.endLine = endLine;
        this.scanned = false;
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
        let module: Module | null = null;
        for (const mod of this.getModulesByUri(uri)) {
            if (mod.startLine <= line && line <= mod.endLine) {
                return module;
            }
        }
        return null;
    }
}
