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
    EXECUTION_FAILED: 'EXECUTION_FAILED'
};