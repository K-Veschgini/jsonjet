import { streamManager } from '../core/stream-manager.js';

/**
 * Command Parser - Handles dot commands like .create, .insert, etc.
 */
export class CommandParser {
    
    /**
     * Parse and execute a dot command
     * Returns { type: 'command', result: any, message: string }
     */
    static async executeCommand(commandText) {
        const trimmed = commandText.trim();
        
        if (!trimmed.startsWith('.')) {
            throw new Error('Commands must start with a dot (.)');
        }

        // Remove the leading dot and parse
        const command = trimmed.slice(1);
        
        try {
            // Parse command parts
            const parts = this.parseCommandParts(command);
            const [action, ...args] = parts;

            switch (action.toLowerCase()) {
                case 'create':
                    return await this.handleCreateCommand(args);
                
                case 'delete':
                    return await this.handleDeleteCommand(args);
                
                case 'insert':
                    return await this.handleInsertCommand(args);
                
                case 'flush':
                    return await this.handleFlushCommand(args);
                
                case 'list':
                    return await this.handleListCommand(args);
                
                case 'info':
                    return await this.handleInfoCommand(args);
                
                default:
                    throw new Error(`Unknown command: ${action}`);
            }
        } catch (error) {
            return {
                type: 'command',
                success: false,
                error: error.message,
                message: `Command failed: ${error.message}`
            };
        }
    }

    /**
     * Handle .create stream <name>
     */
    static async handleCreateCommand(args) {
        if (args.length !== 2 || args[0].toLowerCase() !== 'stream') {
            throw new Error('Usage: .create stream <name>');
        }

        const streamName = args[1];
        streamManager.createStream(streamName);
        
        return {
            type: 'command',
            success: true,
            result: { streamName },
            message: `Stream '${streamName}' created successfully`
        };
    }

    /**
     * Handle .delete stream <name>
     */
    static async handleDeleteCommand(args) {
        if (args.length !== 2 || args[0].toLowerCase() !== 'stream') {
            throw new Error('Usage: .delete stream <name>');
        }

        const streamName = args[1];
        streamManager.deleteStream(streamName);
        
        return {
            type: 'command',
            success: true,
            result: { streamName },
            message: `Stream '${streamName}' deleted successfully`
        };
    }

    /**
     * Handle .flush <name>
     */
    static async handleFlushCommand(args) {
        if (args.length !== 1) {
            throw new Error('Usage: .flush <stream_name>');
        }

        const streamName = args[0];
        streamManager.flushStream(streamName);
        
        return {
            type: 'command',
            success: true,
            result: { streamName },
            message: `Stream '${streamName}' flushed successfully`
        };
    }

    /**
     * Handle .insert into <name> <data>
     */
    static async handleInsertCommand(args) {
        if (args.length < 3 || args[0].toLowerCase() !== 'into') {
            throw new Error('Usage: .insert into <stream_name> <json_data>');
        }

        const streamName = args[1];
        const dataText = args.slice(2).join(' ');

        // Parse the JSON data
        let data;
        try {
            data = JSON.parse(dataText);
        } catch (error) {
            throw new Error(`Invalid JSON data: ${error.message}`);
        }

        await streamManager.insertIntoStream(streamName, data);
        
        const count = Array.isArray(data) ? data.length : 1;
        return {
            type: 'command',
            success: true,
            result: { streamName, data, count },
            message: `Inserted ${count} item(s) into stream '${streamName}'`
        };
    }

    /**
     * Handle .list streams
     */
    static async handleListCommand(args) {
        if (args.length === 0 || args[0].toLowerCase() === 'streams') {
            const streams = streamManager.listStreams();
            return {
                type: 'command',
                success: true,
                result: { streams },
                message: `Found ${streams.length} stream(s): ${streams.join(', ') || 'none'}`
            };
        }

        throw new Error('Usage: .list streams');
    }

    /**
     * Handle .info <name> or .info
     */
    static async handleInfoCommand(args) {
        if (args.length === 0) {
            // Show info for all streams
            const info = streamManager.getAllStreamInfo();
            return {
                type: 'command',
                success: true,
                result: { info },
                message: `Stream information retrieved`
            };
        } else if (args.length === 1) {
            // Show info for specific stream
            const streamName = args[0];
            const info = streamManager.getStreamInfo(streamName);
            
            if (!info) {
                throw new Error(`Stream '${streamName}' does not exist`);
            }
            
            return {
                type: 'command',
                success: true,
                result: { info },
                message: `Stream '${streamName}' info retrieved`
            };
        }

        throw new Error('Usage: .info [stream_name]');
    }

    /**
     * Parse command into parts, handling JSON objects properly
     */
    static parseCommandParts(command) {
        const parts = [];
        let current = '';
        let inJson = false;
        let braceCount = 0;
        let inString = false;
        let escapeNext = false;

        for (let i = 0; i < command.length; i++) {
            const char = command[i];
            
            if (escapeNext) {
                current += char;
                escapeNext = false;
                continue;
            }

            if (char === '\\') {
                current += char;
                escapeNext = true;
                continue;
            }

            if (char === '"' && !inString) {
                inString = true;
                current += char;
                continue;
            }

            if (char === '"' && inString) {
                inString = false;
                current += char;
                continue;
            }

            if (inString) {
                current += char;
                continue;
            }

            if (char === '{') {
                inJson = true;
                braceCount++;
                current += char;
                continue;
            }

            if (char === '}') {
                braceCount--;
                current += char;
                if (braceCount === 0) {
                    inJson = false;
                }
                continue;
            }

            if (inJson) {
                current += char;
                continue;
            }

            if (char === ' ' || char === '\t') {
                if (current.trim()) {
                    parts.push(current.trim());
                    current = '';
                }
                continue;
            }

            current += char;
        }

        if (current.trim()) {
            parts.push(current.trim());
        }

        return parts;
    }

    /**
     * Check if a line is a command
     */
    static isCommand(line) {
        return line.trim().startsWith('.');
    }

    /**
     * Extract command from a line (removing semicolon if present)
     */
    static extractCommand(line) {
        let command = line.trim();
        if (command.endsWith(';')) {
            command = command.slice(0, -1).trim();
        }
        return command;
    }
}

export default CommandParser;