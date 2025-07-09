// Command rules - dot commands and print statements
import { 
    Dot, Print, Semicolon, Identifier, StringLiteral, NumberLiteral
} from '../tokens/token-registry.js';

export function defineCommandRules() {
    // =============================================================================
    // DOT COMMANDS (.create, .insert, etc.)
    // =============================================================================
    
    this.dotCommand = this.RULE("dotCommand", () => {
        this.CONSUME(Dot);
        this.CONSUME(Identifier, { LABEL: "commandName" });
        this.MANY(() => {
            this.SUBRULE(this.commandArgument);
        });
        // Optional semicolon termination
        this.OPTION(() => {
            this.CONSUME(Semicolon);
        });
    });

    this.commandArgument = this.RULE("commandArgument", () => {
        this.OR([
            { ALT: () => this.CONSUME(Identifier) },
            { ALT: () => this.CONSUME(StringLiteral) },
            { ALT: () => this.SUBRULE(this.objectLiteral) },
            { ALT: () => this.SUBRULE(this.arrayLiteral) },
            { ALT: () => this.CONSUME(NumberLiteral) }
        ]);
    });

    // =============================================================================
    // PRINT COMMANDS (.print expression)
    // =============================================================================
    
    this.command = this.RULE("command", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.printCommand) }
        ]);
    });

    this.printCommand = this.RULE("printCommand", () => {
        this.CONSUME(Print);
        this.SUBRULE(this.expression);
    });
}