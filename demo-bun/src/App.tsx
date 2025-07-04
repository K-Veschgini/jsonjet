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
    { value: 'scan-demo', label: 'Stream Scanning' }
  ];

  // Demo content
  const getDemoContent = (demoType: string) => {
    switch (demoType) {
      case 'summarize-demo':
        return `// JSDB Data Summarization Demo
// Learn how to aggregate and summarize streaming data with windows

// 1. Create streams for sales data
create stream sales;
create stream daily_summary;

// 2. Create summarization flows FIRST
// Summarize total sales by product using a 5-second tumbling window
// Window ensures results are emitted every 5 seconds automatically
create flow product_summary from sales 
  | summarize { total_amount: sum(amount), count: count() } by product over window = tumbling_window(5000)
  | insert_into(daily_summary);

// 3. Insert sample sales data (flows will process this immediately)
insert into sales { date: "2024-01-15", product: "laptop", amount: 1200, region: "north" };
insert into sales { date: "2024-01-15", product: "mouse", amount: 25, region: "north" };
insert into sales { date: "2024-01-15", product: "laptop", amount: 1100, region: "south" };
insert into sales { date: "2024-01-15", product: "keyboard", amount: 75, region: "south" };

// 4. Wait a moment, then insert more data
// Results will appear in daily_summary stream automatically
insert into sales { date: "2024-01-16", product: "laptop", amount: 1300, region: "north" };
insert into sales { date: "2024-01-16", product: "mouse", amount: 30, region: "east" };
insert into sales { date: "2024-01-16", product: "laptop", amount: 1150, region: "west" };

// 5. View current flows and check the daily_summary stream
list flows;
list streams;
`;

      case 'scan-demo':
        return `// JSDB Stream Scanning Demo
// Learn how to scan and filter data streams in real-time

// 1. Create monitoring streams
create stream server_logs;
create stream alerts;
create stream metrics;

// 2. Insert various log entries
insert into server_logs { timestamp: "2024-01-15T10:00:00Z", level: "info", service: "api", message: "Request processed", response_time: 45 };
insert into server_logs { timestamp: "2024-01-15T10:01:00Z", level: "warning", service: "db", message: "Slow query detected", response_time: 2500 };
insert into server_logs { timestamp: "2024-01-15T10:02:00Z", level: "error", service: "api", message: "Connection timeout", response_time: 5000 };

// 3. Create scanning flows for monitoring
// Scan for errors and create alerts
create flow error_scanner from server_logs 
  | where level == "error" 
  | project { alert_type: "ERROR", service: service, message: message, time: timestamp }
  | insert_into(alerts);

// Scan for slow responses and create performance metrics
create flow performance_scanner from server_logs 
  | where response_time > 1000 
  | project { metric_type: "SLOW_RESPONSE", service: service, response_time: response_time }
  | insert_into(metrics);

// 4. Insert more log data to trigger scans
insert into server_logs { timestamp: "2024-01-15T10:03:00Z", level: "error", service: "auth", message: "Authentication failed", response_time: 200 };
insert into server_logs { timestamp: "2024-01-15T10:04:00Z", level: "info", service: "api", message: "Health check", response_time: 15 };

// 5. Check what was detected
list flows;
`;

      default: // 'flow-processing'
        return `// JSDB Flow Processing Demo
// Learn how to create flows that process and route data in real-time

// 1. Create streams
create stream events;
create stream archive;

// 2. Create result streams for flow outputs
create stream high_sales_results;
create stream monitor_results;

// 3. Create flows that process and route data
// High value sales flow - writes results to a dedicated stream
create flow high_sales from events | where amount > 100 | insert_into(high_sales_results);

// Also archive high value sales to archive stream
create flow archiver from events | where amount > 100 | insert_into(archive);

// Temporary monitoring flow with TTL (auto-deletes after 2 minutes)
create flow temp_monitor ttl(2m) from events | project { id: id, doubled: amount * 2 } | insert_into(monitor_results);

// 4. Insert data to see it flow through the system
insert into events { id: 1, amount: 150, type: "sale" };
insert into events [
  { id: 2, amount: 50, type: "refund" },
  { id: 3, amount: 200, type: "sale" }
];

// 5. Insert more data and see it flow through
insert into events { id: 4, amount: 300, type: "sale" };

// 6. List active flows
list flows;

// 7. Delete a flow manually
delete flow temp_monitor;
`;
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
      
      streamManager.deleteAllStreams();
      
      // Clear stream filters in UI
      setStreamFilters({});
      
      // Clear messages since all streams are gone
      setMessages([]);
      
      addLog('success', `✅ Deleted all ${streamNames.length} streams`);
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
          if (result.result?.streamName && statement.text.includes('create stream')) {
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