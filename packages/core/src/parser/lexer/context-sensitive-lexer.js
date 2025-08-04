// =============================================================================
// CONTEXT-SENSITIVE LEXER
// =============================================================================
// Elegant solution: Keywords are only keywords at statement boundaries.
// Everywhere else, they become regular identifiers.

import { Lexer } from 'chevrotain';
import { allTokens } from '../tokens/token-registry.js';

// =============================================================================
// STATEMENT CONTEXT TRACKER
// =============================================================================

class StatementContextTracker {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.atStatementStart = true;  // Start of input is statement start
        this.braceDepth = 0;          // Track { } nesting
        this.parenDepth = 0;          // Track ( ) nesting
        this.bracketDepth = 0;        // Track [ ] nesting
        this.afterPipe = false;       // Track if we're after a | operator
    }
    
    /**
     * Determine if we're at a position where keywords should be treated as keywords
     */
    shouldTreatAsKeyword(tokenImage) {
        const token = tokenImage.toLowerCase();
        
        // Strategy: Only convert problematic keywords to identifiers in non-command contexts
        // Keep most keywords as keywords to maintain grammar simplicity
        
        // These keywords are problematic and should become identifiers outside of command context
        const problematicKeywords = new Set(['delete', 'info', 'list', 'create', 'insert', 'flush', 'subscribe', 'unsubscribe']);
        
        if (!problematicKeywords.has(token)) {
            // Non-problematic keywords (like where, select, scan) always stay as keywords
            return true;
        }
        
        // For problematic keywords, only keep them as keywords at statement start (for commands)
        const isAtCommandPosition = this.atStatementStart && 
                                   this.braceDepth === 0 && 
                                   this.parenDepth === 0 && 
                                   this.bracketDepth === 0 &&
                                   !this.afterPipe;
        
        return isAtCommandPosition;
    }
    
    /**
     * Update context based on the token we just processed
     */
    updateContext(tokenType, tokenImage) {
        // Track nesting levels
        switch (tokenType.name) {
            case 'LeftBrace':
                this.braceDepth++;
                this.atStatementStart = false;
                break;
            case 'RightBrace':
                this.braceDepth--;
                break;
            case 'LeftParen':
                this.parenDepth++;
                this.atStatementStart = false;
                break;
            case 'RightParen':
                this.parenDepth--;
                break;
            case 'LeftBracket':
                this.bracketDepth++;
                this.atStatementStart = false;
                break;
            case 'RightBracket':
                this.bracketDepth--;
                break;
                
            // Statement and expression boundaries
            case 'Semicolon':
                // After semicolon, we're at a new statement start
                this.atStatementStart = true;
                this.afterPipe = false;
                break;
            case 'Pipe':
                // After pipe, we're in a pipeline operation (not statement start)
                this.atStatementStart = false;
                this.afterPipe = true;
                break;
                
            // Any other token means we're no longer at statement start
            default:
                if (this.atStatementStart && !this.isWhitespaceOrComment(tokenType)) {
                    this.atStatementStart = false;
                }
                if (tokenType.name !== 'Pipe') {
                    this.afterPipe = false;
                }
                break;
        }
    }
    
    isWhitespaceOrComment(tokenType) {
        return tokenType.name === 'WhiteSpace' || tokenType.name === 'Comment';
    }
}

// =============================================================================
// KEYWORD DEFINITIONS
// =============================================================================

// Keywords that should only be keywords at statement boundaries
const CONTEXT_SENSITIVE_KEYWORDS = new Set([
    'create', 'delete', 'insert', 'flush', 'list', 'info', 
    'subscribe', 'unsubscribe', 'where', 'select', 'scan', 
    'summarize', 'by', 'step', 'iff', 'emit',
    'stream', 'flow', 'or', 'replace', 'if', 'not', 'exists',
            'into', 'ttl', 'as', 'every', 'when', 'on',
    'change', 'group', 'update', 'using', 'over',
    'hopping_window', 'tumbling_window', 'sliding_window', 
    'count_window', 'hopping_window_by', 'tumbling_window_by',
    'sliding_window_by', 'session_window'
]);

// =============================================================================
// CONTEXT-SENSITIVE LEXER CLASS
// =============================================================================

export class ContextSensitiveLexer extends Lexer {
    constructor(tokens = allTokens) {
        super(tokens);
        this.contextTracker = new StatementContextTracker();
    }
    
    /**
     * Override the main tokenize method to add context sensitivity
     */
    tokenize(text, initialMode) {
        // First, do normal tokenization
        const lexResult = super.tokenize(text, initialMode);
        
        // Then, post-process tokens to convert keywords to identifiers based on context
        const processedTokens = this.processTokensWithContext(lexResult.tokens);
        
        return {
            ...lexResult,
            tokens: processedTokens
        };
    }
    
    /**
     * Process tokens and convert keywords to identifiers based on context
     */
    processTokensWithContext(tokens) {
        this.contextTracker.reset();
        const processedTokens = [];
        
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            
            // Skip whitespace and comments for context tracking
            if (this.contextTracker.isWhitespaceOrComment(token.tokenType)) {
                processedTokens.push(token);
                continue;
            }
            
            // Look ahead to see if this is really a command or a pipeline
            const isReallyACommand = this.isReallyACommand(tokens, i);
            
            // Check if this token should be converted from keyword to identifier
            const processedToken = this.processToken(token, isReallyACommand);
            processedTokens.push(processedToken);
            
            // Update context for next token
            this.contextTracker.updateContext(processedToken.tokenType, processedToken.image);
        }
        
        return processedTokens;
    }
    
    /**
     * Look ahead to determine if this is really a command or a pipeline
     */
    isReallyACommand(tokens, currentIndex) {
        const token = tokens[currentIndex];
        const tokenImage = token.image.toLowerCase();
        
        // Only apply lookahead for problematic keywords
        const problematicKeywords = new Set(['delete', 'info', 'list', 'create', 'insert', 'flush', 'subscribe', 'unsubscribe']);
        if (!problematicKeywords.has(tokenImage)) {
            return true; // Non-problematic keywords don't need lookahead
        }
        
        // Look for next non-whitespace token
        for (let i = currentIndex + 1; i < tokens.length; i++) {
            const nextToken = tokens[i];
            if (this.contextTracker.isWhitespaceOrComment(nextToken.tokenType)) {
                continue; // Skip whitespace
            }
            
            // If next token is |, this is a pipeline, not a command
            if (nextToken.tokenType.name === 'Pipe') {
                return false;
            }
            
            // If next token is stream/flow (for delete/create), this is a command
            if (nextToken.tokenType.name === 'Stream' || nextToken.tokenType.name === 'Flow') {
                return true;
            }
            
            // For other cases, assume it's a command if at statement start
            return this.contextTracker.atStatementStart;
        }
        
        return this.contextTracker.atStatementStart;
    }
    
    /**
     * Process a single token, converting keywords to identifiers if needed
     */
    processToken(token, isReallyACommand = null) {
        const tokenImage = token.image.toLowerCase();
        
        // If this is a context-sensitive keyword
        if (CONTEXT_SENSITIVE_KEYWORDS.has(tokenImage)) {
            // Use lookahead information if available, otherwise use context tracker
            let shouldStayKeyword;
            if (isReallyACommand !== null) {
                shouldStayKeyword = isReallyACommand;
            } else {
                shouldStayKeyword = this.contextTracker.shouldTreatAsKeyword(tokenImage);
            }
            
            if (shouldStayKeyword) {
                // Keep as keyword
                return token;
            } else {
                // Convert to identifier
                return this.convertToIdentifier(token);
            }
        }
        
        // Not a context-sensitive keyword, keep as-is
        return token;
    }
    
    /**
     * Convert a keyword token to an identifier token
     */
    convertToIdentifier(keywordToken) {
        // Find the Identifier token type
        const IdentifierTokenType = this.tokensMap.Identifier;
        
        if (!IdentifierTokenType) {
            throw new Error('Identifier token type not found in lexer');
        }
        
        // Create new token with Identifier type but original image and position
        return {
            ...keywordToken,
            tokenType: IdentifierTokenType,
            tokenTypeIdx: IdentifierTokenType.tokenTypeIdx
        };
    }
    
    /**
     * Build a map of token names to token types for easy lookup
     */
    get tokensMap() {
        if (!this._tokensMap) {
            this._tokensMap = {};
            this.lexerDefinition.forEach(tokenType => {
                this._tokensMap[tokenType.name] = tokenType;
            });
        }
        return this._tokensMap;
    }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a context-sensitive lexer instance
 */
export function createContextSensitiveLexer() {
    return new ContextSensitiveLexer(allTokens);
}

// =============================================================================
// DEBUGGING UTILITIES
// =============================================================================

/**
 * Debug function to show how tokens are processed
 */
export function debugTokenProcessing(text) {
    const lexer = createContextSensitiveLexer();
    const result = lexer.tokenize(text);
    
    console.log('🔍 Context-Sensitive Token Processing Debug');
    console.log('Input:', text);
    console.log('Tokens:');
    
    result.tokens.forEach((token, i) => {
        if (token.tokenType.name !== 'WhiteSpace') {
            const contextNote = CONTEXT_SENSITIVE_KEYWORDS.has(token.image.toLowerCase()) 
                ? (token.tokenType.name === 'Identifier' ? ' (keyword→identifier)' : ' (keyword)')
                : '';
            console.log(`  ${i}: ${token.tokenType.name}("${token.image}")${contextNote}`);
        }
    });
    
    return result;
}