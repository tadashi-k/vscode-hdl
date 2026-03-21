/**
 * Verilog context detection helpers.
 *
 * No VS Code dependency – safe for use in tests.
 */

/**
 * Returns true when `offset` (a byte offset into `text`) lies inside an
 * `always` or `initial` procedural block.
 *
 * The algorithm strips single-line (`//`) and block (`/* … *\/`) comments
 * from the text before the cursor, limits the search to the current module
 * (everything after the last `endmodule` keyword), then looks for the most
 * recent `always` or `initial` keyword.  If the number of `begin` tokens
 * following that keyword exceeds the number of `end` tokens, the cursor is
 * inside a procedural block.
 *
 * Note: In Verilog, `end` is a distinct keyword from `endmodule`,
 * `endcase`, `endfunction`, etc., so `\bend\b` safely matches only the
 * block-closing keyword.
 */
export function isInsideProceduralBlock(text: string, offset: number): boolean {
    let before = text.substring(0, offset);

    // Strip complete block comments  /* … */
    before = before.replace(/\/\*[\s\S]*?\*\//g, match => ' '.repeat(match.length));
    // Strip an unclosed block comment that starts before the cursor but has no closing */
    before = before.replace(/\/\*[\s\S]*$/, match => ' '.repeat(match.length));
    // Strip line comments  // …
    before = before.replace(/\/\/[^\n]*/g, match => ' '.repeat(match.length));

    // Limit the search to the current module body (after the last `endmodule`).
    const endModuleIdx = before.lastIndexOf('endmodule');
    const moduleText = endModuleIdx >= 0 ? before.substring(endModuleIdx) : before;

    // Find the last `always` or `initial` keyword.
    const keywordRegex = /\b(always|initial)\b/g;
    let lastIdx = -1;
    let m: RegExpExecArray | null;
    while ((m = keywordRegex.exec(moduleText)) !== null) {
        lastIdx = m.index + m[0].length;
    }
    if (lastIdx < 0) {
        return false;
    }

    // Count begin/end balance after that keyword.
    const after = moduleText.substring(lastIdx);
    const beginCount = (after.match(/\bbegin\b/g) || []).length;
    const endCount = (after.match(/\bend\b/g) || []).length;
    return beginCount > endCount;
}
