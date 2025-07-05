import { createToken } from 'chevrotain';

// =============================================================================
// LOGICAL OPERATORS (Primary)
// =============================================================================
// These take precedence over word-based operators
export const LogicalOr = createToken({ name: "LogicalOr", pattern: /\|\|/ });
export const LogicalAnd = createToken({ name: "LogicalAnd", pattern: /&&/ });

// =============================================================================
// COMPARISON OPERATORS
// =============================================================================
// Order matters: longer patterns first to avoid partial matches
export const Equals = createToken({ name: "Equals", pattern: /==/ });
export const NotEquals = createToken({ name: "NotEquals", pattern: /!=/ });
export const LessEquals = createToken({ name: "LessEquals", pattern: /<=/ });
export const GreaterEquals = createToken({ name: "GreaterEquals", pattern: />=/ });
export const LessThan = createToken({ name: "LessThan", pattern: /</ });
export const GreaterThan = createToken({ name: "GreaterThan", pattern: />/ });

// =============================================================================
// ARITHMETIC OPERATORS
// =============================================================================
export const Plus = createToken({ name: "Plus", pattern: /\+/ });
export const Minus = createToken({ name: "Minus", pattern: /-/ });
export const Multiply = createToken({ name: "Multiply", pattern: /\*/ });
export const Divide = createToken({ name: "Divide", pattern: /\// });

// =============================================================================
// ASSIGNMENT AND FLOW OPERATORS
// =============================================================================
export const Arrow = createToken({ name: "Arrow", pattern: /=>/ });
export const Assign = createToken({ name: "Assign", pattern: /=/ });
export const Pipe = createToken({ name: "Pipe", pattern: /\|/ });

// =============================================================================
// SPECIAL OPERATORS
// =============================================================================
export const Spread = createToken({ name: "Spread", pattern: /\.\.\./ });