import { createToken } from 'chevrotain';

// =============================================================================
// STRING LITERALS
// =============================================================================
export const StringLiteral = createToken({
    name: "StringLiteral",
    pattern: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/
});

// =============================================================================
// DURATION LITERALS (for TTL expressions) - Must come before NumberLiteral
// =============================================================================
export const DurationLiteral = createToken({
    name: "DurationLiteral",
    pattern: /\d+[smhdSMHD]/
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