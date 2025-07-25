// Core grammar rules - unified program structure for all statement types
import { 
    Dot, Pipe, Semicolon, Identifier, Create, Or, Replace, If, Not, Exists, 
    Stream, Flow, Lookup, Delete, Insert, Into, Flush, List, Info, Subscribe, Unsubscribe,
    Ttl, LeftParen, RightParen, As, Assign,
    // Import all keywords for use as identifiers
    Where, Select, Scan, Summarize, InsertInto, WriteToFile, AssertOrSaveExpected, Collect,
    By, Over, Step, Iff, Emit, Every, When, On, Change, Group, Update, Using,
    HoppingWindow, TumblingWindow, SlidingWindow, CountWindow,
    HoppingWindowBy, TumblingWindowBy, SlidingWindowBy, SessionWindow, Print
} from '../tokens/token-registry.js';

export function defineCoreCrules() {
    // =============================================================================
    // PROGRAM - Top-level entry point for multi-statement parsing
    // =============================================================================
    
    this.program = this.RULE("program", () => {
        this.OPTION(() => {
            this.SUBRULE(this.programStatementList);
        });
    });

    this.programStatementList = this.RULE("programStatementList", () => {
        this.SUBRULE(this.programStatement);
        this.MANY(() => {
            this.CONSUME(Semicolon);
            this.OPTION(() => {
                this.SUBRULE2(this.programStatement);
            });
        });
        this.OPTION2(() => {
            this.CONSUME2(Semicolon);
        });
    });

    // =============================================================================
    // PROGRAM STATEMENT - All possible statement types
    // =============================================================================
    
    this.programStatement = this.RULE("programStatement", () => {
        this.OR([
            // Create statements (need to be first to resolve ambiguity)
            { ALT: () => this.SUBRULE(this.createStatement) },
            
            // Other commands
            { ALT: () => this.SUBRULE(this.deleteStatement) },
            { ALT: () => this.SUBRULE(this.insertStatement) },
            { ALT: () => this.SUBRULE(this.flushStatement) },
            { ALT: () => this.SUBRULE(this.listStatement) },
            { ALT: () => this.SUBRULE(this.infoStatement) },
            { ALT: () => this.SUBRULE(this.subscribeStatement) },
            { ALT: () => this.SUBRULE(this.unsubscribeStatement) },
            
            // Dot commands
            { ALT: () => this.SUBRULE(this.dotCommand) },
            { ALT: () => this.SUBRULE(this.command) },
            
            // Pipeline queries
            { ALT: () => this.SUBRULE(this.pipelineQuery) }
        ]);
    });

    // =============================================================================
    // COMMAND STATEMENTS
    // =============================================================================

    this.createStatement = this.RULE("createStatement", () => {
        this.CONSUME(Create);
        this.OPTION(() => {
            this.OR([
                { ALT: () => {
                    this.CONSUME(Or);
                    this.CONSUME(Replace);
                }},
                { ALT: () => {
                    this.CONSUME(If);
                    this.CONSUME(Not);
                    this.CONSUME(Exists);
                }}
            ]);
        });
        this.OR2([
            // Create stream
            { ALT: () => {
                this.CONSUME(Stream);
                this.CONSUME(Identifier, { LABEL: "streamName" });
            }},
            // Create flow
            { ALT: () => {
                this.CONSUME(Flow);
                this.CONSUME2(Identifier, { LABEL: "flowName" });
                this.OPTION2(() => {
                    this.CONSUME(Ttl);
                    this.CONSUME(LeftParen);
                    this.SUBRULE(this.expression, { LABEL: "ttlExpression" });
                    this.CONSUME(RightParen);
                });
                this.CONSUME(As);
                this.SUBRULE(this.pipelineQuery, { LABEL: "flowQuery" });
            }},
            // Create lookup
            { ALT: () => {
                this.CONSUME(Lookup);
                this.CONSUME3(Identifier, { LABEL: "lookupName" });
                this.CONSUME(Assign);
                this.SUBRULE2(this.expression, { LABEL: "lookupValue" });
            }}
        ]);
    });

    this.deleteStatement = this.RULE("deleteStatement", () => {
        this.CONSUME(Delete);
        this.OR([
            { ALT: () => {
                this.CONSUME(Stream);
                this.CONSUME(Identifier, { LABEL: "streamName" });
            }},
            { ALT: () => {
                this.CONSUME(Flow);
                this.CONSUME2(Identifier, { LABEL: "flowName" });
            }},
            { ALT: () => {
                this.CONSUME(Lookup);
                this.CONSUME3(Identifier, { LABEL: "lookupName" });
            }}
        ]);
    });

    this.insertStatement = this.RULE("insertStatement", () => {
        this.CONSUME(Insert);
        this.CONSUME(Into);
        this.CONSUME(Identifier, { LABEL: "streamName" });
        this.SUBRULE(this.expression, { LABEL: "data" });
    });

    this.flushStatement = this.RULE("flushStatement", () => {
        this.CONSUME(Flush);
        this.CONSUME(Identifier, { LABEL: "streamName" });
    });

    this.listStatement = this.RULE("listStatement", () => {
        this.CONSUME(List);
        this.OPTION(() => {
            this.OR([
                { ALT: () => this.CONSUME(Stream, { LABEL: "target" }) },
                { ALT: () => this.CONSUME(Flow, { LABEL: "target" }) },
                { ALT: () => this.CONSUME(Lookup, { LABEL: "target" }) },
                { ALT: () => this.CONSUME(Identifier, { LABEL: "target" }) } // Allow plurals like "flows", "streams", "lookups"
            ]);
        });
    });

    this.infoStatement = this.RULE("infoStatement", () => {
        this.CONSUME(Info);
        this.OPTION(() => {
            this.CONSUME(Identifier, { LABEL: "streamName" });
        });
    });

    this.subscribeStatement = this.RULE("subscribeStatement", () => {
        this.CONSUME(Subscribe);
        this.CONSUME(Identifier, { LABEL: "streamName" });
    });

    this.unsubscribeStatement = this.RULE("unsubscribeStatement", () => {
        this.CONSUME(Unsubscribe);
        this.SUBRULE(this.expression, { LABEL: "subscriptionId" });
    });

    // =============================================================================
    // PIPELINE QUERIES
    // =============================================================================

    this.pipelineQuery = this.RULE("pipelineQuery", () => {
        this.SUBRULE(this.source);
        this.MANY(() => {
            this.CONSUME(Pipe);
            this.SUBRULE(this.operation);
        });
    });

    // Source (data source name) - Accept identifiers + non-problematic keywords that stay as keywords
    this.source = this.RULE("source", () => {
        this.OR([
            { ALT: () => this.CONSUME(Identifier, { LABEL: "sourceName" }) },
            // Non-problematic keywords that don't create ambiguity
            { ALT: () => this.CONSUME(Where, { LABEL: "sourceName" }) },
            { ALT: () => this.CONSUME(Select, { LABEL: "sourceName" }) },
            { ALT: () => this.CONSUME(Scan, { LABEL: "sourceName" }) },
            { ALT: () => this.CONSUME(Summarize, { LABEL: "sourceName" }) },
            { ALT: () => this.CONSUME(Collect, { LABEL: "sourceName" }) },
            { ALT: () => this.CONSUME(Stream, { LABEL: "sourceName" }) },
            { ALT: () => this.CONSUME(Flow, { LABEL: "sourceName" }) }
            // Problematic keywords (delete, info, list, etc.) are converted to Identifier by lexer
        ]);
    });

    // Pipeline operations
    this.operation = this.RULE("operation", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.whereClause) },
            { ALT: () => this.SUBRULE(this.selectClause) },
            { ALT: () => this.SUBRULE(this.scanClause) },
            { ALT: () => this.SUBRULE(this.summarizeClause) },
            { ALT: () => this.SUBRULE(this.insertIntoClause) },
            { ALT: () => this.SUBRULE(this.writeToFileClause) },
            { ALT: () => this.SUBRULE(this.assertOrSaveExpectedClause) },
            { ALT: () => this.SUBRULE(this.collectClause) }
        ]);
    });

    // =============================================================================
    // ENTRY POINT
    // =============================================================================
    
    // Main query entry point
    this.query = this.RULE("query", () => {
        this.SUBRULE(this.programStatement);
    });
}