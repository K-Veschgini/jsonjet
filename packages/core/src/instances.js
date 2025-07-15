// Factory functions for creating instances - no more globals!
import { StreamManager } from './core/stream-manager.js';
import { QueryEngine } from './core/query-engine.js';

/**
 * Create a new StreamManager instance
 */
export function createStreamManager() {
    return new StreamManager();
}

/**
 * Create a new QueryEngine instance with the given StreamManager
 * This now uses the unified QueryEngine that combines batch and single statement processing
 */
export function createQueryEngine(streamManager) {
    return new QueryEngine(streamManager);
}

/**
 * Create both StreamManager and QueryEngine instances together
 */
export function createInstances() {
    const streamManager = createStreamManager();
    const queryEngine = createQueryEngine(streamManager);
    return { streamManager, queryEngine };
}