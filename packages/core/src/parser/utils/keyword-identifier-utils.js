// =============================================================================
// KEYWORD-AS-IDENTIFIER UTILITY
// =============================================================================
// Comprehensive solution for allowing keywords to be used as identifiers in 
// appropriate contexts while avoiding grammar ambiguity.
//
// SOLUTION APPROACH:
// 1. SOURCE NAMES: Allow non-ambiguous keywords (avoid command-starting keywords)
// 2. VARIABLES: Allow ALL keywords in expressions (stepVariable rule) 
// 3. PROPERTY KEYS: Allow ALL keywords as object property names
//
// This provides maximum flexibility while maintaining unambiguous parsing.

import { 
    Where, Select, Scan, Summarize, InsertInto, WriteToFile, AssertOrSaveExpected, Collect,
    By, Over, Step, Iff, Emit, Every, When, On, Change, Group, Update, Using,
    HoppingWindow, TumblingWindow, SlidingWindow, CountWindow,
    HoppingWindowBy, TumblingWindowBy, SlidingWindowBy, SessionWindow, As,
    Create, Or, Replace, If, Not, Exists, Stream, Flow, Delete, Insert, Into,
    Flush, List, Info, Subscribe, Unsubscribe, Ttl
} from '../tokens/keyword-tokens.js';
import { Identifier } from '../tokens/core-tokens.js';
import { StringLiteral } from '../tokens/literal-tokens.js';

// =============================================================================
// KEYWORD CATEGORIES
// =============================================================================

// Keywords that can be used as identifiers in most contexts
export const IDENTIFIER_SAFE_KEYWORDS = [
    // Query operations
    Where, Select, Scan, Summarize, InsertInto, WriteToFile, AssertOrSaveExpected, Collect,
    By, Over, Step, Iff, Emit, Every, When, On, Change, Group, Update, Using,
    
    // Window functions
    HoppingWindow, TumblingWindow, SlidingWindow, CountWindow,
    HoppingWindowBy, TumblingWindowBy, SlidingWindowBy, SessionWindow,
    
    // Command keywords
    Create, Or, Replace, If, Not, Exists, Stream, Flow, Delete, Insert, Into,
    Flush, List, Info, Subscribe, Unsubscribe, Ttl, As
];

// Keywords that should NOT be used as identifiers (reserved for special syntax)
export const RESERVED_KEYWORDS = [
    // These are typically used in very specific grammatical contexts
    // and allowing them as identifiers might cause ambiguity
    // Currently empty - we can add keywords here if needed
];

// =============================================================================
// GRAMMAR RULE HELPERS
// =============================================================================

/**
 * Creates a grammar rule that accepts Identifier OR any keyword as an identifier
 * This is used as a template - the actual rule needs to be defined explicitly
 * @param {string} label - The label for the consumed token
 * @returns {Array} Array of grammar alternatives
 */
export function createIdentifierOrKeywordRule(label = 'identifier') {
    // This function is a template - actual rules need to be defined explicitly
    // in the grammar files to avoid token reference issues during grammar recording
    throw new Error('createIdentifierOrKeywordRule should not be called directly. Use explicit grammar rules instead.');
}

/**
 * Creates a grammar rule for property keys (identifiers, strings, or keywords)
 * @returns {Array} Array of grammar alternatives
 */
export function createPropertyKeyRule() {
    const alternatives = [
        { ALT: () => this.CONSUME(Identifier) },
        { ALT: () => this.CONSUME(StringLiteral) }
    ];
    
    // Add all safe keywords as alternatives
    IDENTIFIER_SAFE_KEYWORDS.forEach(keyword => {
        alternatives.push({
            ALT: () => this.CONSUME(keyword)
        });
    });
    
    return alternatives;
}

// =============================================================================
// VISITOR HELPERS
// =============================================================================

/**
 * Generic function to get token image from any keyword or identifier token
 * @param {Object} ctx - The context object containing the token
 * @param {string} label - The label used in the grammar rule
 * @returns {string} The token image/text
 */
export function getIdentifierOrKeywordImage(ctx, label = 'identifier') {
    // Check for regular identifier first
    if (ctx.Identifier) {
        return ctx.Identifier[0]?.image || '';
    }
    
    // Check for each keyword token
    for (const keyword of IDENTIFIER_SAFE_KEYWORDS) {
        const tokenName = keyword.name;
        if (ctx[tokenName]) {
            return ctx[tokenName][0]?.image || '';
        }
    }
    
    // Fallback: try to get from labeled token
    if (ctx[label]) {
        return ctx[label][0]?.image || '';
    }
    
    return '';
}

/**
 * Creates a lookup table for property key visitor methods
 * @returns {Object} Token name to keyword mapping
 */
export function createPropertyKeyLookupTable() {
    const table = {
        'Identifier': (ctx) => ctx.Identifier?.[0]?.image || '',
        'StringLiteral': (ctx) => ctx.StringLiteral?.[0]?.image || ''
    };
    
    // Add all keywords to the lookup table
    IDENTIFIER_SAFE_KEYWORDS.forEach(keyword => {
        const tokenName = keyword.name;
        table[tokenName] = (ctx) => {
            const image = ctx[tokenName]?.[0]?.image || '';
            // Convert to lowercase for consistency (keywords are case-insensitive)
            return image.toLowerCase();
        };
    });
    
    return table;
}

// =============================================================================
// CONTEXT DETECTION
// =============================================================================

/**
 * Determines if a keyword should be treated as an identifier in the given context
 * @param {string} keyword - The keyword to check
 * @param {string} context - The context ('source', 'variable', 'property', etc.)
 * @returns {boolean} True if the keyword can be used as an identifier
 */
export function isKeywordAllowedAsIdentifier(keyword, context) {
    // For now, allow all safe keywords in all contexts
    // This can be refined later if needed
    return IDENTIFIER_SAFE_KEYWORDS.some(token => token.name === keyword);
}