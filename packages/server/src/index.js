import { createInstances } from '@jsonjet/core';
import { parseArgs } from "util";

/**
 * JSONJet Bun Server
 * Provides HTTP API and WebSocket streaming for query execution and stream subscriptions
 */
class JSONJetServer {
  constructor(options = {}) {
    this.port = options.port || 3333;
    this.host = options.host || 'localhost';
    this.verbose = options.verbose || false;
    const versionString = (typeof VERSION !== 'undefined') ? VERSION : 'development';
    this.version = versionString.startsWith('v') ? versionString.substring(1) : versionString;
    this.wsClients = new Map(); // clientId -> { ws, subscriptions: Map<subscriptionId, streamName> }
    this.nextClientId = 1;
    
    // Create JSDB instances
    const { streamManager, queryEngine } = createInstances();
    this.streamManager = streamManager;
    this.queryEngine = queryEngine;
  }

  /**
   * Log message only if verbose mode is enabled
   */
  log(...args) {
    if (this.verbose) {
      console.log(...args);
    }
  }

  /**
   * Send WebSocket response with optional requestId
   */
  sendWSResponse(ws, response) {
    ws.send(JSON.stringify(response));
  }

  /**
   * Validate insert request data
   */
  validateInsertRequest(data) {
    if (!data.target) {
      throw new Error('Target stream name is required');
    }

    if (!data.data) {
      throw new Error('Data is required');
    }

    // Validate data format - must be object or array of objects
    if (Array.isArray(data.data)) {
      if (data.data.length === 0) {
        throw new Error('Data array cannot be empty');
      }
      for (const item of data.data) {
        if (!item || typeof item !== 'object') {
          throw new Error('All items in data array must be objects');
        }
      }
    } else if (!data.data || typeof data.data !== 'object') {
      throw new Error('Data must be an object or array of objects');
    }
  }

  /**
   * Validate subscribe request data
   */
  validateSubscribeRequest(data) {
    if (!data.streamName) {
      throw new Error('Stream name(s) are required');
    }

    // Allow both single string and array of strings
    if (Array.isArray(data.streamName)) {
      if (data.streamName.length === 0) {
        throw new Error('At least one stream name is required');
      }
      for (const name of data.streamName) {
        if (!name || typeof name !== 'string') {
          throw new Error('All stream names must be non-empty strings');
        }
      }
    } else if (!data.streamName || typeof data.streamName !== 'string') {
      throw new Error('Stream name must be a string or array of strings');
    }
  }

  /**
   * Validate execute request data
   */
  validateExecuteRequest(data) {
    if (!data.query || typeof data.query !== 'string') {
      throw new Error('Query is required and must be a string');
    }
  }

  /**
   * Start the server with HTTP and WebSocket support
   */
  start() {
    const server = Bun.serve({
      port: this.port,
      hostname: this.host,
      fetch: this.handleHTTP.bind(this),
      websocket: {
        message: this.handleWSMessage.bind(this),
        open: this.handleWSOpen.bind(this),
        close: this.handleWSClose.bind(this),
      },
    });

    this.server = server;
    console.log(`{🚀} JSONJet Server v${this.version}`);
    console.log('{')
    console.log(`    running on:         http://${this.host}:${this.port}`);
    console.log(`    WebSocket endpoint: ws://${this.host}:${this.port}/ws`);
    console.log('}')
    console.log(`Licensed under PolyForm Noncommercial License 1.0.0`);
    console.log(`Contact: Prof. Dr. Kambis Veschgini <k.veschgini@oth-aw.de>`);
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
        case '/api/insert':
          response = await this.handleHTTPInsert(req);
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
   * Handle HTTP insert (bypasses query engine for performance)
   */
  async handleHTTPInsert(req) {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { target, data } = await req.json();
      
      if (!target) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Target stream name is required' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (!data) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Data is required' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Handle single record or batch
      if (Array.isArray(data)) {
        // Batch insert
        this.log(`📝 Server: Batch inserting ${data.length} records into '${target}'`);
        for (const record of data) {
          await this.streamManager.insertIntoStream(target, record);
        }
        this.log(`✅ Server: Successfully inserted ${data.length} records into '${target}'`);
        
        return new Response(JSON.stringify({
          success: true,
          count: data.length,
          target,
          message: `${data.length} records inserted successfully into '${target}'`
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // Single record insert
        this.log(`📝 Server: Inserting single record into '${target}'`, data);
        await this.streamManager.insertIntoStream(target, data);
        this.log(`✅ Server: Successfully inserted record into '${target}'`);
        
        return new Response(JSON.stringify({
          success: true,
          count: 1,
          target,
          message: `Record inserted successfully into '${target}'`
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
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
      version: this.version,
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
              message: 'Connected to JSONJet WebSocket'
    }));

    this.log(`📡 WebSocket client ${clientId} connected`);
  }

  /**
   * Handle WebSocket message
   */
  async handleWSMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      const clientId = this.getClientId(ws);
      
      if (!clientId) {
        this.sendWSResponse(ws, { type: 'error', message: 'Client not found' });
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
        case 'execute':
          await this.handleWSExecute(ws, clientId, data);
          break;
        default:
          this.sendWSResponse(ws, { 
            type: 'error', 
            message: 'Unknown message type. Supported types: subscribe, unsubscribe, insert, execute',
            requestId: data.requestId
          });
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      this.sendWSResponse(ws, { type: 'error', message: error.message });
    }
  }

  /**
   * Handle WebSocket subscription to one or more streams
   */
  async handleWSSubscribe(ws, clientId, data) {
    try {
      this.validateSubscribeRequest(data);
      
      const streamNames = Array.isArray(data.streamName) ? data.streamName : [data.streamName];
      const subscriptions = [];
      const client = this.wsClients.get(clientId);

      // Subscribe to each stream
      for (const streamName of streamNames) {
        const subscriptionId = this.streamManager.subscribeToStream(streamName, (message) => {
          this.sendWSResponse(ws, {
            type: 'data',
            streamName: message.streamName,
            data: message.data,
            subscriptionId,
            requestId: data.requestId
          });
        });

        // Track subscription
        client.subscriptions.set(subscriptionId, streamName);
        subscriptions.push({ streamName, subscriptionId });
        
        this.log(`📡 Client ${clientId} subscribed to stream '${streamName}' (sub: ${subscriptionId})`);
      }

      this.sendWSResponse(ws, {
        type: 'subscribed',
        subscriptions,
        message: `Subscribed to ${subscriptions.length} stream(s)`,
        requestId: data.requestId
      });

    } catch (error) {
      this.sendWSResponse(ws, { 
        type: 'error', 
        message: error.message,
        requestId: data.requestId
      });
    }
  }

  /**
   * Handle WebSocket unsubscription (specific subscription or all)
   */
  async handleWSUnsubscribe(ws, clientId, data) {
    const { subscriptionId } = data;
    
    try {
      const client = this.wsClients.get(clientId);
      
      if (subscriptionId) {
        // Unsubscribe from specific subscription
        this.streamManager.unsubscribeFromStream(subscriptionId);
        const streamName = client.subscriptions.get(subscriptionId);
        client.subscriptions.delete(subscriptionId);

        this.sendWSResponse(ws, {
          type: 'unsubscribed',
          subscriptionId,
          streamName,
          message: `Unsubscribed from subscription ${subscriptionId}`,
          requestId: data.requestId
        });

        this.log(`📡 Client ${clientId} unsubscribed from subscription ${subscriptionId}`);
      } else {
        // Unsubscribe from all subscriptions for this client
        const unsubscribed = [];
        for (const [subId, streamName] of client.subscriptions) {
          try {
            this.streamManager.unsubscribeFromStream(subId);
            unsubscribed.push({ subscriptionId: subId, streamName });
          } catch (error) {
            console.warn(`Failed to unsubscribe from ${subId}:`, error);
          }
        }
        client.subscriptions.clear();

        this.sendWSResponse(ws, {
          type: 'unsubscribed',
          unsubscribed,
          message: `Unsubscribed from ${unsubscribed.length} subscription(s)`,
          requestId: data.requestId
        });

        this.log(`📡 Client ${clientId} unsubscribed from all ${unsubscribed.length} subscriptions`);
      }
    } catch (error) {
      this.sendWSResponse(ws, { 
        type: 'error', 
        message: error.message,
        requestId: data.requestId
      });
    }
  }

  /**
   * Handle WebSocket insert (unified single and batch)
   */
  async handleWSInsert(ws, clientId, data) {
    try {
      this.validateInsertRequest(data);
      
      const { target, data: recordData } = data;
      const isArray = Array.isArray(recordData);
      const count = isArray ? recordData.length : 1;

      // Use streamManager's built-in batch handling for optimal performance
      await this.streamManager.insertIntoStream(target, recordData);

      this.sendWSResponse(ws, {
        type: 'insert_response',
        success: true,
        count,
        target,
        message: `${count} record(s) inserted successfully into '${target}'`,
        requestId: data.requestId
      });

      this.log(`📝 Client ${clientId} inserted ${count} record(s) into '${target}'`);
    } catch (error) {
      this.sendWSResponse(ws, { 
        type: 'insert_response', 
        success: false, 
        error: error.message,
        requestId: data.requestId
      });
    }
  }

  /**
   * Handle WebSocket execute command
   */
  async handleWSExecute(ws, clientId, data) {
    try {
      this.validateExecuteRequest(data);
      
      const result = await this.queryEngine.executeStatement(data.query);
      
      this.sendWSResponse(ws, {
        type: 'execute_response',
        success: true,
        result,
        message: 'Query executed successfully',
        requestId: data.requestId
      });

      this.log(`🔧 Client ${clientId} executed query: ${data.query}`);
    } catch (error) {
      this.sendWSResponse(ws, {
        type: 'execute_response',
        success: false,
        error: error.message,
        requestId: data.requestId
      });
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
      this.log(`📡 WebSocket client ${clientId} disconnected`);
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
  const { values: args } = parseArgs({
    options: {
      host: {
        type: 'string',
        short: 'h',
        default: 'localhost'
      },
      port: {
        type: 'string',
        short: 'p',
        default: '3333'
      },
      verbose: {
        type: 'boolean',
        short: 'v',
        default: false
      },
      version: {
        type: 'boolean',
        default: false
      },
      help: {
        type: 'boolean',
        default: false
      }
    }
  });

  // Handle help flag
  if (args.help) {
    console.log(`
JSONJet Server - Stream processing and query engine

Usage: bun run src/index.js [options]

Options:
  -h, --host <host>     Host to bind to (default: localhost)
  -p, --port <port>     Port to listen on (default: 3333)
  -v, --verbose         Enable verbose logging (default: false)
      --version         Show version information
      --help            Show this help message

Examples:
  bun run src/index.js --host 0.0.0.0 --port 8080
  bun run src/index.js --verbose
  bun run src/index.js --help
`);
    process.exit(0);
  }

  // Handle version flag
  if (args.version) {
    const versionString = (typeof VERSION !== 'undefined') ? VERSION : 'development';
    const version = versionString.startsWith('v') ? versionString.substring(1) : versionString;
    console.log(`JSONJet Server v${version}`);
    process.exit(0);
  }

  // Convert port to number and create options object
  const options = {
    host: args.host,
    port: parseInt(args.port, 10),
    verbose: args.verbose
  };

  const server = new JSONJetServer(options);
  server.start();
}

export default JSONJetServer; 