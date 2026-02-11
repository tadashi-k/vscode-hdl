// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// Signal database - stores signals (wire/reg) per file
class SignalDatabase {
    constructor() {
        // Map of file URI -> signals array
        this.signals = new Map();
    }

    /**
     * Update signals for a document
     * @param {string} uri - Document URI
     * @param {Array} signals - Array of signal objects
     */
    updateSignals(uri, signals) {
        this.signals.set(uri, signals);
    }

    /**
     * Get signals for a document
     * @param {string} uri - Document URI
     * @returns {Array} Array of signal objects
     */
    getSignals(uri) {
        return this.signals.get(uri) || [];
    }

    /**
     * Remove signals for a document
     * @param {string} uri - Document URI
     */
    removeSignals(uri) {
        this.signals.delete(uri);
    }

    /**
     * Get all signals from all documents
     * @returns {Array} Array of all signal objects
     */
    getAllSignals() {
        const allSignals = [];
        for (const signals of this.signals.values()) {
            allSignals.push(...signals);
        }
        return allSignals;
    }
}

// Module database - stores modules for entire workspace
class ModuleDatabase {
    constructor() {
        // Map of module name -> module symbol
        this.modules = new Map();
    }

    /**
     * Add or update a module in the database
     * @param {Object} module - Module symbol object
     */
    addModule(module) {
        this.modules.set(module.name, module);
    }

    /**
     * Get a module by name
     * @param {string} name - Module name
     * @returns {Object|undefined} Module symbol object or undefined
     */
    getModule(name) {
        return this.modules.get(name);
    }

    /**
     * Remove modules from a specific file
     * @param {string} uri - Document URI
     */
    removeModulesFromFile(uri) {
        for (const [name, module] of this.modules.entries()) {
            if (module.uri === uri) {
                this.modules.delete(name);
            }
        }
    }

    /**
     * Get all modules
     * @returns {Array} Array of all module objects
     */
    getAllModules() {
        return Array.from(this.modules.values());
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
        // Check for always blocks with sensitivity list
        const alwaysRegex = /^\s*always\s*@\s*\(/gm;
        
        let match;
        while ((match = alwaysRegex.exec(text)) !== null) {
            const matchText = match[0];
            const alwaysOffset = match.index + matchText.indexOf('always');
            const line = document.positionAt(alwaysOffset).line;
            const lineText = lines[line];
            
            // Check for missing closing parenthesis
            const openParen = lineText.indexOf('@(');
            if (openParen !== -1) {
                const closeParen = lineText.indexOf(')', openParen);
                if (closeParen === -1) {
                    // Check next line for closing paren
                    if (line + 1 < lines.length) {
                        const nextLine = lines[line + 1];
                        if (!nextLine.includes(')')) {
                            this.addError(
                                line,
                                0,
                                lineText.length,
                                'Always block sensitivity list is missing closing parenthesis',
                                vscode.DiagnosticSeverity.Error
                            );
                        }
                    }
                }
            }
            
            // Check for empty sensitivity list
            const sensListMatch = lineText.match(/@\s*\(\s*\)/);
            if (sensListMatch) {
                this.addError(
                    line,
                    sensListMatch.index,
                    sensListMatch[0].length,
                    'Always block has empty sensitivity list',
                    vscode.DiagnosticSeverity.Warning
                );
            }
        }

        // Check for always blocks without begin/end when multiple statements
        const alwaysBeginRegex = /^\s*always\s*@.*$/gm;
        while ((match = alwaysBeginRegex.exec(text)) !== null) {
            const matchText = match[0];
            const alwaysOffset = match.index + matchText.indexOf('always');
            const line = document.positionAt(alwaysOffset).line;
            const lineText = lines[line];
            
            // If the always block doesn't have 'begin' on the same or next line
            if (!lineText.includes('begin')) {
                if (line + 1 < lines.length) {
                    const nextLine = lines[line + 1].trim();
                    if (!nextLine.startsWith('begin')) {
                        // Check if there are multiple statements (heuristic: look for two assignment statements)
                        let stmtCount = 0;
                        for (let i = line + 1; i < Math.min(line + 5, lines.length); i++) {
                            if (lines[i].includes('<=') || lines[i].includes('=')) {
                                stmtCount++;
                            }
                        }
                        // This is just a warning since single statements don't need begin/end
                    }
                }
            }
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
                
                if (!foundSemicolon && !lineText.includes('//')) {
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
            const lineText = lines[line];
            
            // Skip if it's a number literal (e.g., 16'b0)
            const beforeChar = match.index > 0 ? text[match.index - 1] : ' ';
            if (beforeChar === "'" || lineText.includes("'b") || lineText.includes("'h") || lineText.includes("'d")) {
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

// Create global database instances
const signalDatabase = new SignalDatabase();
const moduleDatabase = new ModuleDatabase();
const verilogParser = new VerilogParser();

/**
 * Parse Verilog document and extract symbols
 * @param {vscode.TextDocument} document 
 * @returns {Object} Object with modules and signals arrays
 */
function parseVerilogSymbols(document) {
    const text = document.getText();
    const modules = [];
    const signals = [];

    // Regular expressions for matching Verilog constructs
    const moduleRegex = /^\s*module\s+(\w+)/gm;
    // Enhanced wire regex - capture direction, bit width, and names
    const wireRegex = /^\s*(input\s+|output\s+|inout\s+)?wire\s+(\[\d+:\d+\]\s*)?(\w+(?:\s*,\s*\w+)*)\s*[;,)]/gm;
    // Enhanced reg regex - capture direction, bit width, and names
    const regRegex = /^\s*(input\s+|output\s+|inout\s+)?reg\s+(\[\d+:\d+\]\s*)?(\w+(?:\s*,\s*\w+)*)\s*[;,)]/gm;

    // Extract module names
    let match;
    while ((match = moduleRegex.exec(text)) !== null) {
        const name = match[1];
		const index = match.index + match[0].indexOf(name);
		const position = document.positionAt(index);
        modules.push({
            name: name,
            type: 'module',
            line: position.line,
            character: position.character,
            uri: document.uri.toString()
        });
    }

    // Extract wire declarations
    while ((match = wireRegex.exec(text)) !== null) {
        const direction = match[1] ? match[1].trim() : null; // input, output, or inout
        const bitWidth = match[2] ? match[2].trim() : null;  // e.g., [7:0]
        const namesText = match[3];
        const names = namesText.split(',').map(n => n.trim());
        const line = document.positionAt(match.index).line;
        
        // Calculate the offset of the names portion within the match
        const namesStartOffset = match.index + match[0].indexOf(namesText);
        
        names.forEach(name => {
            // Filter out empty names or keywords
            if (name && !['input', 'output', 'inout', 'wire'].includes(name)) {
                // Find the offset of this specific name within namesText
                const nameOffset = namesStartOffset + namesText.indexOf(name);
                const nameLine = document.positionAt(nameOffset).line;
                const lineText = document.lineAt(nameLine).text;
                // Calculate character position within the line
                const charIndex = nameOffset - text.lastIndexOf('\n', nameOffset) - 1;
                
                signals.push({
                    name: name,
                    type: 'wire',
                    direction: direction,
                    bitWidth: bitWidth,
                    line: nameLine,
                    character: charIndex >= 0 ? charIndex : 0,
                    uri: document.uri.toString()
                });
            }
        });
    }

    // Extract reg declarations
    while ((match = regRegex.exec(text)) !== null) {
        const direction = match[1] ? match[1].trim() : null; // input, output, or inout
        const bitWidth = match[2] ? match[2].trim() : null;  // e.g., [7:0]
        const namesText = match[3];
        const names = namesText.split(',').map(n => n.trim());
        const line = document.positionAt(match.index).line;
        
        // Calculate the offset of the names portion within the match
        const namesStartOffset = match.index + match[0].indexOf(namesText);
        
        names.forEach(name => {
            // Filter out empty names or keywords
            if (name && !['input', 'output', 'inout', 'reg'].includes(name)) {
                // Find the offset of this specific name within namesText
                const nameOffset = namesStartOffset + namesText.indexOf(name);
                const nameLine = document.positionAt(nameOffset).line;
                const lineText = document.lineAt(nameLine).text;
                // Calculate character position within the line
                const charIndex = nameOffset - text.lastIndexOf('\n', nameOffset) - 1;
                
                signals.push({
                    name: name,
                    type: 'reg',
                    direction: direction,
                    bitWidth: bitWidth,
                    line: nameLine,
                    character: charIndex >= 0 ? charIndex : 0,
                    uri: document.uri.toString()
                });
            }
        });
    }

    return { modules, signals };
}

/**
 * Update symbols for a document
 * @param {vscode.TextDocument} document 
 */
function updateDocumentSymbols(document) {
    if (document.languageId !== 'verilog') {
        return;
    }

    const { modules, signals } = parseVerilogSymbols(document);
    const uri = document.uri.toString();
    
    // Update signal database (per-file)
    signalDatabase.updateSignals(uri, signals);
    
    // Remove existing modules from this file before adding new ones
    // to prevent stale entries if modules were renamed or deleted
    moduleDatabase.removeModulesFromFile(uri);
    
    // Update module database (workspace-wide)
    modules.forEach(module => moduleDatabase.addModule(module));
    
    console.log(`Updated symbols for ${uri}: ${modules.length} modules, ${signals.length} signals found`);
}

/**
 * Document Symbol Provider for Verilog
 */
class VerilogDocumentSymbolProvider {
    provideDocumentSymbols(document, token) {
        const { modules, signals } = parseVerilogSymbols(document);
        const allSymbols = [...modules, ...signals];
        
        return allSymbols.map(symbol => {
            const line = document.lineAt(symbol.line);
            const range = new vscode.Range(
                new vscode.Position(symbol.line, line.firstNonWhitespaceCharacterIndex),
                new vscode.Position(symbol.line, line.text.length)
            );

            let kind;
            switch (symbol.type) {
                case 'module':
                    kind = vscode.SymbolKind.Module;
                    break;
                case 'wire':
                    kind = vscode.SymbolKind.Variable;
                    break;
                case 'reg':
                    kind = vscode.SymbolKind.Variable;
                    break;
                default:
                    kind = vscode.SymbolKind.Variable;
            }

            // Build display name with bit width if available
            let displayName = symbol.name;
            if (symbol.bitWidth) {
                displayName = `${symbol.name}${symbol.bitWidth}`;
            }

            // Build detail string for hover (e.g., "input wire", "output reg", "wire")
            let detail = '';
            if (symbol.direction) {
                detail = `${symbol.direction} ${symbol.type}`;
            } else {
                detail = symbol.type;
            }

            // Use DocumentSymbol instead of SymbolInformation for better detail support
            const docSymbol = new vscode.DocumentSymbol(
                displayName,
                detail,
                kind,
                range,
                range
            );

            return docSymbol;
        });
    }
}

/**
 * Scan workspace for all .v files and parse their modules
 * @returns {Promise<void>}
 */
async function scanWorkspaceForModules() {
    console.log('Scanning workspace for Verilog modules...');
    
    // Find all .v files in the workspace
    const verilogFiles = await vscode.workspace.findFiles('**/*.v', '**/node_modules/**');
    
    console.log(`Found ${verilogFiles.length} Verilog files in workspace`);
    
    // Parse each file and update symbol database
    for (const fileUri of verilogFiles) {
        try {
            const document = await vscode.workspace.openTextDocument(fileUri);
            updateDocumentSymbols(document);
        } catch (error) {
            console.error(`Error parsing ${fileUri.toString()}:`, error);
        }
    }
    
    console.log('Workspace scan complete');
}

/**
 * Definition Provider for Verilog
 */
class VerilogDefinitionProvider {
    provideDefinition(document, position, token) {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return null;
        }
        
        const word = document.getText(wordRange);
        
        // First, check for signal definitions (wire/reg) in the current document using signal database
        const currentDocSignals = signalDatabase.getSignals(document.uri.toString());
        const localSignal = currentDocSignals.find(s => s.name === word);
        
        if (localSignal) {
            const uri = vscode.Uri.parse(localSignal.uri);
            const pos = new vscode.Position(localSignal.line, localSignal.character || 0);
            return new vscode.Location(uri, pos);
        }
        
        // Check for module definitions in the module database (workspace-wide)
        const moduleSymbol = moduleDatabase.getModule(word);
        
        if (moduleSymbol) {
            const uri = vscode.Uri.parse(moduleSymbol.uri);
            const pos = new vscode.Position(moduleSymbol.line, moduleSymbol.character || 0);
            return new vscode.Location(uri, pos);
        }
        
        return null;
    }
}

/**
 * Update diagnostics for a document by parsing for syntax errors
 * @param {vscode.TextDocument} document 
 * @param {vscode.DiagnosticCollection} diagnosticCollection 
 */
function updateDiagnostics(document, diagnosticCollection) {
    if (document.languageId !== 'verilog') {
        return;
    }

    const errors = verilogParser.parse(document);
    const diagnostics = [];

    for (const error of errors) {
        const range = new vscode.Range(
            new vscode.Position(error.line, error.character),
            new vscode.Position(error.line, error.character + error.length)
        );
        
        const diagnostic = new vscode.Diagnostic(
            range,
            error.message,
            error.severity
        );
        
        diagnostic.source = 'verilog-parser';
        diagnostics.push(diagnostic);
    }

    diagnosticCollection.set(document.uri, diagnostics);
    console.log(`Updated diagnostics for ${document.uri}: ${diagnostics.length} issues found`);
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Verilog language support extension is now active!');

    // Create diagnostic collection for Verilog syntax errors
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('verilog');
    context.subscriptions.push(diagnosticCollection);

    // Register a command for Verilog files
    let disposable = vscode.commands.registerCommand('verilog.helloWorld', function () {
        vscode.window.showInformationMessage('Verilog extension is active!');
    });

    // Parse all open Verilog documents on activation
    vscode.workspace.textDocuments.forEach(document => {
        updateDocumentSymbols(document);
        updateDiagnostics(document, diagnosticCollection);
    });

    // Listen for document open events
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(document => {
            updateDocumentSymbols(document);
            updateDiagnostics(document, diagnosticCollection);
        })
    );

    // Listen for document change events
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            updateDocumentSymbols(event.document);
            updateDiagnostics(event.document, diagnosticCollection);
        })
    );

    // Listen for document close events
    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument(document => {
            if (document.languageId === 'verilog') {
                const uri = document.uri.toString();
                signalDatabase.removeSignals(uri);
                moduleDatabase.removeModulesFromFile(uri);
                diagnosticCollection.delete(document.uri);
                console.log(`Removed symbols for ${uri}`);
            }
        })
    );

    // Register document symbol provider
    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(
            { language: 'verilog' },
            new VerilogDocumentSymbolProvider()
        )
    );

    // Register definition provider for Verilog
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(
            { language: 'verilog' },
            new VerilogDefinitionProvider()
        )
    );

    // Scan workspace for all Verilog modules on activation
    scanWorkspaceForModules();

    // Re-scan workspace when files are created or deleted
    context.subscriptions.push(
        vscode.workspace.onDidCreateFiles(() => {
            scanWorkspaceForModules();
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidDeleteFiles(() => {
            scanWorkspaceForModules();
        })
    );

    // Register command to show symbols
    context.subscriptions.push(
        vscode.commands.registerCommand('verilog.showSymbols', function () {
            const MAX_PREVIEW_LENGTH = 200;
            const allModules = moduleDatabase.getAllModules();
            const allSignals = signalDatabase.getAllSignals();
            const totalSymbols = allModules.length + allSignals.length;
            
            const moduleInfo = allModules.map(m => `module: ${m.name} (line ${m.line + 1})`).join('\n');
            const signalInfo = allSignals.map(s => `${s.type}: ${s.name} (line ${s.line + 1})`).join('\n');
            
            let symbolInfo = '';
            if (moduleInfo) symbolInfo += moduleInfo;
            if (moduleInfo && signalInfo) symbolInfo += '\n';
            if (signalInfo) symbolInfo += signalInfo;
            
            const preview = symbolInfo.length > MAX_PREVIEW_LENGTH 
                ? symbolInfo.substring(0, MAX_PREVIEW_LENGTH) + '...' 
                : symbolInfo;
            vscode.window.showInformationMessage(
                `Found ${totalSymbols} symbols (${allModules.length} modules, ${allSignals.length} signals):\n${preview}`,
                { modal: false }
            );
            console.log('Module database:', allModules);
            console.log('Signal database:', allSignals);
        })
    );

    // Register hover provider for Verilog
    context.subscriptions.push(
        vscode.languages.registerHoverProvider('verilog', {
            provideHover(document, position, token) {
                const wordRange = document.getWordRangeAtPosition(position);
                const word = document.getText(wordRange);

                // Fetch signals for the current document from signal database
                const signals = signalDatabase.getSignals(document.uri.toString());

                // Find the signal matching the hovered word
                const signal = signals.find(s => s.name === word);

                if (signal) {
                    // Build hover content
                    let hoverContent = `**${signal.name}**\n\n`;
                    if (signal.direction) {
                        hoverContent += `${signal.direction}\n`;
                    }
                    if (signal.type) {
                        hoverContent += `${signal.type}\n`;
                    }
                    if (signal.bitWidth) {
                        hoverContent += `${signal.bitWidth}\n`;
                    }
                    hoverContent += `at line ${signal.line + 1}`;

                    return new vscode.Hover(hoverContent);
                }

                return null;
            }
        })
    );

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
    activate,
    deactivate
}
