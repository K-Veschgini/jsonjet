# JSONJet Syntax Highlighting

This directory contains the TextMate grammar definitions for JSONJet syntax highlighting in VitePress documentation.

## Files

- `jsonjet.tmLanguage.json` - The main JSONJet syntax highlighting grammar
- `jet.tmLanguage.json` - Legacy grammar (kept for backward compatibility)

## Features

The JSONJet syntax highlighting supports:

### Keywords
- **Control Keywords**: `create`, `or`, `replace`, `stream`, `flow`, `lookup`, `insert`, `into`, `delete`, `list`, `as`, `where`, `select`, `scan`, `step`, `emit`, `summarize`, `collect`, `by`, `over`, `iff`, `every`, `when`, `on`, `change`, `group`, `update`, `using`, `flush`, `info`, `subscribe`, `unsubscribe`, `ttl`, `print`, `assert_or_save_expected`, `write_to_file`, `insert_into`
- **Logical Keywords**: `and`, `or`, `not`, `if`, `exists`
- **Boolean Constants**: `true`, `false`, `null`
- **Window Functions**: `hopping_window`, `tumbling_window`, `sliding_window`, `count_window`, `hopping_window_by`, `tumbling_window_by`, `sliding_window_by`, `session_window`

### Operators
- **Pipe**: `|` (for pipeline operations)
- **Arrow**: `=>` (for step definitions)
- **Comparison**: `==`, `!=`, `<=`, `>=`, `<`, `>`
- **Assignment**: `=`
- **Arithmetic**: `+`, `-`, `*`, `/`, `%`
- **Logical**: `&&`, `||`
- **Spread**: `...`
- **Ternary**: `?`
- **Colon**: `:`

### Functions
- **Built-in Functions**: `count`, `sum`, `avg`, `min`, `max`, `abs`, `exp`, `pi`, `pow`, `mod`, `add`, `sub`, `mul`, `div`, `neg`, `eq`, `ne`, `lt`, `le`, `gt`, `ge`, `and`, `or`, `not`
- **Special Functions**: `iff()`, `emit()`

### Syntax Elements
- **Comments**: Single-line (`//`) and multi-line (`/* */`)
- **Strings**: Double-quoted strings with escape sequences
- **Numbers**: Integer and floating-point numbers
- **Objects**: JSON-like object literals with property access
- **Arrays**: Array literals and array indexing (`array[0]`)
- **Dot Commands**: System commands starting with `.` (e.g., `.list`, `.info`)
- **Identifiers**: Variable names and function names

## Usage

The syntax highlighting is automatically applied to code blocks with the `jsonjet` language identifier:

```markdown
```jsonjet
create flow example as
data_stream 
  | where value > 10
  | select { processed: value * 2 };
```
```

## Configuration

The grammar is configured in `docs/.vitepress/config.js`:

```javascript
markdown: {
  languages: [
    {
      id: 'jsonjet',
      scopeName: 'source.jsonjet',
      grammar: './.vitepress/grammars/jsonjet.tmLanguage.json',
      aliases: ['jet', 'jsonjet']
    }
  ]
}
```

## Color Scheme

The syntax highlighting uses semantic color coding:

- **Keywords**: Control flow and language keywords
- **Operators**: Mathematical and logical operators
- **Functions**: Built-in and user-defined functions
- **Strings**: String literals
- **Numbers**: Numeric literals
- **Comments**: Documentation and explanatory text
- **Identifiers**: Variable and function names
- **Punctuation**: Braces, brackets, parentheses, etc.

## Extending

To add new syntax elements:

1. Add the pattern to the appropriate section in `jsonjet.tmLanguage.json`
2. Use descriptive scope names following the TextMate convention
3. Test with various code examples
4. Update this documentation

## References

- [TextMate Grammar Documentation](https://macromates.com/manual/en/language_grammars)
- [VitePress Markdown Configuration](https://vitepress.dev/reference/site-config#markdown)
- [Shiki Syntax Highlighting](https://shiki.matsu.io/) 