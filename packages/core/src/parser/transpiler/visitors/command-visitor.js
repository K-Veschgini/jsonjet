import { VisitorUtils } from '../core/base-visitor.js';

// =============================================================================
// COMMAND VISITOR MIXIN
// =============================================================================
// Handles dot commands and print statements

export const CommandVisitorMixin = {

    // =============================================================================
    // DOT COMMANDS (.create, .insert, etc.)
    // =============================================================================

    dotCommand(ctx) {
        const commandName = VisitorUtils.getTokenImage(ctx.commandName);
        const args = ctx.commandArgument 
            ? VisitorUtils.visitArray(this, ctx.commandArgument, ' ')
            : '';
        
        // Build the command string for the command parser
        const commandText = args ? `.${commandName} ${args}` : `.${commandName}`;
        
        return {
            type: 'dotCommand',
            commandText: commandText
        };
    },

    commandArgument(ctx) {
        // Use a lookup table for cleaner dispatch
        const argumentHandlers = {
            Identifier: () => VisitorUtils.getTokenImage(ctx.Identifier),
            StringLiteral: () => VisitorUtils.getTokenImage(ctx.StringLiteral),
            NumberLiteral: () => VisitorUtils.getTokenImage(ctx.NumberLiteral),
            objectLiteral: () => this.visit(ctx.objectLiteral),
            arrayLiteral: () => this.visit(ctx.arrayLiteral)
        };

        for (const [key, handler] of Object.entries(argumentHandlers)) {
            if (ctx[key]) return handler();
        }
        
        return '';
    },

    // =============================================================================
    // PRINT COMMANDS (.print expression)
    // =============================================================================

    command(ctx) {
        if (ctx.printCommand) {
            return this.visit(ctx.printCommand);
        }
        // Future: handle other commands like .help, .describe, etc.
        return '';
    },

    printCommand(ctx) {
        const expression = this.visit(ctx.expression);
        return `console.log(${expression})`;
    }
};