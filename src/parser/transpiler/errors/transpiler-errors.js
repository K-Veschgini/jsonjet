// =============================================================================
// TRANSPILER ERROR CLASSES
// =============================================================================
// Clean, structured error handling for the transpiler

export class TranspilerError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.name = 'TranspilerError';
        this.context = context;
        this.timestamp = new Date().toISOString();
    }

    toString() {
        const contextStr = Object.keys(this.context).length > 0 
            ? ` Context: ${JSON.stringify(this.context)}`
            : '';
        return `${this.name}: ${this.message}${contextStr}`;
    }
}

export class ParseError extends TranspilerError {
    constructor(message, parseErrors = []) {
        super(message);
        this.name = 'ParseError';
        this.parseErrors = parseErrors;
    }
}

export class CodeGenerationError extends TranspilerError {
    constructor(message, nodeType = null, originalError = null) {
        super(message);
        this.name = 'CodeGenerationError';
        this.nodeType = nodeType;
        this.originalError = originalError;
    }
}

export class ValidationError extends TranspilerError {
    constructor(message, validationRules = []) {
        super(message);
        this.name = 'ValidationError';
        this.validationRules = validationRules;
    }
}

// =============================================================================
// ERROR UTILITIES
// =============================================================================

export class ErrorUtils {
    /**
     * Wrap visitor method calls with error handling
     */
    static wrapVisitorMethod(methodName, method, visitor) {
        return function(ctx) {
            try {
                return method.call(visitor, ctx);
            } catch (error) {
                if (error instanceof TranspilerError) {
                    throw error;
                }
                throw new CodeGenerationError(
                    `Error in visitor method '${methodName}': ${error.message}`,
                    methodName,
                    error
                );
            }
        };
    }

    /**
     * Create detailed error message with context
     */
    static createDetailedError(message, ctx, additionalInfo = {}) {
        const context = {
            contextType: ctx?.constructor?.name || 'unknown',
            ...additionalInfo
        };
        return new TranspilerError(message, context);
    }

    /**
     * Validate context structure
     */
    static validateContext(ctx, expectedProperties, methodName) {
        if (!ctx) {
            throw new ValidationError(`Context is null/undefined in ${methodName}`);
        }

        const missing = expectedProperties.filter(prop => !(prop in ctx));
        if (missing.length > 0) {
            throw new ValidationError(
                `Missing properties in ${methodName}: ${missing.join(', ')}`,
                expectedProperties
            );
        }
    }
}