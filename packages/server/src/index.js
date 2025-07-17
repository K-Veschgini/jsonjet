import { createInstances } from '@resonancedb/core';

/**
 * ResonanceDB Bun Server
 * Provides HTTP API and WebSocket streaming for query execution and stream subscriptions
 */
class ResonanceDBServer {
  constructor(port = 3333) {
    this.port = port;
    this.wsClients = new Map(); // clientId -> { ws, subscriptions: Map<subscriptionId, streamName> }
    this.nextClientId = 1;
    
    // Create JSDB instances
    const { streamManager, queryEngine } = createInstances();
    this.streamManager = streamManager;
    this.queryEngine = queryEngine;
  }

  /**
   * Start the server with HTTP and WebSocket support
   */
  start() {
    const server = Bun.serve({
      port: this.port,
      fetch: this.handleHTTP.bind(this),
      websocket: {
        message: this.handleWSMessage.bind(this),
        open: this.handleWSOpen.bind(this),
        close: this.handleWSClose.bind(this),
      },
    });

    this.server = server;
    console.log(`🚀 ResonanceDB Server running on http://localhost:${this.port}`);
    console.log(`📡 WebSocket endpoint: ws://localhost:${this.port}/ws`);
    return server;
  }

  /**
   * Handle HTTP requests
   */
  async handleHTTP(req) {
    const url = new URL(req.url);
    
    // Enable CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // WebSocket upgrade
    if (url.pathname === '/ws') {
      const success = this.server.upgrade(req);
      if (success) {
        return undefined; // WebSocket upgrade successful
      }
      return new Response('WebSocket upgrade failed', { status: 400 });
    }

    // API Routes
    try {
      let response;
      
      switch (url.pathname) {
        case '/api/execute':
          response = await this.handleExecute(req);
          break;
        case '/api/streams':
          response = await this.handleStreams(req);
          break;
        case '/api/status':
          response = await this.handleStatus(req);
          break;
        default:
          response = new Response('Not Found', { status: 404 });
      }

      // Add CORS headers to response
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      console.error('HTTP Error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Handle query/command execution
   */
  async handleExecute(req) {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      const result = await this.queryEngine.executeStatement(query);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Handle streams listing
   */
  async handleStreams(req) {
    if (req.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const streams = this.streamManager.listStreams();
      return new Response(JSON.stringify({ streams }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Handle server status
   */
  async handleStatus(req) {
    if (req.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    const status = {
      status: 'running',
      streams: this.streamManager.listStreams().length,
      activeQueries: this.queryEngine.getActiveFlows().length,
      wsConnections: this.wsClients.size,
      uptime: process.uptime()
    };

    return new Response(JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Handle WebSocket connection open
   */
  handleWSOpen(ws) {
    const clientId = this.nextClientId++;
    this.wsClients.set(clientId, {
      ws,
      subscriptions: new Map() // subscriptionId -> streamName
    });
    
    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      message: 'Connected to ResonanceDB WebSocket'
    }));

    console.log(`📡 WebSocket client ${clientId} connected`);
  }

  /**
   * Handle WebSocket message
   */
  async handleWSMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      const clientId = this.getClientId(ws);
      
      if (!clientId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Client not found' }));
        return;
      }

      switch (data.type) {
        case 'subscribe':
          await this.handleWSSubscribe(ws, clientId, data);
          break;
        case 'unsubscribe':
          await this.handleWSUnsubscribe(ws, clientId, data);
          break;
        case 'insert':
          await this.handleWSInsert(ws, clientId, data);
          break;
        case 'batch_insert':
          await this.handleWSBatchInsert(ws, clientId, data);
          break;
        default:
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Unknown message type. Supported types: subscribe, unsubscribe, insert, batch_insert' 
          }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  }

  /**
   * Handle WebSocket subscription to a stream
   */
  async handleWSSubscribe(ws, clientId, data) {
    const { streamName } = data;
    
    if (!streamName) {
      ws.send(JSON.stringify({ type: 'error', message: 'Stream name is required' }));
      return;
    }

    try {
      // Subscribe to the stream
      const subscriptionId = this.streamManager.subscribeToStream(streamName, (message) => {
        ws.send(JSON.stringify({
          type: 'data',
          streamName: message.streamName,
          data: message.data,
          subscriptionId
        }));
      });

      // Track subscription
      const client = this.wsClients.get(clientId);
      client.subscriptions.set(subscriptionId, streamName);

      ws.send(JSON.stringify({
        type: 'subscribed',
        streamName,
        subscriptionId,
        message: `Subscribed to stream '${streamName}'`
      }));

      console.log(`📡 Client ${clientId} subscribed to stream '${streamName}' (sub: ${subscriptionId})`);
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  }

  /**
   * Handle WebSocket unsubscription
   */
  async handleWSUnsubscribe(ws, clientId, data) {
    const { subscriptionId } = data;
    
    if (!subscriptionId) {
      ws.send(JSON.stringify({ type: 'error', message: 'Subscription ID is required' }));
      return;
    }

    try {
      // Unsubscribe from the stream
      this.streamManager.unsubscribeFromStream(subscriptionId);

      // Remove from client tracking
      const client = this.wsClients.get(clientId);
      const streamName = client.subscriptions.get(subscriptionId);
      client.subscriptions.delete(subscriptionId);

      ws.send(JSON.stringify({
        type: 'unsubscribed',
        subscriptionId,
        streamName,
        message: `Unsubscribed from subscription ${subscriptionId}`
      }));

      console.log(`📡 Client ${clientId} unsubscribed from subscription ${subscriptionId}`);
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  }

  /**
   * Handle WebSocket single record insert
   */
  async handleWSInsert(ws, clientId, data) {
    const { target, data: recordData } = data;
    
    if (!target) {
      ws.send(JSON.stringify({ 
        type: 'insert_response', 
        success: false, 
        error: 'Target stream name is required' 
      }));
      return;
    }

    if (!recordData || typeof recordData !== 'object') {
      ws.send(JSON.stringify({ 
        type: 'insert_response', 
        success: false, 
        error: 'Record data is required and must be an object' 
      }));
      return;
    }

    try {
      // Execute insert command via query engine
      const insertQuery = `insert into ${target}`;
      await this.queryEngine.executeStatement(insertQuery, [recordData]);

      ws.send(JSON.stringify({
        type: 'insert_response',
        success: true,
        count: 1,
        target,
        message: `Record inserted successfully into '${target}'`
      }));

      console.log(`📝 Client ${clientId} inserted record into '${target}'`);
    } catch (error) {
      ws.send(JSON.stringify({ 
        type: 'insert_response', 
        success: false, 
        error: error.message 
      }));
    }
  }

  /**
   * Handle WebSocket batch record insert
   */
  async handleWSBatchInsert(ws, clientId, data) {
    const { target, data: recordsData } = data;
    
    if (!target) {
      ws.send(JSON.stringify({ 
        type: 'insert_response', 
        success: false, 
        error: 'Target stream name is required' 
      }));
      return;
    }

    if (!Array.isArray(recordsData) || recordsData.length === 0) {
      ws.send(JSON.stringify({ 
        type: 'insert_response', 
        success: false, 
        error: 'Records data is required and must be a non-empty array' 
      }));
      return;
    }

    try {
      // Execute batch insert via query engine
      const insertQuery = `insert into ${target}`;
      await this.queryEngine.executeStatement(insertQuery, recordsData);

      ws.send(JSON.stringify({
        type: 'insert_response',
        success: true,
        count: recordsData.length,
        target,
        message: `${recordsData.length} records inserted successfully into '${target}'`
      }));

      console.log(`📝 Client ${clientId} inserted ${recordsData.length} records into '${target}'`);
    } catch (error) {
      ws.send(JSON.stringify({ 
        type: 'insert_response', 
        success: false, 
        error: error.message 
      }));
    }
  }



  /**
   * Handle WebSocket connection close
   */
  handleWSClose(ws) {
    const clientId = this.getClientId(ws);
    
    if (clientId) {
      const client = this.wsClients.get(clientId);
      
      // Clean up all subscriptions
      for (const [subscriptionId] of client.subscriptions) {
        try {
          this.streamManager.unsubscribeFromStream(subscriptionId);
        } catch (error) {
          console.warn(`Failed to clean up subscription ${subscriptionId}:`, error);
        }
      }
      
      this.wsClients.delete(clientId);
      console.log(`📡 WebSocket client ${clientId} disconnected`);
    }
  }

  /**
   * Get client ID for a WebSocket connection
   */
  getClientId(ws) {
    for (const [clientId, client] of this.wsClients) {
      if (client.ws === ws) {
        return clientId;
      }
    }
    return null;
  }
}

// Start the server if this file is run directly
if (import.meta.main) {
  const server = new ResonanceDBServer(3333);
  server.start();
}

export default ResonanceDBServer; 