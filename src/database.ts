/**
 * evaluate a Verilog constant expression and returns its value as a number.
 * If the expression cannot be evaluated, it returns null.
 */
function evaluateExpression(expr: string, params?: Map<string, Parameter>): number | null {
    return null;
}

class BitRange {
    rawMsb: string;
    rawLsb: string;
    msb: number | null;
    lsb: number | null;

    constructor(rawMsb: string, rawLsb: string) {
        this.rawMsb = rawMsb;
        this.rawLsb = rawLsb;
        this.msb = evaluateExpression(rawMsb);
        this.lsb = evaluateExpression(rawMsb);
    }
}

class Signal {
    name: string;
    line: number;
    character: number;
    type: 'wire' | 'reg' | 'integer' | 'real';
    direction: 'input' | 'output' | 'inout' | null; // null for internal signals
    bitRange: BitRange | null; // treated as 1-bit if null
}

class Parameter {
    name: string;
    line: number;
    character: number;
    kind: 'parameter' | 'localparam';
    bitRange: BitRange | null; // treated as [31:0] if null
    rawValue: string;
    value: number | null;
}

class Instance {
    moduleName: string;
    instanceName: string;
    line: number;
    character: number;
    paramOrderedAssignments: string[] | null; // parsed parameter value assignment in order, e.g. ["8", "16"] for parameter_value_assignment #(8, 16)
    paramNamedAssignments: Map<string, string> | null; // parsed parameter value assignment, e.g. {"WIDTH": "8", "DEPTH": "16"}
    signalOrderedConnections: string[] | null; // parsed signal connection in order, e.g. ["data_in", "data_out"] for ordered port connection .e.g. module_instance data_in(data_in, data_out)
    signalNamedConnections: Map<string, string> | null; // parsed signal connection, e.g. {"data_in": "data_in", "data_out": "data_out"} for named port connection .e.g. module_instance data_in(.data_in(data_in), .data_out(data_out))
}

class Module {
    name: string;
    uri: string;
    line: number;
    character: number;
    scanned: boolean; // true if all signals, parameters, and instances have been scanned for this module
    parameterMap: Map<string, Parameter>;
    parameterList: Parameter[]; // parameters in the order they are declared
    signalMap: Map<string, Signal>;
    signalList: Signal[]; // signals in the order they are declared
    instances: Map<string, Instance>;
}

class ModuleDatabase {
    modules: Map<string, Module>;

    constructor() {
        this.modules = new Map<string, Module>();
    }
}
