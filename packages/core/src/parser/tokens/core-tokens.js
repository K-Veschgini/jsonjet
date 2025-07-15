import { createToken, Lexer } from 'chevrotain';

// Core language tokens that affect parsing behavior
export const WhiteSpace = createToken({
    name: "WhiteSpace",
    pattern: /\s+/,
    group: Lexer.SKIPPED
});

export const Comment = createToken({
    name: "Comment",
    pattern: /\/\/[^\r\n]*/,
    group: Lexer.SKIPPED
});

// Must come after all keywords to avoid conflicts
export const Identifier = createToken({
    name: "Identifier",
    pattern: /[a-zA-Z_][a-zA-Z0-9_]*/
});