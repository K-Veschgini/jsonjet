import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import './App.css';

// Import JSDB library
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
import { flowProcessingDemo, summarizeDemo, scanDemo, selectDemo, runArrayIndexingDemo } from './demos';

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

function App() {
  // Core state
  const [statements, setStatements] = useState<Statement[]>([]);
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [streamFilters, setStreamFilters] = useState<Record<string, { enabled: boolean; count: number }>>({
    '_log': { enabled: false, count: 0 } // Add _log stream with default unchecked state
  });
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [activeTab, setActiveTab] = useState<string>('console');
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
    incrementStreamMessages
  } = useUnreadCounts();

  // Configuration
  const MAX_MESSAGES_PER_STREAM = 100;
  const MAX_CONSOLE_ENTRIES = 100;

  // Demo options
  const demoOptions = [
    { value: 'flow-processing', label: 'Flow Processing' },
    { value: 'summarize-demo', label: 'Data Summarization' },
    { value: 'scan-demo', label: 'Stream Scanning' },
    { value: 'select-demo', label: 'Select Operator' },
    { value: 'array-indexing-demo', label: 'Array Indexing' }
  ];

  // Demo content
  const getDemoContent = useCallback((demoType: string) => {
    switch (demoType) {
      case 'summarize-demo':
        return summarizeDemo;
      case 'scan-demo':
        return scanDemo;
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
      console.error(`[JSDB] Command failed:`, command, response);
    } else {
      console.log(`[JSDB] Command executed:`, command, response);
    }
  }, [incrementConsoleEntries]);


  // Handle tab change
  const handleTabChange = useCallback((value: string | null) => {
    const newTab = value || 'streams';
    setActiveTab(newTab);
    activeTabRef.current = newTab;
    
    // Clear unread counts for the selected tab
    if (newTab === 'console') {
      clearUnreadCounts('console');
    } else if (newTab === 'streams') {
      clearUnreadCounts('streams');
    }
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

  // Handle delete all streams
  const handleDeleteAllStreams = useCallback(async () => {
    try {
      const streamNames = streamManager.listStreams();
      if (streamNames.length === 0) {
        addConsoleEntry(
          'delete // all streams',
          { success: true, type: 'system', message: 'No streams to delete' }
        );
        return;
      }
      
      // Stop all active flows first
      const activeFlows = queryEngine.getActiveFlows();
      for (const flow of activeFlows) {
        queryEngine.stopQuery(flow.queryId);
      }
      
      streamManager.deleteAllStreams();
      
      // Clear stream filters in UI
      setStreamFilters({});
      
      // Clear messages since all streams are gone
      setMessages([]);
      
      addConsoleEntry(
        `delete // ${streamNames.join(', ')}`,
        { success: true, type: 'system', message: `✅ Deleted all ${streamNames.length} streams and ${activeFlows.length} flows` }
      );
    } catch (error: any) {
      addConsoleEntry(
        'delete // all streams',
        { success: false, error: { code: 'DELETE_ERROR', message: `Error deleting streams: ${error.message}` } }
      );
    }
  }, [addConsoleEntry]);

  // Handle statement execution
  const handleStatementExecute = useCallback(async (statement: Statement, index: number) => {
    try {
      if (statement.isCommand) {
        const result = await CommandParser.executeCommand(statement.text);
        
        // Add to console
        addConsoleEntry(statement.text, result);
        
        if (result.success) {
          // Handle stream creation
          if (result.result?.streamName && /create\s+(?:or\s+replace\s+)?stream/.test(statement.text)) {
            setStreamFilters(prev => ({
              ...prev,
              [result.result.streamName]: { 
                enabled: !result.result.streamName.startsWith('_'), // Default off for system streams
                count: 0 
              }
            }));
          }
          
          // Handle stream deletion
          if (result.result?.streamName && statement.text.includes('delete stream')) {
            setStreamFilters(prev => {
              const newFilters = { ...prev };
              delete newFilters[result.result.streamName];
              return newFilters;
            });
          }
        }
        
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
        await new Promise(resolve => setTimeout(resolve, 100));
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
              unreadStreamMessages={unreadStreamMessages}
              fadingOutStreams={fadingOut.streams}
              maxMessagesPerStream={MAX_MESSAGES_PER_STREAM}
              onFlushAllStreams={handleFlushAllStreams}
              onDeleteAllStreams={handleDeleteAllStreams}
              consoleEntries={consoleEntries}
              unreadConsoleEntries={unreadConsoleEntries}
              fadingOutConsole={fadingOut.console}
              maxConsoleEntries={MAX_CONSOLE_ENTRIES}
            />
          }
        />
      </div>
    </MantineProvider>
  );
}

export default App;