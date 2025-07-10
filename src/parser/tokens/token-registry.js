import { Lexer } from 'chevrotain';

// Import all token categories
import { WhiteSpace, Comment, Identifier } from './core-tokens.js';
import { 
    Where, Select, Scan, Summarize, InsertInto, WriteToFile, AssertOrSaveExpected, Collect,
    By, Over, Step, Iff, Emit,
    Every, When, On, Change, Group, Update, Using,
    HoppingWindow, TumblingWindow, SlidingWindow, CountWindow,
    HoppingWindowBy, TumblingWindowBy, SlidingWindowBy, SessionWindow, Print, As,
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
    HoppingWindowBy, TumblingWindowBy, SlidingWindowBy,
    HoppingWindow, TumblingWindow, SlidingWindow, CountWindow, SessionWindow,
    
    // Query operation keywords
    Where, Select, Scan, Step, Summarize, InsertInto, WriteToFile, AssertOrSaveExpected, By, Over, 
    Iff, Emit, Every, When, On, Change, Group, Update, Using, Collect, Print, As,
    
    // Logical keywords (deprecated but supported for compatibility)
    
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
    Where, Select, Scan, Summarize, InsertInto, WriteToFile, AssertOrSaveExpected, Collect,
    By, Over, Step, Iff, Emit, Every, When, On, Change, Group, Update, Using,
    HoppingWindow, TumblingWindow, SlidingWindow, CountWindow,
    HoppingWindowBy, TumblingWindowBy, SlidingWindowBy, SessionWindow, Print,
    
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