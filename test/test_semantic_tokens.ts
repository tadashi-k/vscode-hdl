#!/usr/bin/env node

// Test script for semantic token computation
import * as fs from 'fs';
import * as path from 'path';

// Mock vscode API for antlr-parser
const vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
};
(global as any).vscode = vscode;

import { computeSemanticTokens } from '../src/semantic-tokens';
import AntlrVerilogParser = require('../src/antlr-parser');

const parser = new AntlrVerilogParser();

class MockTextDocument {
    text: string;
    uri: any;
    languageId: string;
    constructor(text: string, uri: string) {
        this.text = text;
        this.uri = { toString: () => uri };
        this.languageId = 'verilog';
    }
    getText() {
        return this.text;
    }
}

function runTests() {
    console.log('Running Semantic Token Tests...\n');
    console.log('='.repeat(60));

    let totalTests = 0;
    let passedTests = 0;

    // Helper: parse counter.v and return signals/parameters
    const counterPath = path.join(__dirname, '../contents', 'counter.v');
    const counterContent = fs.readFileSync(counterPath, 'utf8');
    const counterDoc = new MockTextDocument(counterContent, counterPath);
    const counterResult = parser.parseSymbols(counterDoc);
    const counterSignals = counterResult.signals;
    const counterParams = counterResult.parameters;

    // Helper: find a 0-based line number by matching line content
    function findLine(text: string, pattern: string): number {
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(pattern)) return i;
        }
        return -1;
    }

    // Test 1: Both identifiers in "reg a, b;" get hdlReg token type at declaration
    {
        totalTests++;
        console.log('\nTest 1: reg a, b; - both identifiers get hdlReg token at declaration');

        const tokens = computeSemanticTokens(counterContent, counterSignals, counterParams);
        const declLine = findLine(counterContent, 'reg a, b;');
        const lines = counterContent.split('\n');
        const aChar = lines[declLine].indexOf('a', lines[declLine].indexOf('reg') + 3);
        const bChar = lines[declLine].indexOf('b', aChar + 1);

        const line15Tokens = tokens.filter(t => t.line === declLine);
        const aDecl = line15Tokens.find(t => t.character === aChar && t.length === 1);
        const bDecl = line15Tokens.find(t => t.character === bChar && t.length === 1);

        const pass = aDecl !== undefined && aDecl.tokenType === 'hdlReg' &&
                     bDecl !== undefined && bDecl.tokenType === 'hdlReg' &&
                     aDecl.tokenModifiers.includes('declaration') &&
                     bDecl.tokenModifiers.includes('declaration');

        if (pass) {
            console.log('  ✓ Test 1 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 1 FAILED');
            console.log('  declLine:', declLine, 'aChar:', aChar, 'bChar:', bChar);
            console.log('  tokens on line:', JSON.stringify(line15Tokens));
        }
    }

    // Test 2: "{a,b} <= ..." usage — identifiers get same hdlReg token as definition
    {
        totalTests++;
        console.log('\nTest 2: {a,b} usage - same hdlReg token type (no declaration modifier)');

        const tokens = computeSemanticTokens(counterContent, counterSignals, counterParams);
        const usageLine = findLine(counterContent, '{a,b}');
        const lines = counterContent.split('\n');

        const lineTokens = tokens.filter(t => t.line === usageLine);
        const aUsage = lineTokens.find(t => t.length === 1 && lines[usageLine].charAt(t.character) === 'a');
        const bUsage = lineTokens.find(t => t.length === 1 && lines[usageLine].charAt(t.character) === 'b');

        const pass = aUsage !== undefined && aUsage.tokenType === 'hdlReg' &&
                     bUsage !== undefined && bUsage.tokenType === 'hdlReg' &&
                     !aUsage.tokenModifiers.includes('declaration') &&
                     !bUsage.tokenModifiers.includes('declaration');

        if (pass) {
            console.log('  ✓ Test 2 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 2 FAILED');
            console.log('  usageLine:', usageLine);
            console.log('  tokens on line:', JSON.stringify(lineTokens));
        }
    }

    // Test 3: wire signals get hdlWire token type
    {
        totalTests++;
        console.log('\nTest 3: wire signals get hdlWire token');

        const tokens = computeSemanticTokens(counterContent, counterSignals, counterParams);
        const lines = counterContent.split('\n');
        const enableTokens = tokens.filter(t => {
            return lines[t.line].substring(t.character, t.character + t.length) === 'enable';
        });

        const pass = enableTokens.length > 0 && enableTokens.every(t => t.tokenType === 'hdlWire');

        if (pass) {
            console.log(`  ✓ Test 3 PASSED (${enableTokens.length} enable tokens, all hdlWire)`);
            passedTests++;
        } else {
            console.log('  ✗ Test 3 FAILED');
            console.log('  enable tokens:', JSON.stringify(enableTokens));
        }
    }

    // Test 4: integer signals get hdlInteger token type
    {
        totalTests++;
        console.log('\nTest 4: integer signals get hdlInteger token');

        const tokens = computeSemanticTokens(counterContent, counterSignals, counterParams);
        const lines = counterContent.split('\n');
        const cntTokens = tokens.filter(t => {
            return lines[t.line].substring(t.character, t.character + t.length) === 'cnt';
        });

        const pass = cntTokens.length > 0 && cntTokens.every(t => t.tokenType === 'hdlInteger');

        if (pass) {
            console.log(`  ✓ Test 4 PASSED (${cntTokens.length} cnt tokens, all hdlInteger)`);
            passedTests++;
        } else {
            console.log('  ✗ Test 4 FAILED');
            console.log('  cnt tokens:', JSON.stringify(cntTokens));
        }
    }

    // Test 5: parameters get hdlParameter token type
    {
        totalTests++;
        console.log('\nTest 5: parameters get hdlParameter token');

        const tokens = computeSemanticTokens(counterContent, counterSignals, counterParams);
        const lines = counterContent.split('\n');
        const widthTokens = tokens.filter(t => {
            return lines[t.line].substring(t.character, t.character + t.length) === 'WIDTH';
        });

        const pass = widthTokens.length > 0 && widthTokens.every(t => t.tokenType === 'hdlParameter');

        if (pass) {
            console.log(`  ✓ Test 5 PASSED (${widthTokens.length} WIDTH tokens, all hdlParameter)`);
            passedTests++;
        } else {
            console.log('  ✗ Test 5 FAILED');
            console.log('  WIDTH tokens:', JSON.stringify(widthTokens));
        }
    }

    // Test 6: identifiers in comments are not tokenized
    {
        totalTests++;
        console.log('\nTest 6: identifiers in comments are not tokenized');

        const code = `module test(input wire clk);
    reg a;
    // a should not be tokenized in this comment
    a <= 1;
endmodule
`;
        const doc = new MockTextDocument(code, 'test_comments.v');
        const { signals, parameters } = parser.parseSymbols(doc);

        const tokens = computeSemanticTokens(code, signals, parameters);
        // Line 2 (0-based) is the comment line
        const commentLineTokens = tokens.filter(t => t.line === 2);

        const pass = commentLineTokens.length === 0;

        if (pass) {
            console.log('  ✓ Test 6 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 6 FAILED');
            console.log('  comment line tokens:', JSON.stringify(commentLineTokens));
        }
    }

    // Test 7: port signals get hdlPort modifier
    {
        totalTests++;
        console.log('\nTest 7: port signals get hdlPort modifier');

        const tokens = computeSemanticTokens(counterContent, counterSignals, counterParams);
        const lines = counterContent.split('\n');
        const clkTokens = tokens.filter(t => {
            return lines[t.line].substring(t.character, t.character + t.length) === 'clk';
        });

        const pass = clkTokens.length > 0 && clkTokens.every(t => t.tokenModifiers.includes('hdlPort'));

        if (pass) {
            console.log(`  ✓ Test 7 PASSED (${clkTokens.length} clk tokens, all have hdlPort)`);
            passedTests++;
        } else {
            console.log('  ✗ Test 7 FAILED');
            console.log('  clk tokens:', JSON.stringify(clkTokens));
        }
    }

    // Test 8: internal signals do NOT have hdlPort modifier
    {
        totalTests++;
        console.log('\nTest 8: internal signals do not have hdlPort modifier');

        const tokens = computeSemanticTokens(counterContent, counterSignals, counterParams);
        const lines = counterContent.split('\n');
        const aTokens = tokens.filter(t => {
            return lines[t.line].substring(t.character, t.character + t.length) === 'a' && t.length === 1;
        });

        const pass = aTokens.length > 0 && aTokens.every(t => !t.tokenModifiers.includes('hdlPort'));

        if (pass) {
            console.log(`  ✓ Test 8 PASSED (${aTokens.length} 'a' tokens, none have hdlPort)`);
            passedTests++;
        } else {
            console.log('  ✗ Test 8 FAILED');
            console.log('  a tokens:', JSON.stringify(aTokens));
        }
    }

    // Test 9: identifiers in block comments are not tokenized
    {
        totalTests++;
        console.log('\nTest 9: identifiers in block comments are not tokenized');

        const code = `module test(input wire clk);
    reg a;
    /* a inside
       block comment */
    a <= 1;
endmodule
`;
        const doc = new MockTextDocument(code, 'test_block_comment.v');
        const { signals, parameters } = parser.parseSymbols(doc);

        const tokens = computeSemanticTokens(code, signals, parameters);
        // Lines 2-3 are the block comment
        const commentTokens = tokens.filter(t => t.line === 2 || t.line === 3);

        const pass = commentTokens.length === 0;

        if (pass) {
            console.log('  ✓ Test 9 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 9 FAILED');
            console.log('  block comment tokens:', JSON.stringify(commentTokens));
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
