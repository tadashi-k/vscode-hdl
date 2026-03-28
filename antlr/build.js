#!/usr/bin/env node

/**
 * Build script for generating JavaScript parsers from ANTLR grammars.
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const antlrDir = __dirname;
const outputDir = path.join(antlrDir, 'generated');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const grammars = [
    { file: 'Verilog.g4', visitorBase: 'VerilogVisitor' },
    { file: 'Vhdl2008.g4', visitorBase: 'Vhdl2008Visitor' },
];

function buildGrammar(grammarFile, callback) {
    console.log(`\nBuilding: ${grammarFile}`);
    const command = `npx antlr4-tool -l typescript -o "${outputDir}" "${path.join(antlrDir, grammarFile)}"`;
    exec(command, { cwd: antlrDir }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error building ${grammarFile}:`, error.message);
            process.exit(1);
        }
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
        console.log(`✓ ${grammarFile} built`);
        callback();
    });
}

function fixImports(callback) {
    const fixImportsScript = path.join(antlrDir, 'fix-imports.js');
    exec(`node "${fixImportsScript}"`, (error, stdout, stderr) => {
        if (error) { console.error('Error fixing imports:', error.message); process.exit(1); }
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
        callback();
    });
}

function generateVisitorDeclaration(visitorBase) {
    const visitorDts = path.join(outputDir, `${visitorBase}.d.ts`);
    const visitorJs = path.join(outputDir, `${visitorBase}.js`);
    if (!fs.existsSync(visitorJs)) { return; }

    const content = fs.readFileSync(visitorJs, 'utf8');
    const methods = [];
    const re = new RegExp(`${visitorBase}\\.prototype\\.(visit\\w+)\\s*=`, 'g');
    let m;
    while ((m = re.exec(content)) !== null) { methods.push(m[1]); }

    const lines = [
        "import ParseTreeVisitor from 'antlr4/tree/ParseTreeVisitor';",
        '',
        `export declare class ${visitorBase} extends ParseTreeVisitor {`,
        ...methods.map(name => `    ${name}(ctx: any): any;`),
        '}',
        ''
    ];
    fs.writeFileSync(visitorDts, lines.join('\n'), 'utf8');
    console.log(`Generated ${visitorBase}.d.ts with ${methods.length} visitor methods`);
}

function buildAll(index) {
    if (index >= grammars.length) {
        fixImports(() => {
            grammars.forEach(g => generateVisitorDeclaration(g.visitorBase));
            console.log('\n✓ All grammars built successfully!');
            const files = fs.readdirSync(outputDir);
            console.log('\nGenerated files:');
            files.forEach(f => console.log(`  - ${f}`));
        });
        return;
    }
    buildGrammar(grammars[index].file, () => buildAll(index + 1));
}

buildAll(0);
