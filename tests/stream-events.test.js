import { test, expect } from 'bun:test';
import { StreamManager } from '../src/core/stream-manager.js';

test('Stream Events > should emit created event when stream is created', async () => {
    const streamManager = new StreamManager();
    const events = [];
    
    // Subscribe to stream events
    const unsubscribe = streamManager.onStreamEvent((event, data) => {
        events.push({ event, data });
    });
    
    try {
        // Create a stream
        streamManager.createStream('test_stream');
        
        // Should have received a created event
        expect(events).toHaveLength(1);
        expect(events[0].event).toBe('created');
        expect(events[0].data.streamName).toBe('test_stream');
        expect(events[0].data.streamContainer).toBeDefined();
    } finally {
        unsubscribe();
    }
});

test('Stream Events > should emit deleted event when stream is deleted', async () => {
    const streamManager = new StreamManager();
    const events = [];
    
    // Create a stream first
    streamManager.createStream('test_stream');
    
    // Subscribe to stream events after creation to only catch deletion
    const unsubscribe = streamManager.onStreamEvent((event, data) => {
        events.push({ event, data });
    });
    
    try {
        // Delete the stream
        streamManager.deleteStream('test_stream');
        
        // Should have received a deleted event
        expect(events).toHaveLength(1);
        expect(events[0].event).toBe('deleted');
        expect(events[0].data.streamName).toBe('test_stream');
    } finally {
        unsubscribe();
    }
});

test('Stream Events > should not emit event for system streams starting with _', async () => {
    const streamManager = new StreamManager();
    const events = [];
    
    // Subscribe to stream events
    const unsubscribe = streamManager.onStreamEvent((event, data) => {
        events.push({ event, data });
    });
    
    try {
        // Create system streams manually
        streamManager.createStreamInternal('_log2');
        streamManager.createStreamInternal('_system');
        
        // Should not have received any events
        expect(events).toHaveLength(0);
    } finally {
        unsubscribe();
    }
});