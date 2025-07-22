
export class VisitorUtils {
    /**
     * Safely visit a context node, handling undefined/null cases
     */
    static safeVisit(visitor, ctx, defaultValue = '') {
        if (!ctx) return defaultValue;
        return visitor.visit(ctx);
    }

    /**
     * Visit an array of context nodes and join results
     */
    static visitArray(visitor, ctxArray, separator = ', ') {
        if (!ctxArray || ctxArray.length === 0) return '';
        return ctxArray.map(ctx => visitor.visit(ctx)).join(separator);
    }

    /**
     * Extract token image safely
     */
    static getTokenImage(token) {
        return token && token[0] ? token[0].image : '';
    }

    /**
     * Create a safe property access string
     */
    static createSafeAccess(target, property) {
        return `safeGet(${target}, '${property}')`;
    }

    /**
     * Wrap expression in parentheses if needed for precedence
     */
    static wrapIfNeeded(expression, needsWrapping = true) {
        if (!needsWrapping || !expression) return expression;
        return `(${expression})`;
    }

    /**
     * Create object literal with proper syntax (wrapped in parentheses)
     */
    static createObjectLiteral(properties) {
        if (!properties || properties.length === 0) return '{}';
        const propertiesStr = Array.isArray(properties) ? properties.join(', ') : properties;
        return `{ ${propertiesStr} }`;
    }
}