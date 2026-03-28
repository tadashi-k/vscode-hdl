/**
 * VHDL file scanner utilities.
 * Regex-based entity-name scanning for fast workspace-wide indexing.
 * No VS Code dependency - suitable for use in tests.
 *
 * Mirrors the regexScanModules function in verilog-scanner.ts.
 */

/**
 * Lightweight, regex-based scan of a single VHDL source file.
 * Extracts entity declarations (name + line number) without a full parse.
 *
 * @param content - Text content of the .vhd or .vhdl file.
 * @param uri     - Document URI string used to tag each result.
 * @returns Array of { name, uri, line, character } descriptors.
 */
export function regexScanEntities(
    content: string,
    uri: string
): Array<{ name: string; uri: string; line: number; character: number }> {
    const results: Array<{ name: string; uri: string; line: number; character: number }> = [];

    // Strip -- line comments to prevent matching inside comments
    const stripped = content.replace(/--[^\n]*/g, (m) => ' '.repeat(m.length));
    const lines = stripped.split('\n');

    for (let i = 0; i < lines.length; i++) {
        // Match: entity <name> is  (case-insensitive)
        const match = lines[i].match(/\bentity\s+(\w+)\s+is\b/i);
        if (match) {
            const character = lines[i].toLowerCase().indexOf(match[1].toLowerCase());
            results.push({
                name: match[1],
                uri,
                line: i,
                character: character >= 0 ? character : 0,
            });
        }
    }
    return results;
}
