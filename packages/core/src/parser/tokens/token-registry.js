import { Lexer } from 'chevrotain';

// Import all token categories
import { WhiteSpace, Comment, Identifier } from './core-tokens.js';
import { 
    Where, Select, Scan, Summarize, InsertInto, WriteToFile, AssertOrSaveExpected, Collect,
    By, Over, Step, Iff, Emit,
    Every, When, On, Change, Group, Update, Using,
    HoppingWindow, TumblingWindow, SlidingWindow, CountWindow,
    HoppingWindowBy, TumblingWindowBy, SlidingWindowBy, SessionWindow, Print, As,
    Create, Or, Replace, If, Not, Exists, Stream, Flow, Lookup, Delete, Insert, Into,
    Flush, List, Info, Subscribe, Unsubscribe, Ttl
} from './keyword-tokens.js';
import {
    LogicalOr, LogicalAnd, Equals, NotEquals, LessEquals, GreaterEquals,
    LessThan, GreaterThan, Plus, Minus, Multiply, Divide,
    Arrow, Assign, Pipe, Spread, QuestionMark
} from './operator-tokens.js';
import { StringLiteral, DurationLiteral, NumberLiteral, BooleanLiteral, NullLiteral } from './literal-tokens.js';
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
    Subscribe, Unsubscribe, WriteToFile, AssertOrSaveExpected, InsertInto,
    
    // Query operation keywords
    Where, Select, Scan, Step, Summarize, By, Over, 
    Iff, Emit, Every, When, On, Change, Group, Update, Using, Collect, Print, As,
    
    // Statement keywords
    Create, Delete, Insert, Into, Flush, List, Info, Stream, Flow, Lookup,
    Replace, Exists, Or, If, Not, Ttl,
    
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
    QuestionMark,   // ?
    
    // Literals (longer patterns first)
    StringLiteral, DurationLiteral, NumberLiteral, BooleanLiteral, NullLiteral,
    
    // Identifiers (must come after keywords)
    Identifier,
    
    // Punctuation
    Comma, Semicolon, Colon, Dot,
    LeftParen, RightParen, LeftBrace, RightBrace, LeftBracket, RightBracket
];

// =============================================================================
// LEXER INSTANCE - Standard (Context-sensitive lexer created separately)
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
    HoppingWindowBy, TumblingWindowBy, SlidingWindowBy, SessionWindow, Print, As,
    
    // Statement keywords
    Create, Or, Replace, If, Not, Exists, Stream, Flow, Lookup, Delete, Insert, Into,
    Flush, List, Info, Subscribe, Unsubscribe, Ttl,
    
    // Operators
    LogicalOr, LogicalAnd, Equals, NotEquals, LessEquals, GreaterEquals,
    LessThan, GreaterThan, Plus, Minus, Multiply, Divide,
    Arrow, Assign, Pipe, Spread, QuestionMark,
    
    // Literals
    StringLiteral, DurationLiteral, NumberLiteral, BooleanLiteral, NullLiteral,
    
    // Punctuation
    Comma, Semicolon, Colon, Dot,
    LeftParen, RightParen, LeftBrace, RightBrace, LeftBracket, RightBracket
};