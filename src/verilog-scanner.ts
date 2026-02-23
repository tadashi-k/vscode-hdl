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
