// Literal rules - objects, arrays, functions, properties
import { 
    LeftBrace, RightBrace, LeftBracket, RightBracket, LeftParen, RightParen,
    Comma, Colon, Spread, Identifier, StringLiteral,
    Iff, Emit, Count, Sum, 
    Where, Project, Scan, Step, InsertInto, And, Or, Collect,
    HoppingWindow, TumblingWindow, SessionWindow, Assign
} from '../tokens/token-registry.js';

export function defineLiteralRules() {
    // =============================================================================
    // OBJECT LITERALS
    // =============================================================================
    
    this.objectLiteral = this.RULE("objectLiteral", () => {
        this.CONSUME(LeftBrace);
        this.OPTION(() => {
            this.SUBRULE(this.propertyList);
        });
        this.CONSUME(RightBrace);
    });

    this.propertyList = this.RULE("propertyList", () => {
        this.SUBRULE(this.property);
        this.MANY(() => {
            this.CONSUME(Comma);
            this.SUBRULE2(this.property);
        });
    });

    this.property = this.RULE("property", () => {
        this.OR([
            // Spread syntax: ...expr
            { ALT: () => {
                this.CONSUME(Spread);
                this.SUBRULE(this.expression, { LABEL: "spreadExpression" });
            }},
            // Key-value pair: key: value
            { ALT: () => {
                this.SUBRULE(this.propertyKey);
                this.CONSUME(Colon);
                this.SUBRULE2(this.expression, { LABEL: "propertyValue" });
            }},
            // Shorthand: just identifier (becomes key: key)
            { ALT: () => {
                this.CONSUME(Identifier, { LABEL: "shorthandProperty" });
            }}
        ]);
    });

    // Property key: identifier, string literal, or keywords
    this.propertyKey = this.RULE("propertyKey", () => {
        this.OR([
            { ALT: () => this.CONSUME(Identifier) },
            { ALT: () => this.CONSUME(StringLiteral) },
            // Allow keywords as property names
            { ALT: () => this.CONSUME(Where) },
            { ALT: () => this.CONSUME(Project) },
            { ALT: () => this.CONSUME(Scan) },
            { ALT: () => this.CONSUME(Step) },
            { ALT: () => this.CONSUME(InsertInto) },
            { ALT: () => this.CONSUME(And) },
            { ALT: () => this.CONSUME(Or) },
            { ALT: () => this.CONSUME(Iff) },
            { ALT: () => this.CONSUME(Emit) },
            { ALT: () => this.CONSUME(Collect) },
            { ALT: () => this.CONSUME(Count) },
            { ALT: () => this.CONSUME(Sum) }
        ]);
    });

    // =============================================================================
    // ARRAY LITERALS
    // =============================================================================
    
    this.arrayLiteral = this.RULE("arrayLiteral", () => {
        this.CONSUME(LeftBracket);
        this.OPTION(() => {
            this.SUBRULE(this.elementList);
        });
        this.CONSUME(RightBracket);
    });

    this.elementList = this.RULE("elementList", () => {
        this.SUBRULE(this.expression);
        this.MANY(() => {
            this.CONSUME(Comma);
            this.SUBRULE2(this.expression);
        });
    });

    // =============================================================================
    // FUNCTION CALLS
    // =============================================================================
    
    this.functionCall = this.RULE("functionCall", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.iffFunction) },
            { ALT: () => this.SUBRULE(this.emitFunction) }
        ]);
    });

    // IFF function: iff(condition, value_if_true, value_if_false)
    this.iffFunction = this.RULE("iffFunction", () => {
        this.CONSUME(Iff);
        this.CONSUME(LeftParen);
        this.SUBRULE(this.expression, { LABEL: "condition" });
        this.CONSUME(Comma);
        this.SUBRULE2(this.expression, { LABEL: "trueValue" });
        this.CONSUME2(Comma);
        this.SUBRULE3(this.expression, { LABEL: "falseValue" });
        this.CONSUME(RightParen);
    });

    // EMIT function: emit(value)
    this.emitFunction = this.RULE("emitFunction", () => {
        this.CONSUME(Emit);
        this.CONSUME(LeftParen);
        this.OPTION(() => {
            this.SUBRULE(this.argumentList);
        });
        this.CONSUME(RightParen);
    });

    this.argumentList = this.RULE("argumentList", () => {
        this.SUBRULE(this.expression);
        this.MANY(() => {
            this.CONSUME(Comma);
            this.SUBRULE2(this.expression);
        });
    });

    // =============================================================================
    // WINDOW FUNCTIONS (for summarize operations)
    // =============================================================================
    
    this.windowDefinition = this.RULE("windowDefinition", () => {
        this.CONSUME(Identifier, { LABEL: "windowName" });
        this.CONSUME(Assign);
        this.SUBRULE(this.windowFunctionCall);
    });

    this.windowFunctionCall = this.RULE("windowFunctionCall", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.hoppingWindowFunction) },
            { ALT: () => this.SUBRULE(this.tumblingWindowFunction) },
            { ALT: () => this.SUBRULE(this.sessionWindowFunction) }
        ]);
    });

    this.hoppingWindowFunction = this.RULE("hoppingWindowFunction", () => {
        this.CONSUME(HoppingWindow);
        this.CONSUME(LeftParen);
        this.SUBRULE(this.expression, { LABEL: "size" });
        this.CONSUME(Comma);
        this.SUBRULE2(this.expression, { LABEL: "hop" });
        this.OPTION(() => {
            this.CONSUME2(Comma);
            this.SUBRULE3(this.expression, { LABEL: "timeField" });
        });
        this.CONSUME(RightParen);
    });

    this.tumblingWindowFunction = this.RULE("tumblingWindowFunction", () => {
        this.CONSUME(TumblingWindow);
        this.CONSUME(LeftParen);
        this.SUBRULE(this.expression, { LABEL: "size" });
        this.OPTION(() => {
            this.CONSUME(Comma);
            this.SUBRULE2(this.expression, { LABEL: "timeField" });
        });
        this.CONSUME(RightParen);
    });

    this.sessionWindowFunction = this.RULE("sessionWindowFunction", () => {
        this.CONSUME(SessionWindow);
        this.CONSUME(LeftParen);
        this.SUBRULE(this.expression, { LABEL: "timeout" });
        this.CONSUME(Comma);
        this.SUBRULE2(this.expression, { LABEL: "timeField" });
        this.CONSUME(RightParen);
    });
}