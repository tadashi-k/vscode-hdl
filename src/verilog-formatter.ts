/**
 * Verilog source formatter.
 *
 * Provides basic indentation-based formatting for Verilog source files.
 * The formatter re-indents block structures by tracking the nesting depth
 * of block-opening and block-closing keywords.
 *
 * Block-opening keywords (increase indent after the line):
 *   begin, case, casex, casez, module, function, task, generate, fork
 *
 * Block-closing keywords (decrease indent before the line):
 *   end, endcase, endmodule, endfunction, endtask, endgenerate, join,
 *   join_any, join_none
 */

/**
 * Strip the trailing line comment (`//` to end of line) from a string.
 * Only strips a `//` that is not inside a string literal.  Escaped quotes
 * (`\"`) inside string literals are handled correctly.
 */
function stripLineComment(line: string): string {
    let inString = false;
    let i = 0;
    while (i < line.length - 1) {
        if (line[i] === '\\' && inString) {
            // Skip the escaped character (e.g. `\"`) – do not toggle string state.
            i += 2;
            continue;
        }
        if (line[i] === '"') {
            inString = !inString;
        }
        if (!inString && line[i] === '/' && line[i + 1] === '/') {
            return line.slice(0, i);
        }
        i++;
    }
    return line;
}

/**
 * Count the number of whole-word occurrences of `keyword` in `text`.
 * Uses word boundaries so that, for example, `end` does not match inside
 * `endmodule`.
 */
function countKeyword(text: string, keyword: string): number {
    const re = new RegExp('\\b' + keyword + '\\b', 'g');
    return (text.match(re) ?? []).length;
}

/**
 * Returns true if the line (with comments stripped) is a control-flow
 * statement that expects a single statement as its body (no begin/end).
 *
 * Examples that return true:
 *   `always @(*)`, `initial`, `if (cond)`, `else`, `else if (cond)`,
 *   `for (...)`, `while (cond)`, `repeat (N)`, `forever`
 *
 * Examples that return false:
 *   `always @(*) begin`  (has begin)
 *   `if (a) b = 1;`      (ends with semicolon)
 */
const SINGLE_LINE_OPENER_RE = /\b(always|initial|if|else|for|while|repeat|forever)\b/;
function isSingleLineOpener(lineNoComment: string): boolean {
    const trimmed = lineNoComment.trimEnd();
    return (
        SINGLE_LINE_OPENER_RE.test(trimmed) &&
        !trimmed.endsWith(';') &&
        !/\bbegin\b/.test(trimmed)
    );
}

/**
 * Format a Verilog source string by re-indenting block structures.
 *
 * The algorithm is line-based:
 * 1. Strip line comments so that keywords in comments are ignored.
 * 2. Count block-closing keywords on the line → decrease `depth` first.
 * 3. Output the line at the current `depth`.
 * 4. Count block-opening keywords on the line → increase `depth` after.
 *
 * This handles common patterns such as `end else begin` (one close, one open,
 * net change zero) and simple `begin` / `end` pairs correctly.
 *
 * @param text       Full Verilog source text.
 * @param indentSize Number of spaces per indent level (default 4).
 * @returns          Re-indented source text.
 */
export function formatVerilog(text: string, indentSize: number = 4): string {
    const indentUnit = ' '.repeat(indentSize);
    const lines = text.split('\n');
    const result: string[] = [];
    let depth = 0;
    // Tracks how many single-line block openers (without begin/end) are pending.
    // After their single body line is output, depth is restored by this count.
    let pendingDecrements = 0;

    for (const rawLine of lines) {
        const line = rawLine.trim();

        if (line === '') {
            result.push('');
            continue;
        }

        // Strip line-end comment for keyword analysis so that keywords inside
        // comments do not affect indentation.
        const lineNoComment = stripLineComment(line);

        // A comment-only line (e.g. `// ...`) has no code after stripping.
        // Output it at the current depth without consuming any pending indent.
        if (lineNoComment.trim() === '') {
            result.push(indentUnit.repeat(depth) + line);
            continue;
        }

        // Count block-closing keywords on this line.
        // Word-boundary matching ensures "endmodule" is only counted once
        // as a closer and not also as a bare "end".
        const closes =
            countKeyword(lineNoComment, 'end') +
            countKeyword(lineNoComment, 'endcase') +
            countKeyword(lineNoComment, 'endfunction') +
            countKeyword(lineNoComment, 'endtask') +
            countKeyword(lineNoComment, 'endgenerate') +
            countKeyword(lineNoComment, 'join') +
            countKeyword(lineNoComment, 'join_any') +
            countKeyword(lineNoComment, 'join_none');

        // Count block-opening keywords on this line.
        const opens =
            countKeyword(lineNoComment, 'begin') +
            countKeyword(lineNoComment, 'case') +
            countKeyword(lineNoComment, 'casex') +
            countKeyword(lineNoComment, 'casez') +
            countKeyword(lineNoComment, 'function') +
            countKeyword(lineNoComment, 'task') +
            countKeyword(lineNoComment, 'generate') +
            countKeyword(lineNoComment, 'fork');

        // Decrease depth for closers: the closing keyword itself is placed at
        // the reduced depth (matching the opener's depth).
        if (lineNoComment.charAt(0) === ')') {
            depth--; // Handle lines starting with ')' before counting parenthesis.
        }
        depth = Math.max(0, depth - closes);

        result.push(indentUnit.repeat(depth) + line);

        // Increase depth for openers: content after this line is indented.
        if (lineNoComment.charAt(lineNoComment.length - 1) === '(') {
            depth++; // Handle lines ending with '(' after counting parenthesis.
        }
        depth += opens;

        // Handle single-line block openers (no begin/end).
        // Examples: `always @(*)`, `if (cond)`, `for (...)`, `else`, etc.
        // The single body statement gets one extra indent level; after it is
        // output, depth is restored.
        if (isSingleLineOpener(lineNoComment)) {
            depth++;
            pendingDecrements++;
        } else if (pendingDecrements > 0) {
            // This line is the body of the preceding single-line opener(s).
            depth -= pendingDecrements;
            pendingDecrements = 0;
        }
    }

    return result.join('\n');
}
