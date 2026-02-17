#!/usr/bin/env node

/**
 * Post-build script to fix antlr4 imports in generated files
 * 
 * The antlr4-tool generates imports like "require('antlr4/index')"
 * but the newer antlr4 package uses "require('antlr4')" instead.
 */

const fs = require('fs');
const path = require('path');

const generatedDir = path.join(__dirname, 'generated');

function fixImports(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // Replace antlr4/index with antlr4
    content = content.replace(/require\(['"]antlr4\/index['"]\)/g, "require('antlr4')");
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  Fixed imports in: ${path.basename(filePath)}`);
        return true;
    }
    return false;
}

console.log('Fixing antlr4 imports in generated files...\n');

let fixedCount = 0;
const files = fs.readdirSync(generatedDir);

files.forEach(file => {
    if (file.endsWith('.js')) {
        const filePath = path.join(generatedDir, file);
        if (fixImports(filePath)) {
            fixedCount++;
        }
    }
});

console.log(`\n✓ Fixed ${fixedCount} file(s)`);
