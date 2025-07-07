import React, { useState, useRef, useEffect } from 'react';
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

interface LogMessage {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

function App() {
  // Core state
  const [statements, setStatements] = useState<Statement[]>([]);
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [streamFilters, setStreamFilters] = useState<Record<string, { enabled: boolean; count: number }>>({});
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [activeTab, setActiveTab] = useState<string>('streams');
  const [selectedDemo, setSelectedDemo] = useState<string>('flow-processing');
  
  // Refs
  const globalSubscriptionRef = useRef<number | null>(null);
  
  // Custom hooks
  const {
    unreadCounts,
    unreadStreamMessages,
    fadingOut,
    activeTabRef,
    clearUnreadCounts,
    incrementLogCount,
    incrementStreamMessages
  } = useUnreadCounts();

  // Configuration
  const MAX_MESSAGES_PER_STREAM = 100;
  const MAX_LOGS = 100;

  // Demo options
  const demoOptions = [
    { value: 'flow-processing', label: 'Flow Processing' },
    { value: 'summarize-demo', label: 'Data Summarization' },
    { value: 'scan-demo', label: 'Stream Scanning' },
    { value: 'select-demo', label: 'Select Operator' },
    { value: 'array-indexing-demo', label: 'Array Indexing' }
  ];

  // Demo content
  const getDemoContent = (demoType: string) => {
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
  };

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
      
      setMessages(prev => [newMessage, ...prev].slice(0, MAX_MESSAGES_PER_STREAM));
      
      // Track unread stream messages
      incrementStreamMessages();
      
      // Update stream filters
      setStreamFilters(prev => ({
        ...prev,
        [streamName]: {
          enabled: prev[streamName]?.enabled ?? true,
          count: (prev[streamName]?.count ?? 0) + 1
        }
      }));
    });
    
    globalSubscriptionRef.current = subscriptionId;
    
    return () => {
      if (globalSubscriptionRef.current) {
        streamManager.unsubscribeFromAllStreams(globalSubscriptionRef.current);
      }
    };
  }, [incrementStreamMessages]);

  // Add log message
  const addLog = (level: LogMessage['level'], message: string) => {
    const newLog: LogMessage = {
      id: Date.now().toString() + Math.random().toString(36),
      timestamp: new Date(),
      level,
      message
    };
    
    setLogs(prev => [newLog, ...prev].slice(0, MAX_LOGS));
    
    // Track unread logs by type
    incrementLogCount(level);
    
    // Also log to console
    switch (level) {
      case 'error':
        console.error(message);
        break;
      case 'warning':
        console.warn(message);
        break;
      case 'success':
        console.log(`✅ ${message}`);
        break;
      default:
        console.log(message);
    }
  };

  // Handle tab change
  const handleTabChange = (value: string | null) => {
    const newTab = value || 'streams';
    setActiveTab(newTab);
    activeTabRef.current = newTab;
    
    // Clear unread counts for the selected tab
    if (newTab === 'logs') {
      clearUnreadCounts('logs');
    } else if (newTab === 'streams') {
      clearUnreadCounts('streams');
    }
  };

  // Handle stream filter toggle
  const handleStreamToggle = (streamName: string) => {
    setStreamFilters(prev => ({
      ...prev,
      [streamName]: {
        ...prev[streamName],
        enabled: !prev[streamName]?.enabled
      }
    }));
  };

  // Handle flush all streams
  const handleFlushAllStreams = async () => {
    try {
      const streamNames = streamManager.listStreams();
      if (streamNames.length === 0) {
        addLog('info', 'No streams to flush');
        return;
      }
      
      addLog('info', `Flushing ${streamNames.length} streams...`);
      
      for (const streamName of streamNames) {
        await streamManager.flushStream(streamName);
      }
      
      addLog('success', `✅ Flushed all ${streamNames.length} streams`);
    } catch (error: any) {
      addLog('error', `Error flushing streams: ${error.message}`);
    }
  };

  // Handle delete all streams
  const handleDeleteAllStreams = async () => {
    try {
      const streamNames = streamManager.listStreams();
      if (streamNames.length === 0) {
        addLog('info', 'No streams to delete');
        return;
      }
      
      addLog('info', `Deleting ${streamNames.length} streams...`);
      
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
      
      addLog('success', `✅ Deleted all ${streamNames.length} streams and ${activeFlows.length} flows`);
    } catch (error: any) {
      addLog('error', `Error deleting streams: ${error.message}`);
    }
  };

  // Handle statement execution
  const handleStatementExecute = async (statement: Statement, index: number) => {
    try {
      if (statement.isCommand) {
        const result = await CommandParser.executeCommand(statement.text);
        
        if (result.success) {
          addLog('success', result.message);
          
          // Handle stream creation
          if (result.result?.streamName && /create\s+(?:or\s+replace\s+)?stream/.test(statement.text)) {
            setStreamFilters(prev => ({
              ...prev,
              [result.result.streamName]: { enabled: true, count: 0 }
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
        } else {
          addLog('error', result.message);
        }
        
      } else if (statement.isQuery) {
        const result = await queryEngine.executeStatement(statement.text);
        
        if (result.success) {
          addLog('success', result.message);
        } else {
          addLog('error', result.message);
        }
      }
    } catch (error: any) {
      addLog('error', error.message);
    }
  };

  // Handle run all
  const handleRunAll = async () => {
    addLog('info', `🚀 Running ${statements.length} statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        await handleStatementExecute(statement, i);
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        addLog('error', `Error in statement ${i + 1}: ${error.message}`);
      }
    }
    
    addLog('success', `✅ Completed ${statements.length} statements`);
  };

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
              logs={logs}
              unreadCounts={unreadCounts}
              fadingOutLogs={fadingOut.logs}
              maxLogs={MAX_LOGS}
            />
          }
        />
      </div>
    </MantineProvider>
  );
}

export default App;