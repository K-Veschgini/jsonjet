// Simple logging system for JSONJet
export class Logger {
    constructor(streamManager) {
        this.streamManager = streamManager;
    }

    /**
     * Ensure the _log stream exists
     */
    ensureLogStream() {
        try {
            // Check if stream exists without throwing
            if (!this.streamManager.streams.has('_log')) {
                // Use a special internal method to avoid circular dependency
                this.streamManager.createStreamInternal('_log');
            }
        } catch (error) {
            console.warn('Could not create _log stream:', error.message);
        }
    }

    /**
     * Generate a simple time-based UUID
     */
    generateId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `${timestamp}-${random}`;
    }

    /**
     * Log an entry to the _log stream
     */
    log(level, code, message, query = null) {
        const entry = {
            _id: this.generateId(),
            timestamp: new Date().toISOString(),
            level,
            code,
            message,
            query
        };

        try {
            this.ensureLogStream();
            this.streamManager.insertIntoStream('_log', entry);
        } catch (error) {
            console.warn('Failed to log to _log stream:', error.message);
        }
        
        return entry;
    }

    /**
     * Log an error
     */
    error(code, message, query = null) {
        return this.log('error', code, message, query);
    }

    /**
     * Log a warning
     */
    warning(code, message, query = null) {
        return this.log('warning', code, message, query);
    }

    /**
     * Log an info message
     */
    info(code, message, query = null) {
        return this.log('info', code, message, query);
    }

    /**
     * Create an error response with logging
     */
    createErrorResponse(code, message, query = null) {
        this.error(code, message, query);
        return {
            success: false,
            error: {
                code,
                message
            }
        };
    }

    /**
     * Create a success response
     */
    createSuccessResponse(type, message, data = {}) {
        return {
            success: true,
            type,
            message,
            ...data
        };
    }
}