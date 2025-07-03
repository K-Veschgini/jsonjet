import { streamManager } from '../core/stream-manager.js';
import DurationParser from '../utils/duration-parser.js';

/**
 * Command Parser - Handles unified command syntax (no dots)
 * Supports: create stream, insert into, delete flow, list flows, etc.
 */
export class CommandParser {
    
    /**
     * Parse and execute a command
     * Returns { type: 'command', result: any, message: string }
     */
    static async executeCommand(commandText) {
        const trimmed = commandText.trim();
        
        if (!trimmed) {
            throw new Error('Command cannot be empty');
        }

        try {
            // Parse command parts
            const parts = this.parseCommandParts(trimmed);
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
                
                case 'subscribe':
                    return await this.handleSubscribeCommand(args);
                
                case 'unsubscribe':
                    return await this.handleUnsubscribeCommand(args);
                
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
     * Handle create stream <name> or create flow <name> [ttl(<duration>)] from <stream> | ...
     */
    static async handleCreateCommand(args) {
        if (args.length === 0) {
            throw new Error('Usage: create stream <name> OR create flow <name> [ttl(<duration>)] from <stream> | ...');
        }

        const subcommand = args[0].toLowerCase();
        
        if (subcommand === 'stream') {
            if (args.length !== 2) {
                throw new Error('Usage: create stream <name>');
            }
            
            const streamName = args[1];
            streamManager.createStream(streamName);
            
            return {
                type: 'command',
                success: true,
                result: { streamName },
                message: `Stream '${streamName}' created successfully`
            };
        } else if (subcommand === 'flow') {
            // This is a flow creation, which is actually a query
            // Return a special type to indicate it should be handled as a query
            return {
                type: 'flow',
                success: true,
                flowCommand: true,
                message: 'Flow creation should be handled as a query'
            };
        } else {
            throw new Error('Usage: create stream <name> OR create flow <name> [ttl(<duration>)] from <stream> | ...');
        }
    }

    /**
     * Handle delete stream <name> or delete flow <name>
     */
    static async handleDeleteCommand(args) {
        if (args.length !== 2) {
            throw new Error('Usage: delete stream <name> OR delete flow <name>');
        }

        const subcommand = args[0].toLowerCase();
        const name = args[1];
        
        if (subcommand === 'stream') {
            streamManager.deleteStream(name);
            
            return {
                type: 'command',
                success: true,
                result: { streamName: name },
                message: `Stream '${name}' deleted successfully`
            };
        } else if (subcommand === 'flow') {
            // Import queryEngine to handle flow deletion
            const { queryEngine } = await import('../core/query-engine.js');
            const result = queryEngine.stopFlowByName(name);
            
            if (result.success) {
                return {
                    type: 'command',
                    success: true,
                    result: { flowName: name },
                    message: `Flow '${name}' deleted successfully`
                };
            } else {
                throw new Error(result.message);
            }
        } else {
            throw new Error('Usage: delete stream <name> OR delete flow <name>');
        }
    }

    /**
     * Handle flush <name>
     */
    static async handleFlushCommand(args) {
        if (args.length !== 1) {
            throw new Error('Usage: flush <stream_name>');
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
     * Handle insert into <name> <data>
     */
    static async handleInsertCommand(args) {
        if (args.length < 3 || args[0].toLowerCase() !== 'into') {
            throw new Error('Usage: insert into <stream_name> <json_data>');
        }

        const streamName = args[1];
        const dataText = args.slice(2).join(' ');

        // Parse the JSON data (with support for unquoted keys)
        let data;
        try {
            data = this.parseJSONWithUnquotedKeys(dataText);
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
     * Handle list streams or list flows
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
        } else if (args[0].toLowerCase() === 'flows') {
            // Import queryEngine to handle flow listing
            const { queryEngine } = await import('../core/query-engine.js');
            const flows = queryEngine.getActiveFlows();
            
            return {
                type: 'command',
                success: true,
                result: { flows },
                message: `Found ${flows.length} active flow(s)`
            };
        } else if (args[0].toLowerCase() === 'subscriptions') {
            const subscriptions = streamManager.getSubscriptions();
            
            return {
                type: 'command',
                success: true,
                result: { subscriptions },
                message: `Found ${subscriptions.length} active subscription(s)`
            };
        }

        throw new Error('Usage: list streams OR list flows OR list subscriptions');
    }

    /**
     * Handle info <name> or info
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

        throw new Error('Usage: info [stream_name]');
    }

    /**
     * Handle subscribe <stream_name>
     */
    static async handleSubscribeCommand(args) {
        if (args.length !== 1) {
            throw new Error('Usage: subscribe <stream_name>');
        }

        const streamName = args[0];
        
        try {
            const subscriptionId = streamManager.subscribeToStream(streamName, 
                (message) => {
                    const { data, streamName: actualStreamName } = message;
                    console.log(`📡 [${actualStreamName}]:`, data);
                }
            );
            
            return {
                type: 'command',
                success: true,
                result: { streamName, subscriptionId },
                message: `Subscribed to stream '${streamName}' with ID ${subscriptionId}`
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Handle unsubscribe <subscription_id>
     */
    static async handleUnsubscribeCommand(args) {
        if (args.length !== 1) {
            throw new Error('Usage: unsubscribe <subscription_id>');
        }

        const subscriptionId = parseInt(args[0]);
        if (isNaN(subscriptionId)) {
            throw new Error('Subscription ID must be a number');
        }
        
        const success = streamManager.unsubscribeFromStream(subscriptionId);
        
        if (success) {
            return {
                type: 'command',
                success: true,
                result: { subscriptionId },
                message: `Unsubscribed from subscription ID ${subscriptionId}`
            };
        } else {
            throw new Error(`Subscription ID ${subscriptionId} not found`);
        }
    }

    /**
     * Parse command into parts, handling JSON objects and arrays properly
     */
    static parseCommandParts(command) {
        const parts = [];
        let current = '';
        let inJson = false;
        let braceCount = 0;
        let bracketCount = 0;
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
                if (braceCount === 0 && bracketCount === 0) {
                    inJson = false;
                }
                continue;
            }

            if (char === '[') {
                inJson = true;
                bracketCount++;
                current += char;
                continue;
            }

            if (char === ']') {
                bracketCount--;
                current += char;
                if (braceCount === 0 && bracketCount === 0) {
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
     * Check if a line is a command (vs a flow definition)
     */
    static isCommand(line) {
        const trimmed = line.trim();
        // Commands start with these keywords
        return /^(create\s+stream|insert\s+into|delete\s+(stream|flow)|flush|list|info|subscribe|unsubscribe)\b/.test(trimmed);
    }

    /**
     * Check if a line is a flow definition
     */
    static isFlow(line) {
        const trimmed = line.trim();
        return /^create\s+flow\b/.test(trimmed);
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

    /**
     * Parse TTL from a flow command
     * Returns { ttlSeconds: number | null, flowName: string, queryPart: string }
     */
    static parseFlowCommand(flowCommand) {
        const trimmed = flowCommand.trim();
        
        // Match: create flow <name> [ttl(<duration>)] from <stream> | ...
        const match = trimmed.match(/^create\s+flow\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s+ttl\(([^)]+)\))?\s+from\s+(.+)$/i);
        
        if (!match) {
            throw new Error('Invalid flow syntax. Use: create flow <name> [ttl(<duration>)] from <stream> | ...');
        }
        
        const [, flowName, ttlStr, queryPart] = match;
        
        let ttlSeconds = null;
        if (ttlStr) {
            try {
                ttlSeconds = DurationParser.parse(ttlStr);
            } catch (error) {
                throw new Error(`Invalid TTL duration: ${error.message}`);
            }
        }
        
        return {
            flowName,
            ttlSeconds,
            queryPart
        };
    }

    /**
     * Parse JSON with support for unquoted keys (JavaScript object literal style)
     */
    static parseJSONWithUnquotedKeys(jsonString) {
        // First try regular JSON.parse in case it's already properly quoted
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            // If that fails, try to fix unquoted keys
            try {
                // Replace unquoted keys with quoted keys
                // This regex finds identifiers followed by a colon (but not inside strings)
                const fixedJson = jsonString.replace(
                    /(^|[\s,{\[])(\w+)(\s*):/g,
                    '$1"$2"$3:'
                );
                
                return JSON.parse(fixedJson);
            } catch (secondError) {
                // If both attempts fail, throw the original error
                throw error;
            }
        }
    }
}

export default CommandParser;