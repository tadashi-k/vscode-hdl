#!/usr/bin/env node

export {};
/**
 * Test for verifying the startup scan behavior:
 * Module database must be built from all workspace .v files BEFORE
 * diagnostics are run on open documents.
 *
 * This validates the fix where scanWorkspaceForModules() is called first
 * and diagnostics are run after the workspace scan completes.
 */

// Mock vscode API
const vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};
(global as any).vscode = vscode;

const AntlrVerilogParser = require('../src/antlr-parser');

class MockTextDocument {
    text: any;
    uri: any;
    languageId: any;
    constructor(text: string, uri: string) {
        this.text = text;
        this.uri = { toString: () => uri };
        this.languageId = 'verilog';
    }
    getText() { return this.text; }
}

// Mirrors the ModuleDatabase class from extension.js
class ModuleDatabase {
    modules: any;
    constructor() {
        this.modules = new Map<string, any>();
    }
    addModule(module: any) {
        this.modules.set(module.name, module);
    }
    getModule(name: any) {
        return this.modules.get(name);
    }
    removeModulesFromFile(uri: any) {
        for (const [name, module] of this.modules.entries()) {
            if (module.uri === uri) {
                this.modules.delete(name);
            }
        }
    }
    getAllModules() {
        return Array.from(this.modules.values()) as any[];
    }
}

function runTests() {
    console.log('Running Startup Scan Tests...\n');
    console.log('='.repeat(60));

    let totalTests = 0;
    let passedTests = 0;

    const parser = new AntlrVerilogParser();
    const moduleDB = new ModuleDatabase();

    // Library module (counter.v) - defined in a separate file
    const counterCode = `
module counter (
    input wire clk,
    input wire reset,
    output reg [7:0] count
);
    always @(posedge clk) begin
        if (reset) count <= 8'b0;
        else count <= count + 1;
    end
endmodule
`;

    // Top-level module (top.v) - instantiates counter from counter.v
    const topCode = `
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

    // Test 1: Without module database, port-connection warnings may appear for cross-file modules
    {
        totalTests++;
        console.log('\nTest 1: Without pre-built module database - cross-file ports unknown');
        const topDoc = new MockTextDocument(topCode, 'top.v');
        const { warnings } = parser.parseSymbols(topDoc, null);

        // Without the module database, port connections to 'counter' are unknown,
        // so signals connected to its output ports may incorrectly appear "never assigned"
        const neverAssignedWarnings = warnings.filter((w: any) => w.message.includes('never assigned'));

        // cnt is connected to counter's output (.count(cnt)), but without the DB
        // the parser doesn't know if 'count' is an output, so cnt may be warned
        const cntWarned = neverAssignedWarnings.some((w: any) => w.message.includes('cnt'));

        if (cntWarned) {
            console.log('  ✓ Test 1 PASSED (without DB: cnt falsely appears never-assigned - expected false positive)');
            passedTests++;
        } else {
            console.log('  ✗ Test 1 FAILED (expected cnt to appear unassigned without module DB)');
            console.log('  warnings:', warnings.map((w: any) => w.message));
        }
    }

    // Test 2: Build module database first (as scanWorkspaceForModules does), then run diagnostics
    {
        totalTests++;
        console.log('\nTest 2: With pre-built module database - cross-file ports resolved');

        // Step 1: Scan library file (simulates scanWorkspaceForModules)
        const counterDoc = new MockTextDocument(counterCode, 'counter.v');
        const { modules: counterModules } = parser.parseSymbols(counterDoc, null);
        for (const mod of counterModules) {
            moduleDB.addModule(mod);
        }

        // Step 2: Scan top file to build its symbols
        const topDoc = new MockTextDocument(topCode, 'top.v');
        const { modules: topModules } = parser.parseSymbols(topDoc, null);
        for (const mod of topModules) {
            moduleDB.addModule(mod);
        }

        // Step 3: Run diagnostics on the open top file WITH the complete module database
        const { warnings } = parser.parseSymbols(topDoc, moduleDB);
        const neverAssignedWarnings = warnings.filter((w: any) => w.message.includes('never assigned'));
        const cntWarned = neverAssignedWarnings.some((w: any) => w.message.includes('cnt'));

        if (!cntWarned) {
            console.log('  ✓ Test 2 PASSED (with DB: cnt correctly identified as assigned via counter output port)');
            passedTests++;
        } else {
            console.log('  ✗ Test 2 FAILED (cnt should not be warned as never-assigned when module DB is available)');
            console.log('  warnings:', warnings.map((w: any) => w.message));
        }
    }

    // Test 3: Module database contains modules from all scanned files
    {
        totalTests++;
        console.log('\nTest 3: Module database populated from all workspace files');

        const counterInDb = moduleDB.getModule('counter');
        const topInDb = moduleDB.getModule('top');

        if (counterInDb && topInDb) {
            console.log(`  ✓ Test 3 PASSED (DB has ${moduleDB.getAllModules().length} modules: counter, top)`);
            passedTests++;
        } else {
            console.log('  ✗ Test 3 FAILED');
            console.log(`  counter in DB: ${!!counterInDb}, top in DB: ${!!topInDb}`);
        }
    }

    // Test 4: Counter module in DB has correct ports
    {
        totalTests++;
        console.log('\nTest 4: Module in database has correct port information');

        const counterMod = moduleDB.getModule('counter');
        const hasClkPort = counterMod && counterMod.ports.some((p: any) => p.name === 'clk' && p.direction === 'input');
        const hasCountPort = counterMod && counterMod.ports.some((p: any) => p.name === 'count' && p.direction === 'output');

        if (hasClkPort && hasCountPort) {
            console.log('  ✓ Test 4 PASSED (counter has correct ports: clk=input, count=output)');
            passedTests++;
        } else {
            console.log('  ✗ Test 4 FAILED');
            console.log('  ports:', counterMod ? JSON.stringify(counterMod.ports.map((p: any) => ({name: p.name, direction: p.direction}))) : 'no module');
        }
    }

    // Test 5: Diagnostics without DB scan first (simulates broken old behavior)
    {
        totalTests++;
        console.log('\nTest 5: Ordering matters - diagnostics before DB scan vs after');

        // Fresh parser for isolated test
        const freshParser = new AntlrVerilogParser();
        const emptyDB = new ModuleDatabase();

        const topDoc = new MockTextDocument(topCode, 'top.v');

        // Simulate OLD behavior: run diagnostics BEFORE scanning library files
        const { warnings: warningsBefore } = freshParser.parseSymbols(topDoc, emptyDB);
        const cntWarnedBefore = warningsBefore.some((w: any) => w.message.includes('cnt') && w.message.includes('never assigned'));

        // Now add counter to DB (simulates workspace scan completing)
        const counterDoc = new MockTextDocument(counterCode, 'counter.v');
        const { modules: cModules } = freshParser.parseSymbols(counterDoc, null);
        for (const mod of cModules) {
            emptyDB.addModule(mod);
        }

        // Simulate NEW behavior: run diagnostics AFTER scanning library files
        const { warnings: warningsAfter } = freshParser.parseSymbols(topDoc, emptyDB);
        const cntWarnedAfter = warningsAfter.some((w: any) => w.message.includes('cnt') && w.message.includes('never assigned'));

        if (cntWarnedBefore && !cntWarnedAfter) {
            console.log('  ✓ Test 5 PASSED (running diagnostics after DB scan avoids false warning for cnt)');
            passedTests++;
        } else {
            console.log('  ✗ Test 5 FAILED');
            console.log(`  cntWarnedBefore=${cntWarnedBefore}, cntWarnedAfter=${cntWarnedAfter}`);
            console.log('  warningsBefore:', warningsBefore.map((w: any) => w.message));
            console.log('  warningsAfter:', warningsAfter.map((w: any) => w.message));
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
