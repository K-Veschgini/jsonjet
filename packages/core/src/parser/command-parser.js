import DurationParser from '../utils/duration-parser.js';

/**
 * Command Parser - Handles unified command syntax
 * Supports: create stream, insert into, delete flow, list flows, etc.
 */
export class CommandParser {
    
    /**
     * Parse and execute a command
     * Returns { type: 'command', result: any, message: string }
     */
    static async executeCommand(commandText, customStreamManager, queryEngine = null) {
        if (!customStreamManager) {
            throw new Error('CommandParser.executeCommand requires a streamManager parameter');
        }
        const sm = customStreamManager;
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
                    return await this.handleCreateCommand(args, sm, queryEngine);
                
                case 'delete':
                    return await this.handleDeleteCommand(args, sm, queryEngine);
                
                case 'insert':
                    return await this.handleInsertCommand(args, sm);
                
                case 'flush':
                    return await this.handleFlushCommand(args, sm);
                
                case 'list':
                    return await this.handleListCommand(args, sm, queryEngine);
                
                case 'info':
                    return await this.handleInfoCommand(args, sm);
                
                case 'subscribe':
                    return await this.handleSubscribeCommand(args, sm);
                
                case 'unsubscribe':
                    return await this.handleUnsubscribeCommand(args, sm);
                
                default:
                    throw new Error(`Unknown command: ${action}`);
            }
        } catch (error) {
            sm.initializeLogger();
            const errorCode = error.code || 'COMMAND_FAILED';
            return sm.logger.createErrorResponse(
                errorCode,
                error.message,
                trimmed
            );
        }
    }

    /**
     * Handle create [or replace | if not exists] stream <name> or create flow <name> [ttl(<duration>)] as\n<stream> | ...
     */
    static async handleCreateCommand(args, sm, queryEngine = null) {
        if (args.length === 0) {
            throw new Error('Usage: create [or replace | if not exists] stream <name> OR create flow <name> [ttl(<duration>)] as\\n<stream> | ...');
        }

        // Parse optional modifiers: "or replace" or "if not exists"
        let modifier = null;
        let remainingArgs = [...args];
        
        if (args.length >= 3 && args[0].toLowerCase() === 'or' && args[1].toLowerCase() === 'replace') {
            modifier = 'or_replace';
            remainingArgs = args.slice(2);
        } else if (args.length >= 4 && args[0].toLowerCase() === 'if' && args[1].toLowerCase() === 'not' && args[2].toLowerCase() === 'exists') {
            modifier = 'if_not_exists';
            remainingArgs = args.slice(3);
        }

        const subcommand = remainingArgs[0]?.toLowerCase();
        
        if (subcommand === 'stream') {
            if (remainingArgs.length !== 2) {
                throw new Error('Usage: create [or replace | if not exists] stream <name>');
            }
            
            const streamName = remainingArgs[1];
            
            // Validate stream name
            if (!this.isValidIdentifier(streamName)) {
                throw new Error(`Invalid stream name '${streamName}'. Stream names must start with a letter or underscore and contain only letters, numbers, and underscores.`);
            }
            
            try {
                // Check if stream exists
                const exists = sm.hasStream(streamName);
                
                if (exists) {
                    if (modifier === 'or_replace') {
                        // Delete existing stream and create new one
                        sm.deleteStream(streamName);
                        sm.createStream(streamName);
                        return {
                            type: 'command',
                            success: true,
                            result: { streamName },
                            message: `Stream '${streamName}' replaced successfully`
                        };
                    } else if (modifier === 'if_not_exists') {
                        // Do nothing, return success
                        return {
                            type: 'command',
                            success: true,
                            result: { streamName },
                            message: `Stream '${streamName}' already exists (no action taken)`
                        };
                    } else {
                        // Regular create - should fail
                        throw new Error(`Stream '${streamName}' already exists. Use 'create or replace stream ${streamName}' to replace it or 'create if not exists stream ${streamName}' to ignore if exists.`);
                    }
                } else {
                    // Stream doesn't exist, create it
                    sm.createStream(streamName);
                    sm.initializeLogger();
                    return sm.logger.createSuccessResponse(
                        'stream',
                        `Stream '${streamName}' created successfully`,
                        { streamName }
                    );
                }
            } catch (error) {
                throw error; // Re-throw any errors from stream manager
            }
        } else if (subcommand === 'lookup') {
            return await this.handleCreateLookupCommand(remainingArgs.slice(1), sm, modifier, queryEngine);
        } else {
            throw new Error('Usage: create [or replace | if not exists] stream <name> OR create flow <name> [ttl(<duration>)] as\\n<stream> | ... OR create [or replace] lookup <name> = <value>');
        }
    }

    /**
     * Handle create [or replace] lookup <name> = <value>
     */
    static async handleCreateLookupCommand(args, sm, modifier = null, queryEngine = null) {
        // Parse: <name> = <value>
        if (args.length < 3) {
            throw new Error('Usage: create [or replace] lookup <name> = <value>');
        }
        
        const lookupName = args[0];
        const assignOp = args[1];
        const valueText = args.slice(2).join(' ');
        
        if (assignOp !== '=') {
            throw new Error('Usage: create [or replace] lookup <name> = <value>');
        }
        
        // Validate lookup name
        if (!this.isValidIdentifier(lookupName)) {
            throw new Error(`Invalid lookup name '${lookupName}'. Lookup names must start with a letter or underscore and contain only letters, numbers, and underscores.`);
        }
        
        // Parse lookup value
        let lookupValue;
        try {
            lookupValue = this.parseJSONWithUnquotedKeys(valueText);
        } catch (error) {
            throw new Error(`Invalid lookup value: ${error.message}`);
        }
        
        // Get registry from query engine
        if (!queryEngine || !queryEngine.registry) {
            throw new Error('Registry not available');
        }
        
        try {
            const exists = queryEngine.registry.hasLookup(lookupName);
            
            if (exists) {
                if (modifier === 'or_replace') {
                    // Update existing lookup
                    queryEngine.registry.updateLookup(lookupName, lookupValue);
                    return {
                        type: 'command',
                        success: true,
                        result: { lookupName, lookupValue },
                        message: `Lookup '${lookupName}' replaced successfully`
                    };
                } else {
                    // Regular create - should fail
                    throw new Error(`Lookup '${lookupName}' already exists. Use 'create or replace lookup ${lookupName} = <value>' to replace it.`);
                }
            } else {
                // Lookup doesn't exist, create it
                queryEngine.registry.registerLookup(lookupName, lookupValue);
                sm.initializeLogger();
                return sm.logger.createSuccessResponse(
                    'lookup',
                    `Lookup '${lookupName}' created successfully`,
                    { lookupName, lookupValue }
                );
            }
        } catch (error) {
            throw error; // Re-throw any errors from registry
        }
    }

    /**
     * Handle delete stream <name> or delete flow <name>
     */
    static async handleDeleteCommand(args, sm, queryEngine = null) {
        if (args.length !== 2) {
            throw new Error('Usage: delete stream <name> OR delete flow <name> OR delete lookup <name>');
        }

        const subcommand = args[0].toLowerCase();
        const name = args[1];
        
        // Validate identifier name
        if (!this.isValidIdentifier(name)) {
            throw new Error(`Invalid ${subcommand} name '${name}'. Names must start with a letter or underscore and contain only letters, numbers, and underscores.`);
        }
        
        if (subcommand === 'stream') {
            sm.deleteStream(name);
            
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
        } else if (subcommand === 'lookup') {
            // Get registry from query engine
            if (!queryEngine || !queryEngine.registry) {
                throw new Error('Registry not available');
            }
            
            const deleted = queryEngine.registry.deleteLookup(name);
            
            if (deleted) {
                return {
                    type: 'command',
                    success: true,
                    result: { lookupName: name },
                    message: `Lookup '${name}' deleted successfully`
                };
            } else {
                throw new Error(`Lookup '${name}' does not exist`);
            }
        } else {
            throw new Error('Usage: delete stream <name> OR delete flow <name> OR delete lookup <name>');
        }
    }

    /**
     * Handle flush <name>
     */
    static async handleFlushCommand(args, sm) {
        if (args.length !== 1) {
            throw new Error('Usage: flush <stream_name>');
        }

        const streamName = args[0];
        
        // Validate stream name
        if (!this.isValidIdentifier(streamName)) {
            throw new Error(`Invalid stream name '${streamName}'. Stream names must start with a letter or underscore and contain only letters, numbers, and underscores.`);
        }
        
        sm.flushStream(streamName);
        
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
    static async handleInsertCommand(args, sm) {
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

        await sm.insertIntoStream(streamName, data);
        
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
    static async handleListCommand(args, sm, queryEngine = null) {
        if (args.length === 0 || args[0].toLowerCase() === 'streams') {
            const streams = sm.listStreams();
            
            // Format streams output for better display
            let streamsOutput = `Found ${streams.length} stream(s)`;
            if (streams.length > 0) {
                streamsOutput += ':\n';
                streams.forEach((streamName, index) => {
                    const info = sm.getStreamInfo(streamName);
                    const docCount = info ? info.documentCount : 0;
                    streamsOutput += `${index + 1}. ${streamName} (${docCount} documents)`;
                    if (index < streams.length - 1) streamsOutput += '\n';
                });
            }
            
            return {
                type: 'command',
                success: true,
                result: { streams },
                message: streamsOutput
            };
        } else if (args[0].toLowerCase() === 'flows') {
            // Use passed queryEngine or try to import global one
            let qe = queryEngine;
            if (!qe) {
                const { queryEngine: globalQueryEngine } = await import('../core/query-engine.js');
                qe = globalQueryEngine;
            }
            
            if (!qe) {
                throw new Error('QueryEngine not available for listing flows');
            }
            
            const flows = qe.getActiveFlows();
            
            // Format flows output for better display
            let flowsOutput = `Found ${flows.length} active flow(s)`;
            if (flows.length > 0) {
                flowsOutput += ':\n';
                flows.forEach((flow, index) => {
                    const ttlInfo = flow.ttlSeconds ? ` (TTL: ${flow.ttlSeconds}s remaining)` : '';
                    flowsOutput += `${index + 1}. ${flow.flowName}: ${flow.sourceName} -> ${flow.sinks?.map(s => s.name).join(', ')}${ttlInfo}`;
                    if (index < flows.length - 1) flowsOutput += '\n';
                });
            }
            
            return {
                type: 'command',
                success: true,
                result: { flows },
                message: flowsOutput
            };
        } else if (args[0].toLowerCase() === 'subscriptions') {
            const subscriptions = sm.getSubscriptions();
            
            // Format subscriptions output for better display
            let subscriptionsOutput = `Found ${subscriptions.length} active subscription(s)`;
            if (subscriptions.length > 0) {
                subscriptionsOutput += ':\n';
                subscriptions.forEach((sub, index) => {
                    subscriptionsOutput += `${index + 1}. ID ${sub.id}: ${sub.streamName}`;
                    if (index < subscriptions.length - 1) subscriptionsOutput += '\n';
                });
            }
            
            return {
                type: 'command',
                success: true,
                result: { subscriptions },
                message: subscriptionsOutput
            };
        } else if (args[0].toLowerCase() === 'lookups') {
            // Get registry from query engine
            if (!queryEngine || !queryEngine.registry) {
                throw new Error('Registry not available');
            }
            
            const lookups = queryEngine.registry.getAllLookups();
            const lookupNames = Object.keys(lookups);
            
            // Format lookups output for better display
            let lookupsOutput = `Found ${lookupNames.length} lookup(s)`;
            if (lookupNames.length > 0) {
                lookupsOutput += ':\n';
                lookupNames.forEach((name, index) => {
                    // Show a preview of the value (truncate if too long)
                    let valuePreview = JSON.stringify(lookups[name]);
                    if (valuePreview.length > 50) {
                        valuePreview = valuePreview.substring(0, 47) + '...';
                    }
                    lookupsOutput += `${index + 1}. ${name} = ${valuePreview}`;
                    if (index < lookupNames.length - 1) lookupsOutput += '\n';
                });
            }
            
            return {
                type: 'command',
                success: true,
                result: { lookups },
                message: lookupsOutput
            };
        }

        throw new Error('Usage: list streams OR list flows OR list subscriptions OR list lookups');
    }

    /**
     * Handle info <name> or info
     */
    static async handleInfoCommand(args, sm) {
        if (args.length === 0) {
            // Show info for all streams
            const info = sm.getAllStreamInfo();
            return {
                type: 'command',
                success: true,
                result: { info },
                message: `Stream information retrieved`
            };
        } else if (args.length === 1) {
            // Show info for specific stream
            const streamName = args[0];
            
            // Validate stream name
            if (!this.isValidIdentifier(streamName)) {
                throw new Error(`Invalid stream name '${streamName}'. Stream names must start with a letter or underscore and contain only letters, numbers, and underscores.`);
            }
            
            const info = sm.getStreamInfo(streamName);
            
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
    static async handleSubscribeCommand(args, sm) {
        if (args.length !== 1) {
            throw new Error('Usage: subscribe <stream_name>');
        }

        const streamName = args[0];
        
        // Validate stream name
        if (!this.isValidIdentifier(streamName)) {
            throw new Error(`Invalid stream name '${streamName}'. Stream names must start with a letter or underscore and contain only letters, numbers, and underscores.`);
        }
        
        try {
            const subscriptionId = sm.subscribeToStream(streamName, 
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
    static async handleUnsubscribeCommand(args, sm) {
        if (args.length !== 1) {
            throw new Error('Usage: unsubscribe <subscription_id>');
        }

        const subscriptionId = parseInt(args[0]);
        if (isNaN(subscriptionId)) {
            throw new Error('Subscription ID must be a number');
        }
        
        const success = sm.unsubscribeFromStream(subscriptionId);
        
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
        // Commands start with these keywords (but exclude flow creation)
        return /^(create\s+(?:or\s+replace\s+|if\s+not\s+exists\s+)?(?:stream|lookup)|insert\s+into|delete\s+(?:stream|flow|lookup)|flush|list|info|subscribe|unsubscribe)\b/.test(trimmed);
    }

    /**
     * Check if a line is a flow definition
     */
    static isFlow(line) {
        const trimmed = line.trim();
        return /^create\s+(?:or\s+replace\s+|if\s+not\s+exists\s+)?flow\b/.test(trimmed);
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
     * Returns { ttlSeconds: number | null, flowName: string, queryPart: string, modifier: string | null }
     */
    static parseFlowCommand(flowCommand) {
        // Normalize whitespace but preserve line breaks for new syntax
        const trimmed = flowCommand.trim();
        
        // Match: create [or replace | if not exists] flow <name> [ttl(<duration>)] as\n<stream> | ...
        let match = trimmed.match(/^create\s+or\s+replace\s+flow\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s+ttl\(([^)]+)\))?\s+as\s+(.+)$/is);
        let modifier = null;
        
        if (match) {
            modifier = 'or_replace';
        } else {
            match = trimmed.match(/^create\s+if\s+not\s+exists\s+flow\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s+ttl\(([^)]+)\))?\s+as\s+(.+)$/is);
            if (match) {
                modifier = 'if_not_exists';
            } else {
                match = trimmed.match(/^create\s+flow\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s+ttl\(([^)]+)\))?\s+as\s+(.+)$/is);
            }
        }
        
        if (!match) {
            throw new Error('Invalid flow syntax. Use: create [or replace | if not exists] flow <name> [ttl(<duration>)] as\\n<stream> | ...');
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
            queryPart,
            modifier
        };
    }

    /**
     * Validate identifier names (stream names, flow names, etc.)
     * Must start with letter or underscore, contain only letters, numbers, underscores
     */
    static isValidIdentifier(name) {
        if (!name || typeof name !== 'string') {
            return false;
        }
        
        // Check if name matches valid identifier pattern
        return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
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