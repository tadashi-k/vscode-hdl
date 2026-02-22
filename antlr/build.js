#!/usr/bin/env node

/**
 * Build script for generating JavaScript parser from ANTLR grammar
 * 
 * This script uses antlr4-tool to generate JavaScript source code from
 * the Verilog.g4 grammar file.
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Paths
const antlrDir = __dirname;
const grammarFile = path.join(antlrDir, 'Verilog.g4');
const outputDir = path.join(antlrDir, 'generated');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Building ANTLR grammar...');
console.log(`Grammar file: ${grammarFile}`);
console.log(`Output directory: ${outputDir}`);

// Run antlr4-tool to generate TypeScript parser
const command = `npx antlr4-tool -l typescript -o "${outputDir}" "${grammarFile}"`;

console.log(`\nExecuting: ${command}\n`);

exec(command, { cwd: antlrDir }, (error, stdout, stderr) => {
    if (error) {
        console.error('Error building ANTLR grammar:');
        console.error(error.message);
        process.exit(1);
    }

    if (stderr) {
        console.error('STDERR:', stderr);
    }

    if (stdout) {
        console.log('STDOUT:', stdout);
    }

    console.log('\n✓ ANTLR grammar built successfully!');
    console.log(`\nGenerated files in: ${outputDir}`);

    // List generated files
    try {
        const files = fs.readdirSync(outputDir);
        console.log('\nGenerated files:');
        files.forEach(file => {
            console.log(`  - ${file}`);
        });
    } catch (err) {
        console.error('Error reading output directory:', err.message);
    }

    // Fix imports in generated files
    console.log('\nFixing imports...');
    const fixImportsScript = path.join(antlrDir, 'fix-imports.js');
    exec(`node "${fixImportsScript}"`, (error, stdout, stderr) => {
        if (error) {
            console.error('Error fixing imports:', error.message);
            process.exit(1);
        }
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);

        // Generate VerilogVisitor.d.ts (antlr4-tool does not produce it for visitors)
        generateVisitorDeclaration();
    });
});

function generateVisitorDeclaration() {
    const visitorDts = path.join(outputDir, 'VerilogVisitor.d.ts');
    const visitorJs = path.join(outputDir, 'VerilogVisitor.js');
    if (!fs.existsSync(visitorJs)) {
        return;
    }

    // Parse visitor method names from VerilogVisitor.js
    const content = fs.readFileSync(visitorJs, 'utf8');
    const methods = [];
    const re = /VerilogVisitor\.prototype\.(visit\w+)\s*=/g;
    let m;
    while ((m = re.exec(content)) !== null) {
        methods.push(m[1]);
    }

    const lines = [
        "import ParseTreeVisitor from 'antlr4/tree/ParseTreeVisitor';",
        '',
        'export declare class VerilogVisitor extends ParseTreeVisitor {',
        ...methods.map(name => `    ${name}(ctx: any): any;`),
        '}',
        ''
    ];

    fs.writeFileSync(visitorDts, lines.join('\n'), 'utf8');
    console.log(`Generated VerilogVisitor.d.ts with ${methods.length} visitor methods`);
}
