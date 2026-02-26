/**
 * Verilog file scanner utilities.
 * Contains pure functions for .hdlignore processing and regex-based module scanning.
 * No VS Code dependency - suitable for use in tests.
 */

/**
 * Convert a single gitignore-style pattern line to a RegExp.
 * The regexp is intended to test against relative, forward-slash-normalised
 * file paths (e.g. "src/foo.v" or "vendor/lib/bar.v").
 *
 * Supported rules (same as .gitignore):
 *  - Blank lines and lines starting with '#' should be filtered by the caller.
 *  - A leading '!' negation should be stripped by the caller.
 *  - A trailing '/' matches directories only (treated same as matching the name).
 *  - A leading '/' anchors the pattern to the root of the workspace.
 *  - '**' matches any sequence of path segments (including none).
 *  - '*'  matches any sequence of characters that does not contain '/'.
 *  - '?'  matches any single character that is not '/'.
 */
export function gitignorePatternToRegex(pattern: string): RegExp {
    // A trailing slash marks a directory pattern – strip it, we treat it the
    // same way for file-path matching purposes.
    if (pattern.endsWith('/')) {
        pattern = pattern.slice(0, -1);
    }

    // A leading slash anchors the pattern to the workspace root.
    const anchored = pattern.startsWith('/');
    if (anchored) {
        pattern = pattern.slice(1);
    }

    // If the (de-slashed) pattern still contains a '/', it must be matched
    // from the start of the relative path even without the leading slash.
    const hasSlash = pattern.includes('/');

    // Translate glob wildcards to regex fragments.
    let regexBody = '';
    let i = 0;
    while (i < pattern.length) {
        const c = pattern[i];
        if (c === '*' && pattern[i + 1] === '*') {
            // '**' – match any sequence including path separators.
            regexBody += '.*';
            i += 2;
            // Consume the separator that follows '**/' so that
            // "a/**/b" matches both "a/b" and "a/x/y/b".
            if (pattern[i] === '/') {
                i++;
            }
        } else if (c === '*') {
            regexBody += '[^/]*';
            i++;
        } else if (c === '?') {
            regexBody += '[^/]';
            i++;
        } else if (/[.+^${}()|[\]\\]/.test(c)) {
            regexBody += '\\' + c;
            i++;
        } else {
            regexBody += c;
            i++;
        }
    }

    if (anchored || hasSlash) {
        // Pattern must match from the start of the relative path.
        return new RegExp(`^${regexBody}($|/)`);
    } else {
        // Pattern may match anywhere in the path.
        return new RegExp(`(^|/)${regexBody}($|/)`);
    }
}

/**
 * Parse the text content of a .hdlignore file and return a predicate that
 * checks whether a **relative** (forward-slash-normalised) file path should
 * be ignored.
 *
 * Rules are the same as .gitignore:
 *  - Empty lines and lines beginning with '#' are ignored.
 *  - A '!' prefix negates the pattern (un-ignores previously ignored files).
 *  - Later patterns override earlier ones.
 *
 * @param content - Raw text of the .hdlignore file.
 * @returns (relPath: string) => boolean
 */
export function parseHdlIgnore(content: string): (relPath: string) => boolean {
    const patterns: Array<{ regex: RegExp; negated: boolean }> = [];

    for (const rawLine of content.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) {
            continue;
        }

        let pat = line;
        let negated = false;
        if (pat.startsWith('!')) {
            negated = true;
            pat = pat.slice(1);
        }

        patterns.push({ regex: gitignorePatternToRegex(pat), negated });
    }

    return (relPath: string) => {
        const normalised = relPath.replace(/\\/g, '/');
        let ignored = false;
        for (const { regex, negated } of patterns) {
            if (regex.test(normalised)) {
                ignored = !negated;
            }
        }
        return ignored;
    };
}

/**
 * Preprocess Verilog source text by handling compiler directives.
 *
 * Supported directives:
 *  - `define NAME value  – defines a text macro; subsequent `NAME occurrences
 *    in the same file are replaced with the value.
 *  - `include "file"     – the named file is read via fileReader, preprocessed
 *    recursively, and its content is inlined in place of the directive.
 *    Both double-quote and angle-bracket forms are accepted.
 *  - All other directives (`ifdef, `ifndef, `else, `elsif, `endif, `undef,
 *    `timescale, `default_nettype, `resetall, `celldefine, `endcelldefine,
 *    `pragma, `line, `begin_keywords, `end_keywords, etc.) are silently
 *    replaced with a blank line so that ANTLR line numbers remain correct.
 *
 * Macro replacement (`NAME) is performed on every non-directive line after
 * all defines have been collected from earlier lines.
 *
 * @param text       - Raw text content of the Verilog file.
 * @param basePath   - Directory of the file being processed, used for
 *                     resolving relative `include paths.  May be null when
 *                     file-system access is unavailable.
 * @param fileReader - Callback that reads a file given its resolved absolute
 *                     path and returns its text content, or null if the file
 *                     cannot be read.  Pass null to disable `include expansion.
 * @param defines    - Optional pre-populated macro definitions map (modified
 *                     in-place; pass a new Map() to start with no macros).
 * @param _visited   - Internal: set of already-included paths (cycle guard).
 * @returns Preprocessed text with directives resolved.
 */
export function preprocessVerilog(
    text: string,
    basePath: string | null,
    fileReader: ((resolvedPath: string) => string | null) | null,
    defines: Map<string, string> = new Map(),
    _visited: Set<string> = new Set()
): string {
    // Strip block comments first so that directives inside them are ignored.
    // Preserve line counts by replacing each block comment with the same number
    // of newlines it contained (inline comments on source lines become empty).
    text = text.replace(/\/\*[\s\S]*?\*\//g, (match) => {
        const newlineCount = (match.match(/\n/g) || []).length;
        return '\n'.repeat(newlineCount);
    });

    const outputLines: string[] = [];
    const lines = text.split('\n');

    // Regex matching the start of any compiler directive (backtick followed by identifier)
    const directiveRe = /^(\s*)`(\w+)(.*)/;
    // Regex for `define NAME [value]
    const defineRe = /^`define\s+(\w+)(?:\s+(.*))?$/;
    // Regex for `include "file" or `include <file>
    const includeRe = /^`include\s+["<]([^">]+)[">]/;
    // Regex for `undef NAME
    const undefRe = /^`undef\s+(\w+)/;

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();

        // Check if this line contains a compiler directive
        if (!directiveRe.test(trimmed)) {
            // Regular source line – apply macro substitutions and emit
            outputLines.push(applyMacros(lines[i], defines));
            continue;
        }

        // ------------------------------------------------------------------ //
        // `define
        // ------------------------------------------------------------------ //
        const defMatch = trimmed.match(defineRe);
        if (defMatch) {
            const macroName = defMatch[1];
            const macroValue = defMatch[2] !== undefined ? defMatch[2].trim() : '';
            defines.set(macroName, macroValue);
            outputLines.push('');  // blank line preserves line numbering
            continue;
        }

        // ------------------------------------------------------------------ //
        // `undef
        // ------------------------------------------------------------------ //
        const undefMatch = trimmed.match(undefRe);
        if (undefMatch) {
            defines.delete(undefMatch[1]);
            outputLines.push('');
            continue;
        }

        // ------------------------------------------------------------------ //
        // `include
        // ------------------------------------------------------------------ //
        const incMatch = trimmed.match(includeRe);
        if (incMatch) {
            const includeName = incMatch[1];
            let included = '';
            if (fileReader && basePath !== null) {
                const path = require('path') as typeof import('path');
                const resolvedPath = path.resolve(basePath, includeName);
                if (!_visited.has(resolvedPath)) {
                    _visited.add(resolvedPath);
                    const fileContent = fileReader(resolvedPath);
                    if (fileContent !== null) {
                        const includeDir = path.dirname(resolvedPath);
                        included = preprocessVerilog(fileContent, includeDir, fileReader, defines, _visited);
                    }
                }
            }
            // Replace the directive line with included content (may be multiple lines)
            outputLines.push(included);
            continue;
        }

        // ------------------------------------------------------------------ //
        // All other directives – silently ignore (blank line)
        // ------------------------------------------------------------------ //
        outputLines.push('');
    }

    return outputLines.join('\n');
}

/**
 * Replace all `MACRO_NAME occurrences in a source line with their defined
 * values.  Only identifiers that exist in the defines map are substituted.
 */
function applyMacros(line: string, defines: Map<string, string>): string {
    if (defines.size === 0) return line;
    // Replace backtick-prefixed identifiers that are defined macros.
    // We match `NAME (backtick + word boundary identifier) but not `" or `0 etc.
    return line.replace(/`(\w+)/g, (match, name) => {
        return defines.has(name) ? defines.get(name)! : match;
    });
}

/**
 * Lightweight, regex-based scan of a single Verilog source file.
 * Extracts module declarations (name + line number) without a full parse.
 * This is orders of magnitude faster than ANTLR parsing and is suitable
 * for building an initial workspace-wide module-location index.
 *
 * @param content - Text content of the .v file.
 * @param uri     - Document URI string used to tag each result.
 * @returns Array of { name, uri, line, character } descriptors.
 */
export function regexScanModules(
    content: string,
    uri: string
): Array<{ name: string; uri: string; line: number; character: number }> {
    const results: Array<{ name: string; uri: string; line: number; character: number }> = [];
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^\s*module\s+(\w+)/);
        if (match) {
            const character = lines[i].indexOf(match[1]);
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
