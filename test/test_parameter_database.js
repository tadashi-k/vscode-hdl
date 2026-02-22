#!/usr/bin/env node

// Test script for parameter/localparam database
const vscode = {
    DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3
    }
};

class MockTextDocument {
    constructor(text, uri) {
        this.text = text;
        this.uri = { toString: () => uri };
        this.languageId = 'verilog';
    }

    getText() {
        return this.text;
    }
}

global.vscode = vscode;
const AntlrVerilogParser = require('../src/antlr-parser');

function runTests() {
    console.log('Running Parameter Database Tests...\n');
    console.log('='.repeat(60));

    let totalTests = 0;
    let passedTests = 0;

    const parser = new AntlrVerilogParser();

    // Test 1: parseSymbols returns parameters array
    {
        totalTests++;
        console.log('\nTest 1: parseSymbols returns parameters array');
        const code = `
module param_test (
    input wire clk
);
    parameter WIDTH = 8;
    parameter DEPTH = 16;
endmodule
`;
        const doc = new MockTextDocument(code, 'test.v');
        const result = parser.parseSymbols(doc);

        const pass = Array.isArray(result.parameters) &&
            result.parameters.length === 2 &&
            result.parameters.some(p => p.name === 'WIDTH') &&
            result.parameters.some(p => p.name === 'DEPTH');

        if (pass) {
            console.log('  ✓ Test 1 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 1 FAILED');
            console.log('  parameters:', JSON.stringify(result.parameters));
        }
    }

    // Test 2: parameter kind is 'parameter', localparam kind is 'localparam'
    {
        totalTests++;
        console.log('\nTest 2: parameter kind field');
        const code = `
module kind_test (
    input wire clk
);
    parameter PARAM = 10;
    localparam LOCAL = 20;
endmodule
`;
        const doc = new MockTextDocument(code, 'test.v');
        const { parameters } = parser.parseSymbols(doc);

        const param = parameters.find(p => p.name === 'PARAM');
        const local = parameters.find(p => p.name === 'LOCAL');

        const pass = param && param.kind === 'parameter' &&
                     local && local.kind === 'localparam';

        if (pass) {
            console.log('  ✓ Test 2 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 2 FAILED');
            console.log('  PARAM:', JSON.stringify(param));
            console.log('  LOCAL:', JSON.stringify(local));
        }
    }

    // Test 3: simple integer value evaluation
    {
        totalTests++;
        console.log('\nTest 3: simple integer value evaluation');
        const code = `
module eval_test (
    input wire clk
);
    parameter A = 42;
    parameter B = 8'hFF;
    parameter C = 4'b1010;
endmodule
`;
        const doc = new MockTextDocument(code, 'test.v');
        const { parameters } = parser.parseSymbols(doc);

        const a = parameters.find(p => p.name === 'A');
        const b = parameters.find(p => p.name === 'B');
        const c = parameters.find(p => p.name === 'C');

        const pass = a && a.value === 42 &&
                     b && b.value === 255 &&
                     c && c.value === 10;

        if (pass) {
            console.log('  ✓ Test 3 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 3 FAILED');
            console.log('  A:', JSON.stringify(a));
            console.log('  B:', JSON.stringify(b));
            console.log('  C:', JSON.stringify(c));
        }
    }

    // Test 4: arithmetic expression evaluation
    {
        totalTests++;
        console.log('\nTest 4: arithmetic expression evaluation');
        const code = `
module arith_test (
    input wire clk
);
    parameter WIDTH = 8;
    localparam MAX = WIDTH - 1;
    localparam DOUBLE = 2 * WIDTH;
    localparam HALF = WIDTH / 2;
endmodule
`;
        const doc = new MockTextDocument(code, 'test.v');
        const { parameters } = parser.parseSymbols(doc);

        const max   = parameters.find(p => p.name === 'MAX');
        const dbl   = parameters.find(p => p.name === 'DOUBLE');
        const half  = parameters.find(p => p.name === 'HALF');

        const pass = max  && max.value  === 7  &&
                     dbl  && dbl.value  === 16 &&
                     half && half.value === 4;

        if (pass) {
            console.log('  ✓ Test 4 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 4 FAILED');
            console.log('  MAX:', JSON.stringify(max));
            console.log('  DOUBLE:', JSON.stringify(dbl));
            console.log('  HALF:', JSON.stringify(half));
        }
    }

    // Test 5: parameter carries correct uri, line, character, moduleName
    {
        totalTests++;
        console.log('\nTest 5: parameter location fields');
        const code = `module loc_test (
    input wire clk
);
    parameter PARAM_A = 5;
endmodule
`;
        const doc = new MockTextDocument(code, 'location_test.v');
        const { parameters } = parser.parseSymbols(doc);

        const p = parameters.find(x => x.name === 'PARAM_A');

        const pass = p &&
            p.uri === 'location_test.v' &&
            p.moduleName === 'loc_test' &&
            typeof p.line === 'number' &&
            typeof p.character === 'number';

        if (pass) {
            console.log(`  ✓ Test 5 PASSED (line ${p.line}, char ${p.character})`);
            passedTests++;
        } else {
            console.log('  ✗ Test 5 FAILED');
            console.log('  p:', JSON.stringify(p));
        }
    }

    // Test 6: parameters from two modules are independent
    {
        totalTests++;
        console.log('\nTest 6: parameters per module');
        const code = `
module mod_a (input wire x);
    parameter P = 1;
endmodule
module mod_b (input wire y);
    parameter P = 2;
endmodule
`;
        const doc = new MockTextDocument(code, 'two_mods.v');
        const { parameters } = parser.parseSymbols(doc);

        const pa = parameters.find(p => p.name === 'P' && p.moduleName === 'mod_a');
        const pb = parameters.find(p => p.name === 'P' && p.moduleName === 'mod_b');

        const pass = pa && pa.value === 1 &&
                     pb && pb.value === 2;

        if (pass) {
            console.log('  ✓ Test 6 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 6 FAILED');
            console.log('  parameters:', JSON.stringify(parameters));
        }
    }

    // Test 7: exprText is populated
    {
        totalTests++;
        console.log('\nTest 7: exprText field');
        const code = `
module expr_test (
    input wire clk
);
    parameter BASE = 4;
    localparam CALC = BASE * 2 + 1;
endmodule
`;
        const doc = new MockTextDocument(code, 'expr.v');
        const { parameters } = parser.parseSymbols(doc);

        const base = parameters.find(p => p.name === 'BASE');
        const calc = parameters.find(p => p.name === 'CALC');

        const pass = base && base.exprText === '4' &&
                     calc && typeof calc.exprText === 'string' && calc.exprText.length > 0 &&
                     calc.value === 9;

        if (pass) {
            console.log('  ✓ Test 7 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 7 FAILED');
            console.log('  BASE:', JSON.stringify(base));
            console.log('  CALC:', JSON.stringify(calc));
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
