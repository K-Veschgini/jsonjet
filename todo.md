need now() func
need warning or error when monotonic assumed fields are not monotonic. 
better erros also when query fails, what query exactly. 

streams dont apepar in ui on create but on insert.

undefined must not appear in docs.

delete all stram shall not touch _ streams

remove flush // _log, numbers, results from console and add a real flush all?

large number of streams, no space for docs view

make sure functions (aggs and sclaras dont have same name and not called like a built in operator)

// Control flow functions
export const Iff = createToken({ name: "Iff", pattern: /iff/i });
export const Emit = createToken({ name: "Emit", pattern: /emit/i });


return {
                type: 'flow',
                success: true,
                flowCommand: true,
                message: 'Flow creation should be handled as a query'
            };


export function createQueryFunction(queryText) {
    const result = transpileQuery(queryText);
    
    return {
        execute: async function(data) {
            // Import modules dynamically
            const { Stream } = await import('../../../core/stream.js');
            const Operators = await import('../../../operators/index.js');
            const { safeGet } = await import('../../../utils/safe-access.js');
            const { functionRegistry } = await import('../../../functions/index.js');
            const { AggregationObject } = await import('../../../aggregations/core/aggregation-object.js');
            const { AggregationExpression } = await import('../../../aggregations/core/aggregation-expression.js');


yes and get rid of non sclaing statements. sum and such should not be part of grammar. but dont forget that only in      │
│   summarize the expressions needs to transpile to an aggregation expression.


command parser is weird. why not use grammar?