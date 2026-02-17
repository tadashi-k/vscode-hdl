// The module 'vscode' contains the VS Code extensibility API
// In test environments, vscode may be provided globally
let vscode;
try {
    vscode = require('vscode');
} catch (e) {
    // In test environment, use global vscode
    if (typeof global !== 'undefined' && global.vscode) {
        vscode = global.vscode;
    } else {
        throw new Error('vscode module not found. Make sure to set global.vscode in test environment.');
    }
}

/**
 * Verilog Parser - Detects syntax errors in Verilog code
 */
class VerilogParser {
    constructor() {
        this.errors = [];
    }

    /**
     * Parse Verilog document and detect syntax errors
     * @param {vscode.TextDocument} document 
     * @returns {Array} Array of diagnostic objects
     */
    parse(document) {
        this.errors = [];
        const text = document.getText();
        const lines = text.split('\n');

        // Check for common syntax errors
        this.checkModuleStructure(text, lines, document);
        this.checkPortDeclarations(text, lines, document);
        this.checkAlwaysBlocks(text, lines, document);
        this.checkInitialBlocks(text, lines, document);
        this.checkAssignStatements(text, lines, document);
        this.checkBracketMatching(text, lines, document);
        this.checkSemicolons(text, lines, document);
        this.checkIdentifiers(text, lines, document);
        this.checkWireRegDeclarations(text, lines, document);

        return this.errors;
    }

    /**
     * Check module structure (module...endmodule matching)
     */
    checkModuleStructure(text, lines, document) {
        const moduleRegex = /^\s*module\s+(\w+)/gm;
        const endmoduleRegex = /^\s*endmodule\b/gm;

        const modules = [];
        const endmodules = [];

        let match;
        while ((match = moduleRegex.exec(text)) !== null) {
            const matchText = match[0];
            const moduleOffset = match.index + matchText.indexOf('module');
            const line = document.positionAt(moduleOffset).line;
            const moduleName = match[1];
            
            // Check if module name is a reserved keyword
            if (this.isReservedKeyword(moduleName)) {
                const nameOffset = match.index + matchText.indexOf(moduleName);
                const charPos = nameOffset - text.lastIndexOf('\n', nameOffset) - 1;
                this.addError(
                    line,
                    charPos >= 0 ? charPos : 0,
                    moduleName.length,
                    `Module name '${moduleName}' is a reserved keyword`,
                    vscode.DiagnosticSeverity.Error
                );
            }
            
            modules.push({ line, name: moduleName, index: match.index });
        }

        while ((match = endmoduleRegex.exec(text)) !== null) {
            const matchText = match[0];
            const endmoduleOffset = match.index + matchText.search(/\S/);
            const line = document.positionAt(endmoduleOffset).line;
            endmodules.push({ line, index: match.index });
        }

        // Check for mismatched module/endmodule
        if (modules.length !== endmodules.length) {
            if (modules.length > endmodules.length) {
                const lastModule = modules[modules.length - 1];
                this.addError(
                    lastModule.line,
                    0,
                    lines[lastModule.line].length,
                    `Module '${lastModule.name}' is missing 'endmodule'`,
                    vscode.DiagnosticSeverity.Error
                );
            } else {
                const lastEndmodule = endmodules[endmodules.length - 1];
                this.addError(
                    lastEndmodule.line,
                    0,
                    lines[lastEndmodule.line].length,
                    'Extra endmodule without matching module',
                    vscode.DiagnosticSeverity.Error
                );
            }
        }
    }

    /**
     * Check port declarations for syntax errors
     */
    checkPortDeclarations(text, lines, document) {
        // Check for invalid port directions
        const portRegex = /^\s*(input|output|inout)\s+(?:(wire|reg)\s+)?(\[\d+:\d+\]\s*)?(\w+)/gm;
        
        let match;
        while ((match = portRegex.exec(text)) !== null) {
            const direction = match[1];
            const type = match[2];
            const portName = match[4];
            const matchText = match[0];
            const portNameOffset = match.index + matchText.indexOf(portName);
            const line = document.positionAt(portNameOffset).line;

            // Output ports should not be wire in most cases (can be reg)
            // But this is not an error in Verilog, so we skip this check

            // Check if port name is a reserved keyword
            if (this.isReservedKeyword(portName)) {
                const charPos = portNameOffset - text.lastIndexOf('\n', portNameOffset) - 1;
                this.addError(
                    line,
                    charPos >= 0 ? charPos : 0,
                    portName.length,
                    `Port name '${portName}' is a reserved keyword`,
                    vscode.DiagnosticSeverity.Error
                );
            }
        }
    }

    /**
     * Check always blocks for syntax errors
     */
    checkAlwaysBlocks(text, lines, document) {
        // Find all always blocks
        const alwaysRegex = /^\s*always\b/gm;
        
        let match;
        while ((match = alwaysRegex.exec(text)) !== null) {
            const matchText = match[0];
            const alwaysOffset = match.index + matchText.indexOf('always');
            const line = document.positionAt(alwaysOffset).line;
            const lineText = lines[line];
            
            // Strip comments from line for accurate parsing
            const lineWithoutComment = this.stripComments(lineText);
            
            // Check if always has timing control (@)
            const hasAtSymbol = /@/.test(lineWithoutComment.substring(lineWithoutComment.indexOf('always') + 6));
            
            // Look ahead a few lines to check for timing control
            let foundTimingControl = hasAtSymbol;
            if (!foundTimingControl) {
                // Check next line for @ or direct begin/statement
                for (let i = line + 1; i < Math.min(line + 3, lines.length); i++) {
                    const nextLine = this.stripComments(lines[i]).trim();
                    if (nextLine.startsWith('@')) {
                        foundTimingControl = true;
                        break;
                    }
                    // If we hit a begin or statement without @, it's an error
                    if (nextLine.startsWith('begin') || nextLine.match(/^\w+\s*[<]?=/)) {
                        break;
                    }
                }
                
                // Always blocks should have timing control (@)
                if (!foundTimingControl) {
                    // Check if this is 'always begin' pattern
                    const afterAlways = lineWithoutComment.substring(lineWithoutComment.indexOf('always') + 6).trim();
                    if (afterAlways.startsWith('begin') || 
                        (line + 1 < lines.length && this.stripComments(lines[line + 1]).trim().startsWith('begin'))) {
                        this.addError(
                            line,
                            0,
                            lineText.length,
                            'Always block is missing timing control (@)',
                            vscode.DiagnosticSeverity.Error
                        );
                    }
                }
            }
            
            // Check for always with @ sensitivity list
            if (hasAtSymbol) {
                const atIndex = lineWithoutComment.indexOf('@', lineWithoutComment.indexOf('always'));
                const afterAt = lineWithoutComment.substring(atIndex + 1).trim();
                
                // Check for @* or @(*)
                if (afterAt.startsWith('*') || afterAt.startsWith('(*)')) {
                    // Valid - @* or @(*)
                } else if (afterAt.startsWith('(')) {
                    // Check for empty sensitivity list @()
                    const sensListMatch = lineWithoutComment.match(/@\s*\(\s*\)/);
                    if (sensListMatch) {
                        this.addError(
                            line,
                            sensListMatch.index,
                            sensListMatch[0].length,
                            'Always block has empty sensitivity list',
                            vscode.DiagnosticSeverity.Warning
                        );
                    }
                    
                    // Check for missing closing parenthesis
                    let parenText = afterAt;
                    let checkLine = line;
                    
                    // Collect text until we find end of sensitivity list or hit begin/statement
                    while (checkLine < lines.length) {
                        if (checkLine > line) {
                            parenText += ' ' + this.stripComments(lines[checkLine]).trim();
                        }
                        
                        // Count parentheses
                        let openCount = (parenText.match(/\(/g) || []).length;
                        let closeCount = (parenText.match(/\)/g) || []).length;
                        
                        if (openCount === closeCount) {
                            break; // Found matching closing paren
                        }
                        
                        // Check if we've gone too far (hit begin or semicolon)
                        if (parenText.includes('begin') || parenText.includes(';')) {
                            this.addError(
                                line,
                                0,
                                lineText.length,
                                'Always block sensitivity list is missing closing parenthesis',
                                vscode.DiagnosticSeverity.Error
                            );
                            break;
                        }
                        
                        checkLine++;
                        if (checkLine >= Math.min(line + 5, lines.length)) {
                            break; // Stop after checking a few lines
                        }
                    }
                } else if (!afterAt.startsWith('*')) {
                    // @ not followed by * or ( - invalid
                    this.addError(
                        line,
                        atIndex,
                        2,
                        'Invalid timing control syntax: @ must be followed by *, (*), or (...)',
                        vscode.DiagnosticSeverity.Error
                    );
                }
            }
            
            // Check for statements after always
            this.checkProceduralBlockStatement(text, lines, document, line, 'always');
        }
    }
    
    /**
     * Check initial blocks for syntax errors
     */
    checkInitialBlocks(text, lines, document) {
        // Find all initial blocks
        const initialRegex = /^\s*initial\b/gm;
        
        let match;
        while ((match = initialRegex.exec(text)) !== null) {
            const matchText = match[0];
            const initialOffset = match.index + matchText.indexOf('initial');
            const line = document.positionAt(initialOffset).line;
            const lineText = lines[line];
            
            // Strip comments before checking for @
            const lineWithoutComment = this.stripComments(lineText);
            
            // Check if initial has @ (which is an error - initial blocks don't have sensitivity lists)
            const afterInitial = lineWithoutComment.substring(lineWithoutComment.indexOf('initial') + 7).trim();
            const hasAtSymbol = /@/.test(afterInitial);
            
            if (hasAtSymbol) {
                const atIndex = lineWithoutComment.indexOf('@', lineWithoutComment.indexOf('initial'));
                this.addError(
                    line,
                    atIndex,
                    1,
                    'Initial blocks cannot have sensitivity lists (@)',
                    vscode.DiagnosticSeverity.Error
                );
            }
            
            // Check for statements after initial
            this.checkProceduralBlockStatement(text, lines, document, line, 'initial');
        }
    }
    
    /**
     * Check if a procedural block (always/initial) has a statement following it
     */
    checkProceduralBlockStatement(text, lines, document, blockLine, blockType) {
        const lineText = lines[blockLine];
        const blockKeyword = blockType; // 'always' or 'initial'
        
        // Strip comments
        const lineWithoutComment = this.stripComments(lineText);
        
        // Check if there's a statement on the same line
        const afterBlock = lineWithoutComment.substring(lineWithoutComment.indexOf(blockKeyword) + blockKeyword.length);
        
        // Skip timing control part for always blocks
        let checkText = afterBlock;
        if (blockType === 'always' && checkText.includes('@')) {
            // Skip the @ sensitivity list
            const atIndex = checkText.indexOf('@');
            // Find the end of sensitivity list
            if (checkText.substring(atIndex + 1).trim().startsWith('*')) {
                checkText = checkText.substring(atIndex + 2); // Skip @*
            } else if (checkText.substring(atIndex + 1).trim().startsWith('(')) {
                // Find matching closing paren
                let parenDepth = 0;
                let foundClosing = false;
                for (let i = atIndex + 1; i < checkText.length; i++) {
                    if (checkText[i] === '(') parenDepth++;
                    if (checkText[i] === ')') {
                        parenDepth--;
                        if (parenDepth === 0) {
                            checkText = checkText.substring(i + 1);
                            foundClosing = true;
                            break;
                        }
                    }
                }
                if (!foundClosing) {
                    checkText = ''; // Couldn't find closing, will check next lines
                }
            }
        }
        
        checkText = checkText.trim();
        
        // If there's something after the block declaration on the same line
        if (checkText.length > 0) {
            return; // Has statement on same line
        }
        
        // Check next few lines for a statement or begin
        let foundStatement = false;
        for (let i = blockLine + 1; i < Math.min(blockLine + 5, lines.length); i++) {
            const nextLine = this.stripComments(lines[i]).trim();
            
            // Skip empty lines
            if (nextLine.length === 0) {
                continue;
            }
            
            // Check for begin, statement, or other module constructs
            if (nextLine.startsWith('begin') ||
                nextLine.match(/^\w+\s*[<]?=/) ||  // Assignment
                nextLine.startsWith('if') ||
                nextLine.startsWith('case') ||
                nextLine.startsWith('for') ||
                nextLine.startsWith('while')) {
                foundStatement = true;
                break;
            }
            
            // If we hit another block or module construct, no statement found
            if (nextLine.startsWith('end') ||
                nextLine.startsWith('endmodule') ||
                nextLine.startsWith('always') ||
                nextLine.startsWith('initial') ||
                nextLine.startsWith('assign')) {
                break;
            }
        }
        
        if (!foundStatement) {
            this.addError(
                blockLine,
                0,
                lineText.length,
                `${blockType.charAt(0).toUpperCase() + blockType.slice(1)} block is missing a statement`,
                vscode.DiagnosticSeverity.Error
            );
        }
    }

    /**
     * Check assign statements for syntax errors
     */
    checkAssignStatements(text, lines, document) {
        const assignRegex = /^\s*assign\s+(\w+)/gm;
        
        let match;
        while ((match = assignRegex.exec(text)) !== null) {
            // Find the actual line by looking for the first non-whitespace character
            const matchText = match[0];
            const assignOffset = match.index + matchText.indexOf('assign');
            const line = document.positionAt(assignOffset).line;
            const lineText = lines[line];
            
            // Check if assign statement has assignment operator
            if (!lineText.includes('=')) {
                this.addError(
                    line,
                    0,
                    lineText.length,
                    'Assign statement is missing assignment operator',
                    vscode.DiagnosticSeverity.Error
                );
            }
            
            // Check if assign statement ends with semicolon
            const trimmed = lineText.trim();
            if (!trimmed.endsWith(';') && !trimmed.endsWith(',')) {
                // Might continue on next line, check next line
                if (line + 1 < lines.length) {
                    let foundSemicolon = false;
                    for (let i = line + 1; i < Math.min(line + 3, lines.length); i++) {
                        if (lines[i].includes(';')) {
                            foundSemicolon = true;
                            break;
                        }
                    }
                    if (!foundSemicolon) {
                        this.addError(
                            line,
                            0,
                            lineText.length,
                            'Assign statement is missing semicolon',
                            vscode.DiagnosticSeverity.Error
                        );
                    }
                }
            }
        }
    }

    /**
     * Check bracket matching
     */
    checkBracketMatching(text, lines, document) {
        const stack = [];
        const brackets = { '(': ')', '[': ']', '{': '}' };
        const closingBrackets = { ')': '(', ']': '[', '}': '{' };

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const line = document.positionAt(i).line;

            if (brackets[char]) {
                stack.push({ char, line, index: i });
            } else if (closingBrackets[char]) {
                if (stack.length === 0) {
                    this.addError(
                        line,
                        i - text.lastIndexOf('\n', i) - 1,
                        1,
                        `Unmatched closing bracket '${char}'`,
                        vscode.DiagnosticSeverity.Error
                    );
                } else {
                    const last = stack.pop();
                    if (brackets[last.char] !== char) {
                        this.addError(
                            line,
                            i - text.lastIndexOf('\n', i) - 1,
                            1,
                            `Mismatched brackets: expected '${brackets[last.char]}' but found '${char}'`,
                            vscode.DiagnosticSeverity.Error
                        );
                    }
                }
            }
        }

        // Check for unclosed brackets
        for (const item of stack) {
            this.addError(
                item.line,
                item.index - text.lastIndexOf('\n', item.index) - 1,
                1,
                `Unclosed bracket '${item.char}'`,
                vscode.DiagnosticSeverity.Error
            );
        }
    }

    /**
     * Check for missing semicolons in declarations
     */
    checkSemicolons(text, lines, document) {
        // Check wire/reg declarations for missing semicolons
        const declRegex = /^\s*(wire|reg|integer|parameter)\s+.*$/gm;
        
        let match;
        while ((match = declRegex.exec(text)) !== null) {
            const matchText = match[0];
            const keywordOffset = match.index + matchText.search(/\S/);
            const line = document.positionAt(keywordOffset).line;
            const lineText = lines[line].trim();
            
            // Skip if it's inside a module port list (ends with comma or closing paren)
            if (lineText.endsWith(',') || lineText.endsWith(')')) {
                continue;
            }
            
            // Check if the line ends with semicolon
            if (!lineText.endsWith(';')) {
                // Check if it continues on the next line
                let foundSemicolon = false;
                for (let i = line + 1; i < Math.min(line + 3, lines.length); i++) {
                    const nextLine = lines[i].trim();
                    
                    // If next line starts a new statement, it's an error
                    if (nextLine.match(/^(wire|reg|integer|module|always|assign|endmodule|end\b)/)) {
                        break;
                    }
                    
                    if (nextLine.endsWith(';') || nextLine.includes(';')) {
                        foundSemicolon = true;
                        break;
                    }
                }
                
                // Check if line is a comment (more robust check)
                const isComment = lineText.startsWith('//') || lineText.startsWith('/*');
                if (!foundSemicolon && !isComment) {
                    this.addError(
                        line,
                        0,
                        lines[line].length,
                        'Declaration is missing semicolon',
                        vscode.DiagnosticSeverity.Error
                    );
                }
            }
        }
    }

    /**
     * Check identifiers for invalid characters
     */
    checkIdentifiers(text, lines, document) {
        // Verilog identifiers must start with a letter or underscore
        // and contain only letters, digits, underscores, and dollar signs
        const invalidIdRegex = /\b(\d\w+)\b/g;
        
        let match;
        while ((match = invalidIdRegex.exec(text)) !== null) {
            const line = document.positionAt(match.index).line;
            
            // Skip if it's a number literal (e.g., 16'b0)
            // Check character immediately before the match
            const beforeChar = match.index > 0 ? text[match.index - 1] : ' ';
            if (beforeChar === "'") {
                continue;
            }
            
            // Check if this is part of a bit literal by looking at surrounding context
            const contextStart = Math.max(0, match.index - 10);
            const contextEnd = Math.min(text.length, match.index + match[0].length + 5);
            const context = text.substring(contextStart, contextEnd);
            // Skip if we see patterns like "8'b" or "16'h" near this match
            if (context.match(/\d+'\w/)) {
                continue;
            }
            
            const identifier = match[1];
            // Only report if it looks like an identifier (after wire/reg/module/etc)
            const precedingText = text.substring(Math.max(0, match.index - 50), match.index);
            if (precedingText.match(/\b(wire|reg|module|input|output|inout|parameter)\s+$/)) {
                this.addError(
                    line,
                    match.index - text.lastIndexOf('\n', match.index) - 1,
                    identifier.length,
                    `Invalid identifier '${identifier}': identifiers cannot start with a digit`,
                    vscode.DiagnosticSeverity.Error
                );
            }
        }
    }

    /**
     * Check wire/reg declarations for common errors
     */
    checkWireRegDeclarations(text, lines, document) {
        // Check for duplicate declarations (simplified check)
        const declarations = new Map();
        const wireRegRegex = /^\s*(wire|reg)\s+(?:\[\d+:\d+\]\s*)?(\w+)/gm;
        
        let match;
        while ((match = wireRegRegex.exec(text)) !== null) {
            const type = match[1];
            const name = match[2];
            const matchText = match[0];
            const typeOffset = match.index + matchText.search(/\S/);
            const line = document.positionAt(typeOffset).line;
            
            if (declarations.has(name)) {
                const firstDecl = declarations.get(name);
                this.addError(
                    line,
                    0,
                    lines[line].length,
                    `Signal '${name}' is already declared at line ${firstDecl.line + 1}`,
                    vscode.DiagnosticSeverity.Warning
                );
            } else {
                declarations.set(name, { type, line });
            }
        }
    }

    /**
     * Check if a name is a reserved keyword
     */
    isReservedKeyword(name) {
        const keywords = [
            'always', 'and', 'assign', 'begin', 'buf', 'bufif0', 'bufif1',
            'case', 'casex', 'casez', 'cmos', 'deassign', 'default', 'defparam',
            'disable', 'edge', 'else', 'end', 'endcase', 'endfunction',
            'endmodule', 'endprimitive', 'endspecify', 'endtable', 'endtask',
            'event', 'for', 'force', 'forever', 'fork', 'function',
            'highz0', 'highz1', 'if', 'ifnone', 'initial', 'inout',
            'input', 'integer', 'join', 'large', 'macromodule', 'medium',
            'module', 'nand', 'negedge', 'nmos', 'nor', 'not',
            'notif0', 'notif1', 'or', 'output', 'parameter', 'pmos',
            'posedge', 'primitive', 'pull0', 'pull1', 'pulldown', 'pullup',
            'rcmos', 'real', 'realtime', 'reg', 'release', 'repeat',
            'rnmos', 'rpmos', 'rtran', 'rtranif0', 'rtranif1', 'scalared',
            'small', 'specify', 'specparam', 'strong0', 'strong1', 'supply0',
            'supply1', 'table', 'task', 'time', 'tran', 'tranif0',
            'tranif1', 'tri', 'tri0', 'tri1', 'triand', 'trior',
            'trireg', 'vectored', 'wait', 'wand', 'weak0', 'weak1',
            'while', 'wire', 'wor', 'xnor', 'xor'
        ];
        
        return keywords.includes(name.toLowerCase());
    }

    /**
     * Strip single-line comments from a line of code
     */
    stripComments(line) {
        const commentIndex = line.indexOf('//');
        if (commentIndex !== -1) {
            return line.substring(0, commentIndex);
        }
        return line;
    }

    /**
     * Add an error to the errors array
     */
    addError(line, character, length, message, severity) {
        this.errors.push({
            line,
            character,
            length,
            message,
            severity
        });
    }
}

module.exports = VerilogParser;
