import { Lexer } from 'chevrotain';

// Import all token categories
import { WhiteSpace, Comment, Identifier } from './core-tokens.js';
import { 
    Where, Project, Select, Scan, Summarize, InsertInto, Collect,
    By, Over, Step, Iff, Emit, Count, Sum,
    HoppingWindow, TumblingWindow, SessionWindow, Print,
    And, Or  // Deprecated but kept for compatibility
} from './keyword-tokens.js';
import {
    LogicalOr, LogicalAnd, Equals, NotEquals, LessEquals, GreaterEquals,
    LessThan, GreaterThan, Plus, Minus, Multiply, Divide,
    Arrow, Assign, Pipe, Spread
} from './operator-tokens.js';
import { StringLiteral, NumberLiteral, BooleanLiteral, NullLiteral } from './literal-tokens.js';
import { 
    LeftParen, RightParen, LeftBrace, RightBrace, LeftBracket, RightBracket,
    Comma, Semicolon, Colon, Dot
} from './punctuation-tokens.js';

// =============================================================================
// TOKEN REGISTRY
// =============================================================================
// Order is critical! Longer patterns must come first to avoid partial matches
export const allTokens = [
    // Skip tokens (whitespace, comments)
    WhiteSpace,
    Comment,
    
    // Complex keywords first (longest patterns)
    HoppingWindow, TumblingWindow, SessionWindow,
    
    // Query operation keywords
    Where, Project, Select, Scan, Step, Summarize, InsertInto, By, Over, 
    Iff, Emit, Collect, Print,
    
    // Function keywords
    Count, Sum,
    
    // Logical keywords (deprecated but supported for compatibility)
    And, Or,
    
    // Operators (longer patterns first)
    LogicalOr,      // || must come before |
    LogicalAnd,     // && 
    Arrow,          // =>
    Equals,         // == must come before =
    NotEquals,      // !=
    LessEquals,     // <=
    GreaterEquals,  // >=
    LessThan,       // <
    GreaterThan,    // >
    Assign,         // =
    Pipe,           // |
    Plus, Minus, Multiply, Divide,
    Spread,         // ... must come before .
    
    // Literals
    StringLiteral, NumberLiteral, BooleanLiteral, NullLiteral,
    
    // Identifiers (must come after keywords)
    Identifier,
    
    // Punctuation
    Comma, Semicolon, Colon, Dot,
    LeftParen, RightParen, LeftBrace, RightBrace, LeftBracket, RightBracket
];

// =============================================================================
// LEXER INSTANCE
// =============================================================================
export const QueryLexer = new Lexer(allTokens);

// =============================================================================
// TOKEN EXPORTS (for parser rules)
// =============================================================================
export {
    // Core
    WhiteSpace, Comment, Identifier,
    
    // Keywords
    Where, Project, Select, Scan, Summarize, InsertInto, Collect,
    By, Over, Step, Iff, Emit, Count, Sum,
    HoppingWindow, TumblingWindow, SessionWindow, Print,
    And, Or,
    
    // Operators
    LogicalOr, LogicalAnd, Equals, NotEquals, LessEquals, GreaterEquals,
    LessThan, GreaterThan, Plus, Minus, Multiply, Divide,
    Arrow, Assign, Pipe, Spread,
    
    // Literals
    StringLiteral, NumberLiteral, BooleanLiteral, NullLiteral,
    
    // Punctuation
    LeftParen, RightParen, LeftBrace, RightBrace, LeftBracket, RightBracket,
    Comma, Semicolon, Colon, Dot
};