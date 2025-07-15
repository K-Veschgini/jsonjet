export class Aggregation {
    constructor() {
        // Initialize aggregation state
    }
    
    push(object) {
        // Accumulate this object into the aggregation
        throw new Error('Must implement push method');
    }
    
    getResult() {
        // Return the final aggregated result
        throw new Error('Must implement getResult method');
    }
    
    reset() {
        // Reset aggregation state to start fresh
        throw new Error('Must implement reset method');
    }
    
    clone() {
        // Create a copy of this aggregation
        throw new Error('Must implement clone method');
    }
} 