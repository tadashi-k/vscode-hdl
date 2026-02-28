// Semantic token computation for Verilog identifiers.
// This module is free of VS Code dependencies for testability.

export interface SemanticTokenInfo {
    line: number;
    character: number;
    length: number;
    tokenType: string;
    tokenModifiers: string[];
}

/** Semantic token type identifiers (indices into the legend). */
export const TOKEN_TYPES = ['hdlReg', 'hdlWire', 'hdlInteger', 'hdlParameter', 'hdlModule'];
export const TOKEN_MODIFIERS = ['declaration', 'hdlPort'];

/** Verilog keywords that should never be highlighted as signal identifiers. */
const VERILOG_KEYWORDS = new Set([
    'module', 'endmodule', 'input', 'output', 'inout', 'wire', 'reg',
    'integer', 'parameter', 'localparam', 'assign', 'always', 'initial',
    'begin', 'end', 'if', 'else', 'for', 'while', 'case', 'endcase',
    'default', 'posedge', 'negedge', 'or', 'and', 'not', 'generate',
    'endgenerate', 'genvar', 'task', 'endtask', 'function', 'endfunction',
    'tri', 'supply0', 'supply1', 'fork', 'join', 'repeat', 'forever',
    'wait', 'disable', 'force', 'release', 'casex', 'casez',
    'specify', 'endspecify', 'table', 'endtable', 'primitive', 'endprimitive',
    'signed', 'unsigned', 'real', 'time', 'realtime', 'event', 'defparam',
    'automatic', 'nand', 'nor', 'xor', 'xnor', 'buf', 'bufif0', 'bufif1',
    'notif0', 'notif1', 'pullup', 'pulldown', 'cmos', 'nmos', 'pmos',
    'rcmos', 'rnmos', 'rpmos', 'tran', 'tranif0', 'tranif1', 'rtran',
    'rtranif0', 'rtranif1', 'wand', 'wor', 'trior', 'triand', 'tri0',
    'tri1', 'trireg', 'scalared', 'vectored', 'macromodule',
]);

/** Map a signal type string to a semantic token type. */
function signalTypeToTokenType(signalType: string): string {
    switch (signalType) {
        case 'reg':     return 'hdlReg';
        case 'wire':    return 'hdlWire';
        case 'integer': return 'hdlInteger';
        case 'tri':     return 'hdlWire';
        case 'supply0': return 'hdlWire';
        case 'supply1': return 'hdlWire';
        default:        return 'hdlWire';
    }
}

/**
 * Compute semantic tokens for a Verilog document.
 *
 * Scans the document text for identifiers and matches them against the
 * provided signal and parameter arrays.  Returns an array of token
 * descriptors sorted by (line, character).
 *
 * @param text         Full document text
 * @param signals      Signals from SignalDatabase.getSignalsByUri()
 * @param parameters   Parameters from ParameterDatabase.getParametersByUri()
 * @param moduleTokens Module token positions from parser (module declarations, instantiations, instance names)
 */
export function computeSemanticTokens(
    text: string,
    signals: any[],
    parameters: any[],
    moduleTokens: any[] = [],
): SemanticTokenInfo[] {
    // Build fast lookup maps
    const signalMap = new Map<string, any>();
    for (const sig of signals) {
        signalMap.set(sig.name, sig);
    }
    const paramMap = new Map<string, any>();
    for (const param of parameters) {
        paramMap.set(param.name, param);
    }
    // Build position-based lookup for module tokens (line:character -> token info)
    const moduleTokenMap = new Map<string, any>();
    for (const mt of moduleTokens) {
        moduleTokenMap.set(`${mt.line}:${mt.character}`, mt);
    }

    const tokens: SemanticTokenInfo[] = [];
    const lines = text.split('\n');
    let inBlockComment = false;

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        let i = 0;

        while (i < line.length) {
            // --- Block comment continuation ---
            if (inBlockComment) {
                const endIdx = line.indexOf('*/', i);
                if (endIdx === -1) {
                    break; // rest of line is still inside block comment
                }
                i = endIdx + 2;
                inBlockComment = false;
                continue;
            }

            // --- Line comment ---
            if (line[i] === '/' && i + 1 < line.length && line[i + 1] === '/') {
                break; // rest of line is a comment
            }

            // --- Block comment start ---
            if (line[i] === '/' && i + 1 < line.length && line[i + 1] === '*') {
                inBlockComment = true;
                i += 2;
                continue;
            }

            // --- String literal ---
            if (line[i] === '"') {
                i++;
                while (i < line.length && line[i] !== '"') {
                    if (line[i] === '\\') i++; // skip escaped char
                    i++;
                }
                if (i < line.length) i++; // skip closing quote
                continue;
            }

            // --- Compiler directive / macro reference (backtick) ---
            if (line.charCodeAt(i) === 96) { // '`'
                i++;
                while (i < line.length) {
                    const c = line.charCodeAt(i);
                    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) ||
                        (c >= 48 && c <= 57) || c === 95) {
                        i++;
                    } else {
                        break;
                    }
                }
                continue;
            }

            // --- Identifier --- may start period for named port connection
            const ch = line.charCodeAt(i);
            if ((ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122) || ch === 95 || ch === 46) {
                // A-Z, a-z, _, .
                const start = i;
                i++;
                while (i < line.length) {
                    const c = line.charCodeAt(i);
                    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) ||
                        (c >= 48 && c <= 57) || c === 95 || c === 36) {
                        // A-Z, a-z, 0-9, _, $
                        i++;
                    } else {
                        break;
                    }
                }
                const word = line.substring(start, i);

                if (VERILOG_KEYWORDS.has(word)) continue;

                // Check for module token (module declaration name, instantiated module name, instance name)
                const moduleToken = moduleTokenMap.get(`${lineNum}:${start}`);
                if (moduleToken) {
                    tokens.push({
                        line: lineNum,
                        character: start,
                        length: word.length,
                        tokenType: 'hdlModule',
                        tokenModifiers: [],
                    });
                    continue;
                }

                const signal = signalMap.get(word);
                if (signal) {
                    const modifiers: string[] = [];
                    if (signal.line === lineNum && signal.character === start) {
                        modifiers.push('declaration');
                    }
                    if (signal.direction) {
                        modifiers.push('hdlPort');
                    }
                    tokens.push({
                        line: lineNum,
                        character: start,
                        length: word.length,
                        tokenType: signalTypeToTokenType(signal.type),
                        tokenModifiers: modifiers,
                    });
                    continue;
                }

                const param = paramMap.get(word);
                if (param) {
                    const modifiers: string[] = [];
                    if (param.line === lineNum && param.character === start) {
                        modifiers.push('declaration');
                    }
                    tokens.push({
                        line: lineNum,
                        character: start,
                        length: word.length,
                        tokenType: 'hdlParameter',
                        tokenModifiers: modifiers,
                    });
                }
                continue;
            }

            i++;
        }
    }

    return tokens;
}
