// =============================================================================
// LEXER FACTORY
// =============================================================================
// Creates the appropriate lexer instance with context-sensitive keyword handling

import { Lexer } from 'chevrotain';
import { ContextSensitiveLexer } from './context-sensitive-lexer.js';
import { allTokens } from '../tokens/token-registry.js';

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create the main context-sensitive lexer for the query parser
 */
export function createQueryLexer() {
    return new ContextSensitiveLexer(allTokens);
}

/**
 * Create a standard lexer (for debugging/comparison)
 */
export function createStandardLexer() {
    return new Lexer(allTokens);
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export const QueryLexer = createQueryLexer();