// Core grammar rules - entry points and basic structure
import { 
    Dot, Pipe, Semicolon, Identifier
} from '../tokens/token-registry.js';

export function defineCoreCrules() {
    // Main query rule - entry point for all queries
    this.query = this.RULE("query", () => {
        this.OR([
            // Dot commands (.create, .insert, etc.)
            { ALT: () => this.SUBRULE(this.dotCommand) },
            // Print commands (.print expression)
            { ALT: () => this.SUBRULE(this.command) },
            // Regular query pipeline
            { ALT: () => {
                this.SUBRULE(this.source);
                this.MANY(() => {
                    this.CONSUME(Pipe);
                    this.SUBRULE(this.operation);
                });
                // Optional semicolon termination
                this.OPTION(() => {
                    this.CONSUME(Semicolon);
                });
            }}
        ]);
    });

    // Source (data source name)
    this.source = this.RULE("source", () => {
        this.CONSUME(Identifier, { LABEL: "sourceName" });
    });

    // Pipeline operations
    this.operation = this.RULE("operation", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.whereClause) },
            { ALT: () => this.SUBRULE(this.selectClause) },
            { ALT: () => this.SUBRULE(this.scanClause) },
            { ALT: () => this.SUBRULE(this.summarizeClause) },
            { ALT: () => this.SUBRULE(this.insertIntoClause) },
            { ALT: () => this.SUBRULE(this.collectClause) }
        ]);
    });
}