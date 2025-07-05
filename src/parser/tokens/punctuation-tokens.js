import { createToken } from 'chevrotain';

// =============================================================================
// DELIMITERS
// =============================================================================
export const LeftParen = createToken({ name: "LeftParen", pattern: /\(/ });
export const RightParen = createToken({ name: "RightParen", pattern: /\)/ });
export const LeftBrace = createToken({ name: "LeftBrace", pattern: /\{/ });
export const RightBrace = createToken({ name: "RightBrace", pattern: /\}/ });
export const LeftBracket = createToken({ name: "LeftBracket", pattern: /\[/ });
export const RightBracket = createToken({ name: "RightBracket", pattern: /\]/ });

// =============================================================================
// SEPARATORS
// =============================================================================
export const Comma = createToken({ name: "Comma", pattern: /,/ });
export const Semicolon = createToken({ name: "Semicolon", pattern: /;/ });
export const Colon = createToken({ name: "Colon", pattern: /:/ });
export const Dot = createToken({ name: "Dot", pattern: /\./ });