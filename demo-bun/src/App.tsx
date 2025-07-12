import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import './App.css';

// Import ResonanceDB library
import { queryEngine } from './jsdb/core/query-engine.js';
import { streamManager } from './jsdb/core/stream-manager.js';
import CommandParser from './jsdb/parser/command-parser.js';

// Import components
import { Header } from './components/Header';
import { ResizablePanels } from './components/ResizablePanels';
import { CodeEditor } from './components/CodeEditor';
import { DataTabs } from './components/DataTabs';

// Import hooks
import { useUnreadCounts } from './hooks/useUnreadCounts';

// Import demos
import { flowProcessingDemo, summarizeDemo, scanSimpleDemo, scanDemo, scanAdvancedDemo, selectDemo, runArrayIndexingDemo } from './demos';

interface Statement {
  text: string;
  line: number;
  isCommand: boolean;
  isQuery: boolean;
}

interface StreamMessage {
  id: string;
  timestamp: Date;
  streamName: string;
  data: any;
}

interface ConsoleEntry {
  id: string;
  timestamp: Date;
  command: string;
  response: any;
}

interface FlowInfo {
  queryId: number;
  flowName: string;
  source: { type: string; name: string };
  sinks: { type: string; name: string; order: number }[];
  ttlSeconds?: number;
  status: string;
  startTime: Date;
}

function App() {
  // Core state
  const [statements, setStatements] = useState<Statement[]>([]);
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [streamFilters, setStreamFilters] = useState<Record<string, { enabled: boolean; count: number }>>({
    '_log': { enabled: true, count: 0 } // log stream enabled by default
  });
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [activeFlows, setActiveFlows] = useState<FlowInfo[]>([]);
  const [activeTab, setActiveTab] = useState<string>('data');
  const [selectedDemo, setSelectedDemo] = useState<string>('flow-processing');
  
  // Refs
  const globalSubscriptionRef = useRef<number | null>(null);
  
  // Custom hooks
  const {
    unreadCounts,
    unreadStreamMessages,
    unreadConsoleEntries,
    fadingOut,
    activeTabRef,
    clearUnreadCounts,
    incrementConsoleEntries,
    incrementStreamMessages,
    resetAllCounts
  } = useUnreadCounts();

  // Configuration
  const MAX_MESSAGES_PER_STREAM = 100;
  const MAX_CONSOLE_ENTRIES = 100;

  // Demo options
  const demoOptions = [
    { value: 'flow-processing', label: 'Flow Processing' },
    { value: 'summarize-demo', label: 'Data Summarization' },
    { value: 'scan-simple-demo', label: 'Scan Simple (Cumulative)' },
    { value: 'scan-demo', label: 'Scan Operator (Stateful)' },
    { value: 'scan-advanced-demo', label: 'Scan Advanced (Patterns)' },
    { value: 'select-demo', label: 'Select Operator' },
    { value: 'array-indexing-demo', label: 'Array Indexing' },
  ];

  // Demo content
  const getDemoContent = useCallback((demoType: string) => {
    switch (demoType) {
      case 'summarize-demo':
        return summarizeDemo;
      case 'scan-simple-demo':
        return scanSimpleDemo;
      case 'scan-demo':
        return scanDemo;
      case 'scan-advanced-demo':
        return scanAdvancedDemo;
      case 'select-demo':
        return selectDemo;
      case 'array-indexing-demo':
        return runArrayIndexingDemo;
      case 'flow-processing':
        return flowProcessingDemo;
      default:
        return flowProcessingDemo;
    }
  }, []);

  // Subscribe to all streams on component mount
  useEffect(() => {
    const subscriptionId = streamManager.subscribeToAllStreams((message) => {
      const { data, streamName } = message;
      
      const newMessage: StreamMessage = {
        id: Date.now().toString() + Math.random().toString(36),
        timestamp: new Date(),
        streamName,
        data
      };
      
      // Batch state updates to reduce re-renders
      setMessages(prev => [newMessage, ...prev].slice(0, MAX_MESSAGES_PER_STREAM));
      setStreamFilters(prev => ({
        ...prev,
        [streamName]: {
          enabled: prev[streamName]?.enabled ?? !streamName.startsWith('_'),
          count: (prev[streamName]?.count ?? 0) + 1
        }
      }));
      
      // Track unread stream messages
      incrementStreamMessages();
    });
    
    globalSubscriptionRef.current = subscriptionId;
    
    return () => {
      if (globalSubscriptionRef.current) {
        streamManager.unsubscribeFromAllStreams(globalSubscriptionRef.current);
      }
    };
  }, [incrementStreamMessages]);

  // Subscribe to flow events for real-time flow tracking
  useEffect(() => {
    // Get initial flows
    const initialFlows = queryEngine.listActiveFlows();
    setActiveFlows(initialFlows);

    // Subscribe to flow events
    const unsubscribeFlow = queryEngine.onFlowEvent((event, flowInfo) => {
      if (event === 'created') {
        setActiveFlows(prev => [...prev, flowInfo]);
      } else if (event === 'deleted') {
        setActiveFlows(prev => prev.filter(flow => flow.queryId !== flowInfo.queryId));
      }
    });

    return () => {
      unsubscribeFlow();
    };
  }, []);

  // Subscribe to stream events for real-time stream tracking
  useEffect(() => {
    const unsubscribeStream = streamManager.onStreamEvent((event, data) => {
      if (event === 'created') {
        const { streamName } = data;
        setStreamFilters(prev => ({
          ...prev,
          [streamName]: { 
            enabled: !streamName.startsWith('_'), // Default off for system streams
            count: 0 
          }
        }));
      } else if (event === 'deleted') {
        const { streamName } = data;
        setStreamFilters(prev => {
          const newFilters = { ...prev };
          delete newFilters[streamName];
          return newFilters;
        });
      }
    });

    return () => {
      unsubscribeStream();
    };
  }, []);

  // Add console entry
  const addConsoleEntry = useCallback((command: string, response: any) => {
    const newEntry: ConsoleEntry = {
      id: Date.now().toString() + Math.random().toString(36),
      timestamp: new Date(),
      command,
      response
    };
    
    setConsoleEntries(prev => [newEntry, ...prev].slice(0, MAX_CONSOLE_ENTRIES));
    
    // Track unread console entries
    incrementConsoleEntries();
    
    // Also log to browser console
    if (response?.success === false) {
      console.error(`[ResonanceDB] Command failed:`, command, response);
    } else {
      console.log(`[ResonanceDB] Command executed:`, command, response);
    }
  }, [incrementConsoleEntries]);


  // Handle tab change
  const handleTabChange = useCallback((value: string | null) => {
    const newTab = value || 'data';
    setActiveTab(newTab);
    activeTabRef.current = newTab;
    
    // Clear unread counts for the selected tab
    if (newTab === 'console') {
      clearUnreadCounts('console');
    } else if (newTab === 'streams') {
      clearUnreadCounts('streams');
    }
    // No unread counts for data tab currently
  }, [clearUnreadCounts]);

  // Handle stream filter toggle
  const handleStreamToggle = useCallback((streamName: string) => {
    setStreamFilters(prev => ({
      ...prev,
      [streamName]: {
        ...prev[streamName],
        enabled: !prev[streamName]?.enabled
      }
    }));
  }, []);

  // Handle multi-stream toggle for MultiSelect
  const handleMultiStreamToggle = useCallback((selectedStreams: string[]) => {
    setStreamFilters(prev => {
      const updated = { ...prev };
      // Disable all streams first
      Object.keys(updated).forEach(stream => {
        updated[stream] = { ...updated[stream], enabled: false };
      });
      // Enable selected streams (including log by default if nothing selected)
      if (selectedStreams.length === 0 && updated['_log']) {
        // If nothing selected and log exists, enable log by default
        selectedStreams = ['_log'];
      }
      selectedStreams.forEach(stream => {
        updated[stream] = { ...updated[stream], enabled: true };
      });
      return updated;
    });
  }, []);

  // Handle flush all streams
  const handleFlushAllStreams = useCallback(async () => {
    try {
      const streamNames = streamManager.listStreams();
      if (streamNames.length === 0) {
        addConsoleEntry(
          'flush // all streams',
          { success: true, type: 'system', message: 'No streams to flush' }
        );
        return;
      }
      
      addConsoleEntry(
        `flush // ${streamNames.join(', ')}`,
        { success: true, type: 'system', message: `✅ Flushed all ${streamNames.length} streams` }
      );
      
      for (const streamName of streamNames) {
        await streamManager.flushStream(streamName);
      }
    } catch (error: any) {
      addConsoleEntry(
        'flush // all streams',
        { success: false, error: { code: 'FLUSH_ERROR', message: `Error flushing streams: ${error.message}` } }
      );
    }
  }, [addConsoleEntry]);

  // Handle reset - clears everything
  const handleReset = useCallback(async () => {
    try {
      // Stop all active flows
      const activeFlows = queryEngine.listActiveFlows();
      for (const flow of activeFlows) {
        queryEngine.stopQuery(flow.queryId);
      }
      
      // Delete all streams
      streamManager.deleteAllStreams();
      
      // Clear all UI state
      setStreamFilters({ '_log': { enabled: false, count: 0 } });
      setMessages([]);
      setConsoleEntries([]);
      setActiveFlows([]);
      
      // Reset all unread badge counts
      resetAllCounts();
      
    } catch (error: any) {
      // Reset is a UI action, so only log errors to browser console, not ResonanceDB console
      console.error('Reset error:', error);
    }
  }, [addConsoleEntry]);

  // Handle statement execution
  const handleStatementExecute = useCallback(async (statement: Statement, index: number) => {
    try {
      if (statement.isCommand) {
        const result = await CommandParser.executeCommand(statement.text);
        
        // Add to console
        addConsoleEntry(statement.text, result);
        
        // Stream creation/deletion is now handled by event listeners
        
      } else if (statement.isQuery) {
        const result = await queryEngine.executeStatement(statement.text);
        
        // Add to console
        addConsoleEntry(statement.text, result);
      }
    } catch (error: any) {
      const errorResponse = {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message
        }
      };
      addConsoleEntry(statement.text, errorResponse);
    }
  }, [addConsoleEntry, setStreamFilters]);

  // Handle run all
  const handleRunAll = useCallback(async () => {
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        await handleStatementExecute(statement, i);
        // Longer delay for flow-related statements to ensure proper completion
        const delay = statement.text.includes('create flow') ? 300 : 100;
        await new Promise(resolve => setTimeout(resolve, delay));
      } catch (error: any) {
        const errorResponse = {
          success: false,
          error: {
            code: 'BATCH_EXECUTION_ERROR',
            message: `Error in statement ${i + 1}: ${error.message}`
          }
        };
        addConsoleEntry(`// Error in statement ${i + 1}`, errorResponse);
      }
    }
    
    // Refresh flows after batch execution to catch any missed events
    const finalFlows = queryEngine.listActiveFlows();
    setActiveFlows(finalFlows);
  }, [statements, handleStatementExecute, addConsoleEntry]);

  return (
    <MantineProvider>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header />
        
        <ResizablePanels
          leftPanel={
            <CodeEditor
              demoContent={getDemoContent(selectedDemo)}
              statements={statements}
              onStatementsChange={setStatements}
              onStatementExecute={handleStatementExecute}
              onRunAll={handleRunAll}
              onReset={handleReset}
              selectedDemo={selectedDemo}
              demoOptions={demoOptions}
              onDemoChange={setSelectedDemo}
            />
          }
          rightPanel={
            <DataTabs
              activeTab={activeTab}
              onTabChange={handleTabChange}
              messages={messages}
              streamFilters={streamFilters}
              onStreamToggle={handleStreamToggle}
              onMultiStreamToggle={handleMultiStreamToggle}
              unreadStreamMessages={unreadStreamMessages}
              fadingOutStreams={fadingOut.streams}
              maxMessagesPerStream={MAX_MESSAGES_PER_STREAM}
              onFlushAllStreams={handleFlushAllStreams}
              consoleEntries={consoleEntries}
              unreadConsoleEntries={unreadConsoleEntries}
              fadingOutConsole={fadingOut.console}
              maxConsoleEntries={MAX_CONSOLE_ENTRIES}
              activeFlows={activeFlows}
            />
          }
        />
      </div>
    </MantineProvider>
  );
}

export default App;