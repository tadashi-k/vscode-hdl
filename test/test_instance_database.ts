#!/usr/bin/env node

// Test script for module instantiation database
import * as path from 'path';

// Mock vscode API for testing
const vscode = {
    DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3
    }
};

// Mock document class
class MockTextDocument {
    text: any;
    uri: any;
    languageId: any;
    constructor(text: string, uri: string) {
        this.text = text;
        this.uri = { toString: () => uri };
        this.languageId = 'verilog';
    }

    getText() {
        return this.text;
    }
}

(global as any).vscode = vscode;
const AntlrVerilogParser = require('../src/antlr-parser');

function runTests() {
    console.log('Running Module Instantiation Database Tests...\n');
    console.log('='.repeat(60));

    let totalTests = 0;
    let passedTests = 0;

    const parser = new AntlrVerilogParser();

    // Test 1: parseSymbols returns instances array
    {
        totalTests++;
        console.log('\nTest 1: parseSymbols returns instances array');
        const code = `
module top (
    input wire clk,
    input wire reset,
    output wire [7:0] count_out
);
    wire [7:0] cnt;

    counter u_counter (
        .clk(clk),
        .reset(reset),
        .count(cnt)
    );

    assign count_out = cnt;
endmodule
`;
        const doc = new MockTextDocument(code, 'top.v');
        const result = parser.parseSymbols(doc);

        const pass = 'instances' in result && Array.isArray(result.instances);

        if (pass) {
            console.log('  ✓ Test 1 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 1 FAILED (instances not in result)');
        }
    }

    // Test 2: Instance has moduleName, instanceName, portConnections, parentModuleName
    {
        totalTests++;
        console.log('\nTest 2: Instance fields');
        const code = `
module top (
    input wire clk,
    input wire reset,
    output wire [7:0] count_out
);
    wire [7:0] cnt;

    counter u_counter (
        .clk(clk),
        .reset(reset),
        .count(cnt)
    );

    assign count_out = cnt;
endmodule
`;
        const doc = new MockTextDocument(code, 'top.v');
        const { instances } = parser.parseSymbols(doc);

        const inst = instances.find((i: any) => i.instanceName === 'u_counter');
        const pass = inst &&
            inst.moduleName === 'counter' &&
            inst.parentModuleName === 'top' &&
            Array.isArray(inst.portConnections);

        if (pass) {
            console.log(`  ✓ Test 2 PASSED (moduleName=${inst.moduleName}, instanceName=${inst.instanceName})`);
            passedTests++;
        } else {
            console.log('  ✗ Test 2 FAILED');
            console.log('  instances:', JSON.stringify(instances));
        }
    }

    // Test 3: Port connections have portName and localSignalName
    {
        totalTests++;
        console.log('\nTest 3: Port connection fields');
        const code = `
module top (
    input wire clk,
    input wire reset,
    output wire [7:0] count_out
);
    wire [7:0] cnt;

    counter u_counter (
        .clk(clk),
        .reset(reset),
        .count(cnt)
    );

    assign count_out = cnt;
endmodule
`;
        const doc = new MockTextDocument(code, 'top.v');
        const { instances } = parser.parseSymbols(doc);

        const inst = instances.find((i: any) => i.instanceName === 'u_counter');
        const clkConn = inst && inst.portConnections.find((p: any) => p.portName === 'clk');
        const cntConn = inst && inst.portConnections.find((p: any) => p.portName === 'count');

        const pass = clkConn && clkConn.localSignalName === 'clk' &&
            cntConn && cntConn.localSignalName === 'cnt';

        if (pass) {
            console.log('  ✓ Test 3 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 3 FAILED');
            console.log('  portConnections:', JSON.stringify(inst ? inst.portConnections : null));
        }
    }

    // Test 4: Multiple instances in one module
    {
        totalTests++;
        console.log('\nTest 4: Multiple instances in one module');
        const code = `
module top (
    input wire a,
    input wire b,
    input wire cin,
    output wire sum,
    output wire cout
);
    wire s1, c1, c2;

    half_adder ha1 (
        .a(a),
        .b(b),
        .sum(s1),
        .carry(c1)
    );

    half_adder ha2 (
        .a(s1),
        .b(cin),
        .sum(sum),
        .carry(c2)
    );
endmodule
`;
        const doc = new MockTextDocument(code, 'top2.v');
        const { instances } = parser.parseSymbols(doc);

        const ha1 = instances.find((i: any) => i.instanceName === 'ha1');
        const ha2 = instances.find((i: any) => i.instanceName === 'ha2');

        const pass = ha1 && ha2 &&
            ha1.moduleName === 'half_adder' &&
            ha2.moduleName === 'half_adder' &&
            ha1.parentModuleName === 'top' &&
            ha2.parentModuleName === 'top';

        if (pass) {
            console.log(`  ✓ Test 4 PASSED (found ${instances.length} instances)`);
            passedTests++;
        } else {
            console.log('  ✗ Test 4 FAILED');
            console.log('  instances:', JSON.stringify(instances.map((i: any) => ({
                moduleName: i.moduleName,
                instanceName: i.instanceName,
                parentModuleName: i.parentModuleName
            }))));
        }
    }

    // Test 5: Instances from separate modules in same file
    {
        totalTests++;
        console.log('\nTest 5: Instances across multiple modules in same file');
        const code = `
module mod_a (input wire clk, output wire q);
    dff u_dff (.clk(clk), .d(clk), .q(q));
endmodule

module mod_b (input wire x, output wire y);
    buf_mod u_buf (.in(x), .out(y));
endmodule
`;
        const doc = new MockTextDocument(code, 'multi.v');
        const { instances } = parser.parseSymbols(doc);

        const instA = instances.find((i: any) => i.parentModuleName === 'mod_a');
        const instB = instances.find((i: any) => i.parentModuleName === 'mod_b');

        const pass = instA && instA.moduleName === 'dff' &&
            instB && instB.moduleName === 'buf_mod';

        if (pass) {
            console.log('  ✓ Test 5 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 5 FAILED');
            console.log('  instances:', JSON.stringify(instances.map((i: any) => ({
                moduleName: i.moduleName,
                instanceName: i.instanceName,
                parentModuleName: i.parentModuleName
            }))));
        }
    }

    // Test 6: Module with no instantiations returns empty instances array
    {
        totalTests++;
        console.log('\nTest 6: Module with no instantiations');
        const code = `
module leaf (
    input wire clk,
    output reg q
);
    always @(posedge clk) q <= ~q;
endmodule
`;
        const doc = new MockTextDocument(code, 'leaf.v');
        const { instances } = parser.parseSymbols(doc);

        const pass = Array.isArray(instances) && instances.length === 0;

        if (pass) {
            console.log('  ✓ Test 6 PASSED');
            passedTests++;
        } else {
            console.log(`  ✗ Test 6 FAILED (expected 0 instances, got ${instances.length})`);
        }
    }

    // Test 7: InstanceDatabase stores and retrieves instances
    {
        totalTests++;
        console.log('\nTest 7: InstanceDatabase stores and retrieves instances');

        // Inline InstanceDatabase (mirrors extension.js implementation)
        class InstanceDatabase {
            instances: any;
            _modulesByUri: any;
            constructor() {
                this.instances = new Map<string, any>();
                this._modulesByUri = new Map<string, any>();
            }
            updateInstances(parentModuleName: any, uri: any, instances: any) {
                this.instances.set(parentModuleName, instances);
                if (!this._modulesByUri.has(uri)) {
                    this._modulesByUri.set(uri, []);
                }
                const list = this._modulesByUri.get(uri);
                if (!list.includes(parentModuleName)) {
                    list.push(parentModuleName);
                }
            }
            getInstances(parentModuleName: any) {
                return this.instances.get(parentModuleName) || [];
            }
            getInstancesByUri(uri: any) {
                const moduleNames = this._modulesByUri.get(uri) || [];
                const result = [];
                for (const name of moduleNames) {
                    result.push(...(this.instances.get(name) || []));
                }
                return result;
            }
            removeInstancesByUri(uri: any) {
                const moduleNames = this._modulesByUri.get(uri) || [];
                for (const name of moduleNames) {
                    this.instances.delete(name);
                }
                this._modulesByUri.delete(uri);
            }
            getAllInstances() {
                const all = [];
                for (const instances of this.instances.values()) {
                    all.push(...instances);
                }
                return all;
            }
        }

        const code = `
module top (
    input wire clk,
    output wire q
);
    wire d;
    dff u_dff (.clk(clk), .d(d), .q(q));
endmodule
`;
        const doc = new MockTextDocument(code, 'top3.v');
        const { instances } = parser.parseSymbols(doc);

        const db = new InstanceDatabase();
        const uri = 'top3.v';
        // Group instances by parent module (as updateDocumentSymbols does)
        const byModule = new Map<string, any>();
        for (const inst of instances) {
            if (!byModule.has(inst.parentModuleName)) byModule.set(inst.parentModuleName, []);
            byModule.get(inst.parentModuleName).push(inst);
        }
        for (const [mod, insts] of byModule) {
            db.updateInstances(mod, uri, insts);
        }

        const topInsts = db.getInstances('top');
        const byUri = db.getInstancesByUri(uri);
        const all = db.getAllInstances();

        // Remove and verify cleanup
        db.removeInstancesByUri(uri);
        const afterRemove = db.getInstances('top');

        const pass = topInsts.length === 1 &&
            topInsts[0].instanceName === 'u_dff' &&
            topInsts[0].moduleName === 'dff' &&
            byUri.length === 1 &&
            all.length === 1 &&
            afterRemove.length === 0;

        if (pass) {
            console.log('  ✓ Test 7 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 7 FAILED');
            console.log('  topInsts:', JSON.stringify(topInsts));
            console.log('  byUri:', JSON.stringify(byUri));
            console.log('  afterRemove:', JSON.stringify(afterRemove));
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`\nTest Results: ${passedTests}/${totalTests} tests passed`);
    console.log('='.repeat(60));

    return passedTests === totalTests;
}

const success = runTests();
process.exit(success ? 0 : 1);
