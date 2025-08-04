// Literal rules - objects, arrays, functions, properties
import { 
    LeftBrace, RightBrace, LeftBracket, RightBracket, LeftParen, RightParen,
    Comma, Colon, Spread, Identifier, StringLiteral, Minus, Multiply,
    Iff, Emit, Assign,
    // Import all keywords for use as property keys
    Where, Select, Scan, Summarize, InsertInto, WriteToFile, AssertOrSaveExpected,
    By, Over, Step, Every, When, On, Change, Group, Update, Using,
    HoppingWindow, TumblingWindow, SlidingWindow, CountWindow,
    HoppingWindowBy, TumblingWindowBy, SlidingWindowBy, SessionWindow,
    Create, Or, Replace, If, Not, Exists, Stream, Flow, Delete, Insert, Into,
    Flush, List, Info, Subscribe, Unsubscribe, Ttl, As
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
            // Spread all: ...*
            { ALT: () => {
                this.CONSUME(Spread);
                this.CONSUME(Multiply, { LABEL: "spreadAll" });
            }},
            // Spread syntax: ...expr
            { ALT: () => {
                this.CONSUME2(Spread);
                this.SUBRULE(this.expression, { LABEL: "spreadExpression" });
            }},
            // Exclusion syntax: -field
            { ALT: () => {
                this.CONSUME(Minus);
                this.CONSUME(Identifier, { LABEL: "excludedProperty" });
            }},
            // Key-value pair: key: value
            { ALT: () => {
                this.SUBRULE(this.propertyKey);
                this.CONSUME(Colon);
                this.SUBRULE2(this.expression, { LABEL: "propertyValue" });
            }},
            // Shorthand: just identifier (becomes key: key)
            { ALT: () => {
                this.CONSUME2(Identifier, { LABEL: "shorthandProperty" });
            }}
        ]);
    });

    // Property key: identifier or string literal - now elegant!
    // Context-sensitive lexer automatically converts keywords to identifiers in object context
    this.propertyKey = this.RULE("propertyKey", () => {
        this.OR([
            { ALT: () => this.CONSUME(Identifier) },
            { ALT: () => this.CONSUME(StringLiteral) },
            // Allow keywords as property names
            { ALT: () => this.CONSUME(Step) },
            { ALT: () => this.CONSUME(Where) },
            { ALT: () => this.CONSUME(Select) },
            { ALT: () => this.CONSUME(Scan) },
            { ALT: () => this.CONSUME(Summarize) },
            { ALT: () => this.CONSUME(By) },
            { ALT: () => this.CONSUME(Over) },
            { ALT: () => this.CONSUME(Emit) },
            { ALT: () => this.CONSUME(Every) },
            { ALT: () => this.CONSUME(When) },
            { ALT: () => this.CONSUME(On) },
            { ALT: () => this.CONSUME(Change) },
            { ALT: () => this.CONSUME(Group) },
            { ALT: () => this.CONSUME(Update) },
            { ALT: () => this.CONSUME(Using) }
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
            { ALT: () => this.SUBRULE(this.emitFunction) },
            { ALT: () => this.SUBRULE(this.scalarFunction) }
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

    // Scalar function: functionName(args...)
    this.scalarFunction = this.RULE("scalarFunction", () => {
        this.CONSUME(Identifier, { LABEL: "functionName" });
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
            // Value-based window functions (with _by suffix)
            { ALT: () => this.SUBRULE(this.hoppingWindowByFunction) },
            { ALT: () => this.SUBRULE(this.tumblingWindowByFunction) },
            { ALT: () => this.SUBRULE(this.slidingWindowByFunction) },
            // Count-based window functions
            { ALT: () => this.SUBRULE(this.hoppingWindowFunction) },
            { ALT: () => this.SUBRULE(this.tumblingWindowFunction) },
            { ALT: () => this.SUBRULE(this.slidingWindowFunction) },
            { ALT: () => this.SUBRULE(this.countWindowFunction) },
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
        this.CONSUME(RightParen);
    });

    this.sessionWindowFunction = this.RULE("sessionWindowFunction", () => {
        this.CONSUME(SessionWindow);
        this.CONSUME(LeftParen);
        this.SUBRULE(this.expression, { LABEL: "timeout" });
        this.CONSUME(Comma);
        this.SUBRULE2(this.expression, { LABEL: "valueCallback" });
        this.CONSUME(RightParen);
    });

    // Value-based window functions (with _by suffix)
    this.hoppingWindowByFunction = this.RULE("hoppingWindowByFunction", () => {
        this.CONSUME(HoppingWindowBy);
        this.CONSUME(LeftParen);
        this.SUBRULE(this.expression, { LABEL: "size" });
        this.CONSUME(Comma);
        this.SUBRULE2(this.expression, { LABEL: "hop" });
        this.CONSUME2(Comma);
        this.SUBRULE3(this.expression, { LABEL: "valueCallback" });
        this.CONSUME(RightParen);
    });

    this.tumblingWindowByFunction = this.RULE("tumblingWindowByFunction", () => {
        this.CONSUME(TumblingWindowBy);
        this.CONSUME(LeftParen);
        this.SUBRULE(this.expression, { LABEL: "size" });
        this.CONSUME(Comma);
        this.SUBRULE2(this.expression, { LABEL: "valueCallback" });
        this.CONSUME(RightParen);
    });

    this.slidingWindowByFunction = this.RULE("slidingWindowByFunction", () => {
        this.CONSUME(SlidingWindowBy);
        this.CONSUME(LeftParen);
        this.SUBRULE(this.expression, { LABEL: "size" });
        this.CONSUME(Comma);
        this.SUBRULE2(this.expression, { LABEL: "valueCallback" });
        this.CONSUME(RightParen);
    });

    // Count-based window functions
    this.slidingWindowFunction = this.RULE("slidingWindowFunction", () => {
        this.CONSUME(SlidingWindow);
        this.CONSUME(LeftParen);
        this.SUBRULE(this.expression, { LABEL: "size" });
        this.CONSUME(RightParen);
    });

    this.countWindowFunction = this.RULE("countWindowFunction", () => {
        this.CONSUME(CountWindow);
        this.CONSUME(LeftParen);
        this.SUBRULE(this.expression, { LABEL: "size" });
        this.CONSUME(RightParen);
    });
}