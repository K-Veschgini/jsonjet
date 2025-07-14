// Expression grammar rules - clean, single-syntax approach
import { 
    LogicalOr, LogicalAnd, Equals, NotEquals, LessThan, GreaterThan, 
    LessEquals, GreaterEquals, Plus, Minus, Multiply, Divide,
    LeftParen, RightParen, LeftBracket, RightBracket, Dot,
    StringLiteral, DurationLiteral, NumberLiteral, BooleanLiteral, NullLiteral, Identifier,
    QuestionMark, Colon,
    // Import all keywords for use as identifiers
    Where, Select, Scan, Summarize, InsertInto, WriteToFile, AssertOrSaveExpected, Collect,
    By, Over, Step, Iff, Emit, Every, When, On, Change, Group, Update, Using,
    HoppingWindow, TumblingWindow, SlidingWindow, CountWindow,
    HoppingWindowBy, TumblingWindowBy, SlidingWindowBy, SessionWindow, Print,
    Create, Or, Replace, If, Not, Exists, Stream, Flow, Delete, Insert, Into,
    Flush, List, Info, Subscribe, Unsubscribe, Ttl, As
} from '../tokens/token-registry.js';

export function defineExpressionRules() {
    // =============================================================================
    // LOGICAL EXPRESSIONS
    // =============================================================================
    
    this.expression = this.RULE("expression", () => {
        this.SUBRULE(this.ternaryExpression);
    });

    this.ternaryExpression = this.RULE("ternaryExpression", () => {
        this.SUBRULE(this.orExpression);
        this.OPTION(() => {
            this.CONSUME(QuestionMark);
            this.SUBRULE2(this.orExpression, { LABEL: "trueExpression" });
            this.CONSUME(Colon);
            this.SUBRULE3(this.orExpression, { LABEL: "falseExpression" });
        });
    });

    this.orExpression = this.RULE("orExpression", () => {
        this.SUBRULE(this.andExpression);
        this.MANY(() => {
            this.CONSUME(LogicalOr);
            this.SUBRULE2(this.andExpression);
        });
    });

    this.andExpression = this.RULE("andExpression", () => {
        this.SUBRULE(this.comparisonExpression);
        this.MANY(() => {
            this.CONSUME(LogicalAnd);
            this.SUBRULE2(this.comparisonExpression);
        });
    });

    // =============================================================================
    // COMPARISON EXPRESSIONS (==, !=, <, >, <=, >=)
    // =============================================================================
    
    this.comparisonExpression = this.RULE("comparisonExpression", () => {
        this.SUBRULE(this.arithmeticExpression);
        this.OPTION(() => {
            this.OR([
                { ALT: () => this.CONSUME(Equals) },
                { ALT: () => this.CONSUME(NotEquals) },
                { ALT: () => this.CONSUME(LessThan) },
                { ALT: () => this.CONSUME(GreaterThan) },
                { ALT: () => this.CONSUME(LessEquals) },
                { ALT: () => this.CONSUME(GreaterEquals) }
            ]);
            this.SUBRULE2(this.arithmeticExpression);
        });
    });

    // =============================================================================
    // ARITHMETIC EXPRESSIONS (+, -, *, /)
    // =============================================================================
    
    this.arithmeticExpression = this.RULE("arithmeticExpression", () => {
        this.SUBRULE(this.termExpression);
        this.MANY(() => {
            this.OR([
                { ALT: () => this.CONSUME(Plus) },
                { ALT: () => this.CONSUME(Minus) }
            ]);
            this.SUBRULE2(this.termExpression);
        });
    });

    this.termExpression = this.RULE("termExpression", () => {
        this.SUBRULE(this.primaryExpression);
        this.MANY(() => {
            this.OR([
                { ALT: () => this.CONSUME(Multiply) },
                { ALT: () => this.CONSUME(Divide) }
            ]);
            this.SUBRULE2(this.primaryExpression);
        });
    });

    // =============================================================================
    // PRIMARY EXPRESSIONS (with member access)
    // =============================================================================
    
    this.primaryExpression = this.RULE("primaryExpression", () => {
        this.SUBRULE(this.atomicExpression);
        this.MANY(() => {
            this.OR([
                // Array access: expr[index]
                { ALT: () => {
                    this.CONSUME(LeftBracket);
                    this.SUBRULE(this.expression, { LABEL: "index" });
                    this.CONSUME(RightBracket);
                }},
                // Property access: expr.property
                { ALT: () => {
                    this.CONSUME(Dot);
                    this.CONSUME(Identifier, { LABEL: "property" });
                }}
            ]);
        });
    });

    // =============================================================================
    // ATOMIC EXPRESSIONS (base expressions without operators)
    // =============================================================================
    
    this.atomicExpression = this.RULE("atomicExpression", () => {
        this.OR([
            // Unary expressions: -expr, +expr
            { ALT: () => {
                this.OR2([
                    { ALT: () => this.CONSUME(Minus, { LABEL: "unaryOperator" }) },
                    { ALT: () => this.CONSUME(Plus, { LABEL: "unaryOperator" }) }
                ]);
                this.SUBRULE(this.atomicExpression, { LABEL: "unaryExpression" });
            }},
            { ALT: () => this.SUBRULE(this.functionCall) },
            { ALT: () => this.SUBRULE(this.objectLiteral) },
            { ALT: () => this.SUBRULE(this.arrayLiteral) },
            { ALT: () => this.SUBRULE(this.stepVariable) },
            { ALT: () => this.CONSUME(StringLiteral) },
            { ALT: () => this.CONSUME(DurationLiteral) },
            { ALT: () => this.CONSUME(NumberLiteral) },
            { ALT: () => this.CONSUME(BooleanLiteral) },
            { ALT: () => this.CONSUME(NullLiteral) },
            // Parenthesized expression
            { ALT: () => {
                this.CONSUME(LeftParen);
                this.SUBRULE(this.expression);
                this.CONSUME(RightParen);
            }}
        ]);
    });

    // =============================================================================
    // STEP VARIABLES (for scan operations and field access)
    // =============================================================================
    
    this.stepVariable = this.RULE("stepVariable", () => {
        // Now elegant: any identifier works! Context-sensitive lexer handles keyword conversion
        this.CONSUME(Identifier, { LABEL: "stepOrVariable" });
        this.OPTION(() => {
            this.CONSUME(Dot);
            this.CONSUME2(Identifier, { LABEL: "variableName" });
        });
    });
}