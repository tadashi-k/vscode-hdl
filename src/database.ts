/**
 * Internal database types for the Verilog Language Support extension.
 *
 * A single ModuleDatabase instance holds every module discovered in the
 * workspace.  Each Module carries its own parameter, signal, and instance
 * lists so that the separate per-category databases are no longer needed.
 *
 * No VS Code dependency – safe for use in tests.
 */

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
    line: number;
    character: number;
    scanned: boolean;
    /** Ports list (populated by the ANTLR parser, empty before scan). */
    ports: any[];
    /** Signals grouped by name for fast lookup. */
    signalMap: Map<string, any>;
    /** Signals in declaration order. */
    signalList: any[];
    /** Parameters grouped by name. */
    parameterMap: Map<string, any>;
    /** Parameters in declaration order. */
    parameterList: any[];
    /** Module instantiations keyed by instance name. */
    instanceMap: Map<string, any>;
    /** Module instantiations in declaration order. */
    instanceList: any[];
    /** Module-token positions (for hdlModule semantic highlighting). */
    moduleTokens: any[];

    constructor(name: string, uri: string, line: number, character: number, scanned: boolean = false) {
        this.name = name;
        this.uri = uri;
        this.line = line;
        this.character = character;
        this.scanned = scanned;
        this.ports = [];
        this.signalMap = new Map();
        this.signalList = [];
        this.parameterMap = new Map();
        this.parameterList = [];
        this.instanceMap = new Map();
        this.instanceList = [];
        this.moduleTokens = [];
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
    modules: Map<string, Module>;

    constructor() {
        this.modules = new Map<string, Module>();
    }

    /** Add or replace a module entry. */
    addModule(module: Module) {
        this.modules.set(module.name, module);
    }

    /** Retrieve a module by name. */
    getModule(name: string): Module | undefined {
        return this.modules.get(name);
    }

    /** Remove all modules whose uri matches the given file URI. */
    removeModulesFromFile(uri: string) {
        for (const [name, mod] of this.modules.entries()) {
            if (mod.uri === uri) {
                this.modules.delete(name);
            }
        }
    }

    /** Return all modules as an array. */
    getAllModules(): Module[] {
        return Array.from(this.modules.values());
    }

    // ----- Convenience accessors (mirror the old per-category databases) -----

    /** Get all signals belonging to modules defined in the given file URI. */
    getSignalsByUri(uri: string): any[] {
        const result: any[] = [];
        for (const mod of this.modules.values()) {
            if (mod.uri === uri && mod.scanned) {
                result.push(...mod.signalList);
            }
        }
        return result;
    }

    /** Get all parameters belonging to modules defined in the given file URI. */
    getParametersByUri(uri: string): any[] {
        const result: any[] = [];
        for (const mod of this.modules.values()) {
            if (mod.uri === uri && mod.scanned) {
                result.push(...mod.parameterList);
            }
        }
        return result;
    }

    /** Get all instances belonging to modules defined in the given file URI. */
    getInstancesByUri(uri: string): any[] {
        const result: any[] = [];
        for (const mod of this.modules.values()) {
            if (mod.uri === uri && mod.scanned) {
                result.push(...mod.instanceList);
            }
        }
        return result;
    }

    /** Get module-token positions for the given file URI. */
    getModuleTokensByUri(uri: string): any[] {
        // Module tokens are per-file (shared across all modules in the file).
        // Return from the first scanned module found for this URI.
        for (const mod of this.modules.values()) {
            if (mod.uri === uri && mod.scanned) {
                return mod.moduleTokens;
            }
        }
        return [];
    }

    /** Get signals for a specific module by name. */
    getSignals(moduleName: string): any[] {
        const mod = this.modules.get(moduleName);
        return mod && mod.scanned ? mod.signalList : [];
    }

    /** Get parameters for a specific module by name. */
    getParameters(moduleName: string): any[] {
        const mod = this.modules.get(moduleName);
        return mod && mod.scanned ? mod.parameterList : [];
    }

    /** Get instances for a specific module by name. */
    getInstances(moduleName: string): any[] {
        const mod = this.modules.get(moduleName);
        return mod && mod.scanned ? mod.instanceList : [];
    }

    /** Get all signals across all modules. */
    getAllSignals(): any[] {
        const result: any[] = [];
        for (const mod of this.modules.values()) {
            if (mod.scanned) {
                result.push(...mod.signalList);
            }
        }
        return result;
    }

    /** Get all parameters across all modules. */
    getAllParameters(): any[] {
        const result: any[] = [];
        for (const mod of this.modules.values()) {
            if (mod.scanned) {
                result.push(...mod.parameterList);
            }
        }
        return result;
    }

    /** Get all instances across all modules. */
    getAllInstances(): any[] {
        const result: any[] = [];
        for (const mod of this.modules.values()) {
            if (mod.scanned) {
                result.push(...mod.instanceList);
            }
        }
        return result;
    }
}
