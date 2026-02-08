# Testing Goto Definition Feature

This document describes how to test the newly implemented "goto definition" feature for Verilog files.

## Quick Test

1. Open VS Code with this extension loaded
2. Open the test files in the `test/` directory:
   - `counter.v` - Contains a counter module definition
   - `top_module.v` - Contains a top module that instantiates counter

3. In `top_module.v`:
   - Place cursor on `counter` (line 13) and press F12 → should jump to `counter.v` line 2
   - Place cursor on `counter_value` (line 20) and press F12 → should jump to line 9
   - Place cursor on `ready` (line 21) and press F12 → should jump to line 10

4. In `counter.v`:
   - Place cursor on `enable` (line 8) and press F12 → should jump to the declaration

## How It Works

### Signal Navigation (Wire/Reg)
- Right-click or press F12 on any wire or reg name
- Extension searches the current document for the declaration
- Jumps to the line and character where the signal is declared

### Module Navigation
- Right-click or press F12 on a module name (in an instantiation)
- Extension searches all .v files in the workspace for the module definition
- Jumps to the module definition, even if it's in a different file

### Workspace Scanning
- Extension automatically scans all .v files in the workspace on activation
- Re-scans when files are created or deleted
- Assumes file names match module names (e.g., `counter` module in `counter.v`)

## Automated Tests

Run the automated tests to verify everything works:

```bash
# Test symbol parsing with position tracking
node test_goto_definition.js

# Test definition provider functionality
node test_definition_provider.js

# Test existing symbol extraction
node test_symbols.js
```

All tests should pass (11/11 tests).

## Expected Behavior

### ✅ Should Work
- Jumping to signal declarations in the same file
- Jumping to module definitions in other files
- Finding modules in subdirectories
- Re-scanning when new .v files are added

### ⚠️ Limitations
- Only works with .v files (not .sv SystemVerilog files yet)
- Assumes file names match module names
- Only finds the first declaration of a signal (if multiple exist)
- Module instantiations must use exact module name (case-sensitive)

## Troubleshooting

### "Cannot find definition"
- Check that the module file exists in the workspace
- Verify file name matches module name
- Ensure the file has a .v extension
- Try reloading the workspace

### "Wrong location"
- Check for multiple declarations with the same name
- Verify the file hasn't been edited since last scan
- Try saving the file and waiting for re-parse

### Performance Issues
- Large workspaces with many .v files may take time to scan initially
- Extension caches symbols for performance
- Closing unused files helps reduce memory usage
