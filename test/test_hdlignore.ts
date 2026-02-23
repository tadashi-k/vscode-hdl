/**
 * Tests for .hdlignore processing and regex-based module scanning.
 * Covers gitignorePatternToRegex, parseHdlIgnore, and regexScanModules.
 */

import { gitignorePatternToRegex, parseHdlIgnore, regexScanModules } from '../src/verilog-scanner';

function runTests() {
    console.log('Running .hdlignore and Regex Scanner Tests...\n');
    console.log('='.repeat(60));

    let totalTests = 0;
    let passedTests = 0;

    // ------------------------------------------------------------------ //
    // gitignorePatternToRegex tests
    // ------------------------------------------------------------------ //

    // Test 1: Simple wildcard pattern matches anywhere in path
    {
        totalTests++;
        console.log('\nTest 1: *.v matches .v files anywhere in path');
        const re = gitignorePatternToRegex('*.v');
        const pass =
            re.test('foo.v') &&
            re.test('src/foo.v') &&
            re.test('a/b/c/foo.v') &&
            !re.test('foo.vhd') &&
            !re.test('foo.vh');
        if (pass) {
            console.log('  ✓ Test 1 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 1 FAILED');
            console.log(`    foo.v: ${re.test('foo.v')}`);
            console.log(`    src/foo.v: ${re.test('src/foo.v')}`);
            console.log(`    foo.vhd: ${re.test('foo.vhd')} (want false)`);
        }
    }

    // Test 2: Pattern with leading slash is anchored to root
    {
        totalTests++;
        console.log('\nTest 2: /vendor anchors to root');
        const re = gitignorePatternToRegex('/vendor');
        const pass =
            re.test('vendor') &&
            re.test('vendor/lib.v') &&
            !re.test('src/vendor');
        if (pass) {
            console.log('  ✓ Test 2 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 2 FAILED');
            console.log(`    vendor: ${re.test('vendor')}`);
            console.log(`    vendor/lib.v: ${re.test('vendor/lib.v')}`);
            console.log(`    src/vendor: ${re.test('src/vendor')} (want false)`);
        }
    }

    // Test 3: Pattern without slash can match in any directory
    {
        totalTests++;
        console.log('\nTest 3: generated matches directory anywhere');
        const re = gitignorePatternToRegex('generated');
        const pass =
            re.test('generated') &&
            re.test('generated/foo.v') &&
            re.test('src/generated') &&
            re.test('src/generated/foo.v');
        if (pass) {
            console.log('  ✓ Test 3 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 3 FAILED');
            console.log(`    generated: ${re.test('generated')}`);
            console.log(`    src/generated: ${re.test('src/generated')}`);
            console.log(`    src/generated/foo.v: ${re.test('src/generated/foo.v')}`);
        }
    }

    // Test 4: ** matches across path separators
    {
        totalTests++;
        console.log('\nTest 4: **/test matches test in any subdirectory');
        const re = gitignorePatternToRegex('**/test');
        const pass =
            re.test('test') &&
            re.test('a/test') &&
            re.test('a/b/test') &&
            re.test('a/b/test/foo.v');
        if (pass) {
            console.log('  ✓ Test 4 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 4 FAILED');
            console.log(`    test: ${re.test('test')}`);
            console.log(`    a/test: ${re.test('a/test')}`);
            console.log(`    a/b/test: ${re.test('a/b/test')}`);
        }
    }

    // Test 5: Trailing slash is stripped (treated as directory name match)
    {
        totalTests++;
        console.log('\nTest 5: build/ matches directory named build');
        const re = gitignorePatternToRegex('build/');
        const pass =
            re.test('build') &&
            re.test('build/foo.v') &&
            re.test('src/build/foo.v');
        if (pass) {
            console.log('  ✓ Test 5 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 5 FAILED');
            console.log(`    build: ${re.test('build')}`);
            console.log(`    build/foo.v: ${re.test('build/foo.v')}`);
            console.log(`    src/build/foo.v: ${re.test('src/build/foo.v')}`);
        }
    }

    // Test 6: ? matches single non-separator character
    {
        totalTests++;
        console.log('\nTest 6: ? matches single non-separator character');
        const re = gitignorePatternToRegex('foo?.v');
        const pass =
            re.test('fooa.v') &&
            re.test('dir/foob.v') &&
            !re.test('foo.v') &&
            !re.test('fooab.v');
        if (pass) {
            console.log('  ✓ Test 6 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 6 FAILED');
            console.log(`    fooa.v: ${re.test('fooa.v')}`);
            console.log(`    foo.v: ${re.test('foo.v')} (want false)`);
            console.log(`    fooab.v: ${re.test('fooab.v')} (want false)`);
        }
    }

    // ------------------------------------------------------------------ //
    // parseHdlIgnore tests
    // ------------------------------------------------------------------ //

    // Test 7: Basic ignore patterns
    {
        totalTests++;
        console.log('\nTest 7: parseHdlIgnore - basic patterns');
        const ignore = parseHdlIgnore('# comment\n\ngenerated/\n*.sv\n');
        const pass =
            ignore('generated/foo.v') &&
            ignore('foo.sv') &&
            ignore('src/bar.sv') &&
            !ignore('src/foo.v');
        if (pass) {
            console.log('  ✓ Test 7 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 7 FAILED');
            console.log(`    generated/foo.v: ${ignore('generated/foo.v')} (want true)`);
            console.log(`    foo.sv: ${ignore('foo.sv')} (want true)`);
            console.log(`    src/foo.v: ${ignore('src/foo.v')} (want false)`);
        }
    }

    // Test 8: Negation pattern un-ignores a file
    {
        totalTests++;
        console.log('\nTest 8: parseHdlIgnore - negation');
        const ignore = parseHdlIgnore('*.v\n!important.v\n');
        const pass =
            ignore('other.v') &&
            !ignore('important.v');
        if (pass) {
            console.log('  ✓ Test 8 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 8 FAILED');
            console.log(`    other.v: ${ignore('other.v')} (want true)`);
            console.log(`    important.v: ${ignore('important.v')} (want false)`);
        }
    }

    // Test 9: Empty file ignores nothing
    {
        totalTests++;
        console.log('\nTest 9: parseHdlIgnore - empty file ignores nothing');
        const ignore = parseHdlIgnore('');
        const pass = !ignore('anything.v') && !ignore('src/foo.v');
        if (pass) {
            console.log('  ✓ Test 9 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 9 FAILED');
        }
    }

    // Test 10: Comments and blank lines are skipped
    {
        totalTests++;
        console.log('\nTest 10: parseHdlIgnore - comments and blank lines ignored');
        const ignore = parseHdlIgnore('# this is a comment\n\n  # another comment\n');
        const pass = !ignore('foo.v') && !ignore('generated/bar.v');
        if (pass) {
            console.log('  ✓ Test 10 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 10 FAILED');
        }
    }

    // ------------------------------------------------------------------ //
    // regexScanModules tests
    // ------------------------------------------------------------------ //

    // Test 11: Single module declaration
    {
        totalTests++;
        console.log('\nTest 11: regexScanModules - single module');
        const content = `
module counter (
    input wire clk,
    output reg [7:0] count
);
endmodule
`;
        const results = regexScanModules(content, 'file:///counter.v');
        const pass =
            results.length === 1 &&
            results[0].name === 'counter' &&
            results[0].uri === 'file:///counter.v' &&
            results[0].line === 1;
        if (pass) {
            console.log('  ✓ Test 11 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 11 FAILED');
            console.log('  results:', JSON.stringify(results));
        }
    }

    // Test 12: Multiple module declarations in one file
    {
        totalTests++;
        console.log('\nTest 12: regexScanModules - multiple modules');
        const content = `module mod_a (input a);\nendmodule\nmodule mod_b (input b);\nendmodule\n`;
        const results = regexScanModules(content, 'file:///multi.v');
        const pass =
            results.length === 2 &&
            results[0].name === 'mod_a' &&
            results[0].line === 0 &&
            results[1].name === 'mod_b' &&
            results[1].line === 2;
        if (pass) {
            console.log('  ✓ Test 12 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 12 FAILED');
            console.log('  results:', JSON.stringify(results));
        }
    }

    // Test 13: No modules in file
    {
        totalTests++;
        console.log('\nTest 13: regexScanModules - no modules');
        const content = '// just a comment\n`define FOO 1\n';
        const results = regexScanModules(content, 'file:///empty.v');
        const pass = results.length === 0;
        if (pass) {
            console.log('  ✓ Test 13 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 13 FAILED');
            console.log('  results:', JSON.stringify(results));
        }
    }

    // Test 14: Module name with indentation
    {
        totalTests++;
        console.log('\nTest 14: regexScanModules - indented module keyword');
        const content = '  module top_level (\n    input clk\n  );\nendmodule\n';
        const results = regexScanModules(content, 'file:///top.v');
        const pass = results.length === 1 && results[0].name === 'top_level';
        if (pass) {
            console.log('  ✓ Test 14 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 14 FAILED');
            console.log('  results:', JSON.stringify(results));
        }
    }

    // Test 15: character offset points to the module name
    {
        totalTests++;
        console.log('\nTest 15: regexScanModules - character offset');
        const line = 'module my_mod (';
        const content = line + '\n);\nendmodule\n';
        const results = regexScanModules(content, 'file:///char.v');
        const expectedChar = line.indexOf('my_mod');
        const pass = results.length === 1 && results[0].character === expectedChar;
        if (pass) {
            console.log('  ✓ Test 15 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 15 FAILED');
            console.log(`  character=${results[0]?.character}, expected=${expectedChar}`);
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
