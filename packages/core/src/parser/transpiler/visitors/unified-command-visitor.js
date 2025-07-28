import { VisitorUtils } from '../core/base-visitor.js';

// =============================================================================
// UNIFIED COMMAND VISITOR MIXIN
// =============================================================================
// Handles all command statements in unified grammar

export const UnifiedCommandVisitorMixin = {
    
    // =============================================================================
    // PROGRAM ENTRY POINTS
    // =============================================================================
    
    query(ctx) {
        // Legacy compatibility - query rule just wraps programStatement
        if (ctx.programStatement) {
            const result = this.visit(ctx.programStatement[0]);
            return result ? [result] : [];
        }
        return [];
    },
    
    program(ctx) {
        if (ctx.programStatementList) {
            return this.visit(ctx.programStatementList);
        }
        return [];
    },

    programStatementList(ctx) {
        const statements = [];
        if (ctx.programStatement) {
            for (const stmt of ctx.programStatement) {
                const result = this.visit(stmt);
                if (result) {
                    statements.push(result);
                }
            }
        }
        return statements;
    },

    programStatement(ctx) {
        // Determine statement type and visit accordingly
        const statementTypes = [
            'createStatement', 'deleteStatement', 'insertStatement', 'flushStatement', 
            'listStatement', 'infoStatement', 'subscribeStatement', 'unsubscribeStatement', 
            'pipelineQuery'
        ];

        for (const type of statementTypes) {
            if (ctx[type]) {
                return {
                    type: type,
                    ast: this.visit(ctx[type])
                };
            }
        }
        return null;
    },

    // =============================================================================
    // COMMAND STATEMENTS
    // =============================================================================

    createStatement(ctx) {
        let modifier = null;
        if (ctx.Or && ctx.Replace) {
            modifier = 'or_replace';
        } else if (ctx.If && ctx.Not && ctx.Exists) {
            modifier = 'if_not_exists';
        }

        // Check if it's a stream or flow creation
        if (ctx.streamName) {
            const streamName = VisitorUtils.getTokenImage(ctx.streamName);
            return {
                command: 'create_stream',
                streamName,
                modifier
            };
        } else if (ctx.flowName) {
            const flowName = VisitorUtils.getTokenImage(ctx.flowName);
            
            let ttlExpression = null;
            if (ctx.ttlExpression) {
                ttlExpression = this.visit(ctx.ttlExpression);
            }

            const flowQuery = this.visit(ctx.flowQuery);

            return {
                command: 'create_flow',
                flowName,
                modifier,
                ttlExpression,
                flowQuery
            };
        } else if (ctx.lookupName) {
            const lookupName = VisitorUtils.getTokenImage(ctx.lookupName);
            const lookupValue = this.visit(ctx.lookupValue);

            return {
                command: 'create_lookup',
                lookupName,
                lookupValue,
                modifier
            };
        }

        return null;
    },

    deleteStatement(ctx) {
        if (ctx.streamName) {
            return {
                command: 'delete_stream',
                streamName: VisitorUtils.getTokenImage(ctx.streamName)
            };
        } else if (ctx.flowName) {
            return {
                command: 'delete_flow',
                flowName: VisitorUtils.getTokenImage(ctx.flowName)
            };
        } else if (ctx.lookupName) {
            return {
                command: 'delete_lookup',
                lookupName: VisitorUtils.getTokenImage(ctx.lookupName)
            };
        }
        return null;
    },

    insertStatement(ctx) {
        const streamName = VisitorUtils.getTokenImage(ctx.streamName);
        
        // Set context for object literal processing
        this._isInsertContext = true;
        const data = this.visit(ctx.data);
        this._isInsertContext = false;

        return {
            command: 'insert',
            streamName,
            data
        };
    },

    flushStatement(ctx) {
        const streamName = VisitorUtils.getTokenImage(ctx.streamName);

        return {
            command: 'flush',
            streamName
        };
    },

    listStatement(ctx) {
        let target = 'streams'; // default
        if (ctx.target) {
            const targetToken = VisitorUtils.getTokenImage(ctx.target);
            if (targetToken === 'flow') {
                target = 'flows';
            } else if (targetToken === 'stream') {
                target = 'streams';
            } else if (targetToken === 'lookup') {
                target = 'lookups';
            }
        }

        return {
            command: 'list',
            target
        };
    },

    infoStatement(ctx) {
        let streamName = null;
        if (ctx.streamName) {
            streamName = VisitorUtils.getTokenImage(ctx.streamName);
        }

        return {
            command: 'info',
            streamName
        };
    },

    subscribeStatement(ctx) {
        const streamName = VisitorUtils.getTokenImage(ctx.streamName);

        return {
            command: 'subscribe',
            streamName
        };
    },

    unsubscribeStatement(ctx) {
        const subscriptionId = this.visit(ctx.subscriptionId);

        return {
            command: 'unsubscribe',
            subscriptionId
        };
    },

    // =============================================================================
    // PIPELINE QUERIES
    // =============================================================================

    pipelineQuery(ctx) {
        const source = this.visit(ctx.source);
        const operations = [];

        if (ctx.operation) {
            for (const op of ctx.operation) {
                operations.push(this.visit(op));
            }
        }

        return {
            type: 'pipeline',
            source,
            operations
        };
    },

    source(ctx) {
        // Extract source name from the sourceName token
        if (ctx.sourceName) {
            const sourceName = VisitorUtils.getTokenImage(ctx.sourceName);
            return {
                sourceName
            };
        }
        return null;
    }
};