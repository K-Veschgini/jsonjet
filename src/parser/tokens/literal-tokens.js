import { createToken } from 'chevrotain';

// =============================================================================
// STRING LITERALS
// =============================================================================
export const StringLiteral = createToken({
    name: "StringLiteral",
    pattern: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/
});

// =============================================================================
// NUMERIC LITERALS
// =============================================================================
export const NumberLiteral = createToken({
    name: "NumberLiteral",
    pattern: /\d+(?:\.\d+)?/
});

// =============================================================================
// BOOLEAN LITERALS
// =============================================================================
export const BooleanLiteral = createToken({
    name: "BooleanLiteral",
    pattern: /true|false/i
});

// =============================================================================
// NULL LITERAL
// =============================================================================
export const NullLiteral = createToken({
    name: "NullLiteral",
    pattern: /null\b/i
});