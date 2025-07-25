// Custom error class for JSDB with error codes
export class JSDBError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'JSDBError';
        this.code = code;
    }
}

// Common error codes
export const ErrorCodes = {
    STREAM_NOT_FOUND: 'STREAM_NOT_FOUND',
    STREAM_ALREADY_EXISTS: 'STREAM_ALREADY_EXISTS',
    FLOW_NOT_FOUND: 'FLOW_NOT_FOUND',
    FLOW_ALREADY_EXISTS: 'FLOW_ALREADY_EXISTS',
    SYNTAX_ERROR: 'SYNTAX_ERROR',
    INVALID_QUERY: 'INVALID_QUERY',
    COMMAND_FAILED: 'COMMAND_FAILED',
    EXECUTION_FAILED: 'EXECUTION_FAILED',
    
    // Function-related errors
    FUNCTION_DEFINITION_ERROR: 'FUNCTION_DEFINITION_ERROR',
    FUNCTION_NOT_FOUND: 'FUNCTION_NOT_FOUND',
    FUNCTION_EXECUTION_ERROR: 'FUNCTION_EXECUTION_ERROR',
    
    // Lookup-related errors
    LOOKUP_DEFINITION_ERROR: 'LOOKUP_DEFINITION_ERROR',
    LOOKUP_NOT_FOUND: 'LOOKUP_NOT_FOUND',
    LOOKUP_NAME_CONFLICT: 'LOOKUP_NAME_CONFLICT',
    LOOKUP_VALUE_ERROR: 'LOOKUP_VALUE_ERROR'
};