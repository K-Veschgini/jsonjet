import React, { useState, useRef, useEffect } from 'react';
import { MantineProvider, AppShell, Title, Container, Select, ScrollArea, Paper, Text, Button, Group, Checkbox, Stack } from '@mantine/core';
import Editor from '@monaco-editor/react';
import '@andypf/json-viewer';
import '@mantine/core/styles.css';
import './App.css';

// Import JSDB library
import { queryEngine } from './jsdb/core/query-engine.js';
import { streamManager } from './jsdb/core/stream-manager.js';
import CommandParser from './jsdb/parser/command-parser.js';


interface Statement {
  text: string;
  line: number;
  isCommand: boolean;
  isQuery: boolean;
}

interface EditorMetrics {
  lineHeight: number;
  topOffset: number;
}

interface PlayButtonDecoration {
  range: any;
  options: any;
}

interface StreamMessage {
  id: string;
  timestamp: Date;
  streamName: string;
  data: any;
}

function App() {
  const [statements, setStatements] = useState<Statement[]>([]);
  const editorRef = useRef<any>(null);
  const [editorMetrics, setEditorMetrics] = useState<EditorMetrics>({ lineHeight: 19, topOffset: 0 });
  const [editorReady, setEditorReady] = useState(false);
  const decorationsRef = useRef<any>(null);
  
  // JSON viewer state
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [streamFilters, setStreamFilters] = useState<Record<string, { enabled: boolean; count: number }>>({});
  const globalSubscriptionRef = useRef<number | null>(null);
  
  // Demo state
  const [selectedDemo, setSelectedDemo] = useState<string>('flow-processing');
  
  // Demo options
  const demoOptions = [
    { value: 'flow-processing', label: 'Flow Processing Demo' }
  ];
  
  const defaultValue = `// Welcome to JSDB Flow Processing Demo!
// Execute commands and flows by clicking the play buttons

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
      
      setMessages(prev => [newMessage, ...prev].slice(0, 1000)); // Keep last 1000 messages
      
      // Update stream filters - add new streams as enabled by default and increment count
      setStreamFilters(prev => ({
        ...prev,
        [streamName]: {
          enabled: prev[streamName]?.enabled ?? true, // Default to enabled for new streams
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
  }, []);

  // Filter messages based on enabled streams
  const filteredMessages = messages.filter(msg => 
    streamFilters[msg.streamName]?.enabled ?? true
  );

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

  // Parse statements from editor content
  const parseStatements = (content: string) => {
    if (!content) return;
    
    const lines = content.split('\n');
    const newStatements: Statement[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('//')) {
        continue;
      }
      
      // Check if this line looks like the start of a statement
      if (/^(create|insert|delete|flush|list|info|subscribe|unsubscribe|[a-zA-Z_][a-zA-Z0-9_]*\s*\|)/.test(line)) {
        let currentStatement = line;
        let currentLine = i;
        
        // If the line doesn't end with semicolon, look for continuation
        if (!line.endsWith(';')) {
          // Look ahead for continuation lines until we find a semicolon or complete statement
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j].trim();
            
            // Stop at empty lines or comments
            if (!nextLine || nextLine.startsWith('//')) {
              break;
            }
            
            currentStatement += ' ' + nextLine;
            
            // If we found a semicolon, this statement is complete
            if (nextLine.endsWith(';')) {
              i = j; // Skip the lines we've consumed
              break;
            }
            
            // If the accumulated statement looks complete, stop
            if (isCompleteStatement(currentStatement)) {
              i = j; // Skip the lines we've consumed
              break;
            }
          }
        }
        
        // Process the complete statement
        if (isCompleteStatement(currentStatement)) {
          const trimmed = currentStatement.replace(/;$/, '').trim();
          const isCommand = /^(create\s+stream|insert\s+into|delete\s+(stream|flow)|flush|list|info|subscribe|unsubscribe)\b/.test(trimmed);
          const isFlow = /^create\s+flow\b/.test(trimmed);
          
          const stmt: Statement = {
            text: trimmed,
            line: currentLine, // Use the line where the statement actually starts
            isCommand: isCommand && !isFlow,
            isQuery: isFlow || (!isCommand && trimmed.length > 0),
          };
          
          newStatements.push(stmt);
        }
      }
    }
    
    
    setStatements(newStatements);
    
    // Update play button decorations
    if (editorRef.current && decorationsRef.current) {
      updatePlayButtonDecorations(newStatements);
    }
  };

  // Update play button decorations using Monaco's decoration API
  const updatePlayButtonDecorations = (statements: Statement[]) => {
    if (!editorRef.current || !decorationsRef.current) return;
    
    const decorations = statements.map((statement, index) => ({
      range: {
        startLineNumber: statement.line + 1,
        startColumn: 1,
        endLineNumber: statement.line + 1,
        endColumn: 1
      },
      options: {
        isWholeLine: false,
        glyphMarginClassName: `play-button-glyph play-button-${index}`
      }
    }));
    
    decorationsRef.current.set(decorations);
    
    // Add click handlers for each decoration
    setTimeout(() => {
      statements.forEach((statement, index) => {
        const element = document.querySelector(`.play-button-${index}`);
        if (element) {
          element.addEventListener('click', () => handlePlayClick(statement, index));
        }
      });
    }, 100);
  };

  // Check if a statement is complete (heuristic)
  const isCompleteStatement = (stmt: string) => {
    const trimmed = stmt.trim();
    
    if (!trimmed) return false;
    
    // Check for balanced braces and brackets for JSON
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < trimmed.length; i++) {
      const char = trimmed[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      
      if (inString) continue;
      
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (char === '[') bracketCount++;
      if (char === ']') bracketCount--;
    }
    
    // If JSON is not balanced, statement is incomplete
    if (braceCount !== 0 || bracketCount !== 0) {
      return false;
    }
    
    // Commands and flows have different completion rules
    if (/^(create|insert|delete|flush|list|info|subscribe|unsubscribe)\b/.test(trimmed)) {
      return true;
    }
    
    // For queries, they're complete if they don't end with incomplete operators
    if (trimmed.includes('|')) {
      // Not complete if ends with | or incomplete operators
      return !trimmed.endsWith('|') && 
             !trimmed.endsWith('where') && 
             !trimmed.endsWith('project') && 
             !trimmed.endsWith('summarize') &&
             !trimmed.endsWith('by') &&
             !trimmed.endsWith('and') &&
             !trimmed.endsWith('or');
    }
    
    // Simple table references are complete
    return trimmed.length > 0;
  };

  // Handle editor mount
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Register JSDB language
    monaco.languages.register({ id: 'jsdb' });
    
    // Define JSDB syntax highlighting
    monaco.languages.setMonarchTokensProvider('jsdb', {
      tokenizer: {
        root: [
          // Comments
          [/\/\/.*$/, 'comment'],
          
          // Flow commands
          [/\b(create|delete|insert|flush|list|info|subscribe|unsubscribe)\b/, 'keyword.command'],
          
          // Flow keywords
          [/\b(flow|from|ttl)\b/, 'keyword.flow'],
          
          // Stream keyword
          [/\bstream\b/, 'keyword.stream'],
          
          // Into keyword
          [/\binto\b/, 'keyword.into'],
          
          // Query keywords
          [/\b(where|project|summarize|insert_into|by|over|and|or|not)\b/, 'keyword.query'],
          
          // Function names
          [/\b(count|sum|avg|min|max)\b/, 'keyword.function'],
          
          // Duration literals
          [/\b\d+[nμmshwd]+\b/, 'number.duration'],
          
          // Operators
          [/[|]/, 'operator.pipe'],
          [/[=><!=]+/, 'operator.comparison'],
          [/[+\-*/%]/, 'operator.arithmetic'],
          
          // Delimiters
          [/[{}]/, 'delimiter.curly'],
          [/[[\]]/, 'delimiter.square'],
          [/[()]/, 'delimiter.parenthesis'],
          [/[;]/, 'delimiter.semicolon'],
          [/[,]/, 'delimiter.comma'],
          [/[:]/, 'delimiter.colon'],
          
          // Strings
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string_double'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/'/, 'string', '@string_single'],
          
          // Numbers
          [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
          [/\d+/, 'number'],
          
          // Object keys (unquoted identifiers followed by colon)
          [/\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*:)/, 'key'],
          
          // Identifiers (stream names, field names)
          [/[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier'],
          
          // Whitespace
          [/\s+/, 'white']
        ],
        
        string_double: [
          [/[^\\"]+/, 'string'],
          [/\\./, 'string.escape'],
          [/"/, 'string', '@pop']
        ],
        
        string_single: [
          [/[^\\']+/, 'string'],
          [/\\./, 'string.escape'],
          [/'/, 'string', '@pop']
        ]
      }
    });
    
    // Define JSDB theme
    monaco.editor.defineTheme('jsdb-theme', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword.command', foreground: '0066cc', fontStyle: 'bold' },
        { token: 'keyword.flow', foreground: 'dc2626', fontStyle: 'bold' },
        { token: 'keyword.stream', foreground: 'dc2626', fontStyle: 'bold' },
        { token: 'keyword.into', foreground: 'dc2626', fontStyle: 'bold' },
        { token: 'keyword.query', foreground: '7c3aed', fontStyle: 'bold' },
        { token: 'keyword.function', foreground: '059669', fontStyle: 'bold' },
        { token: 'number.duration', foreground: 'ea580c', fontStyle: 'bold' },
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
        { token: 'string', foreground: 'd97706' },
        { token: 'number', foreground: '059669' },
        { token: 'operator.pipe', foreground: 'dc2626', fontStyle: 'bold' },
        { token: 'operator.comparison', foreground: '7c3aed' },
        { token: 'operator.arithmetic', foreground: '7c3aed' },
        { token: 'delimiter.curly', foreground: '374151' },
        { token: 'delimiter.square', foreground: '374151' },
        { token: 'delimiter.parenthesis', foreground: '374151' },
        { token: 'delimiter.semicolon', foreground: 'dc2626', fontStyle: 'bold' },
        { token: 'key', foreground: '0f766e', fontStyle: 'bold' },
        { token: 'identifier', foreground: '111827' }
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.lineHighlightBackground': '#f8fafc',
        'editorLineNumber.foreground': '#9ca3af',
        'editorLineNumber.activeForeground': '#374151'
      }
    });
    
    // Set the language and theme
    const model = editor.getModel();
    monaco.editor.setModelLanguage(model, 'jsdb');
    monaco.editor.setTheme('jsdb-theme');
    
    // Create decorations collection for play buttons
    decorationsRef.current = editor.createDecorationsCollection([]);
    
    // Parse initial content
    parseStatements(editor.getValue());
    
    // Listen for content changes
    editor.onDidChangeModelContent(() => {
      parseStatements(editor.getValue());
    });
    
    // Mark editor as ready
    setEditorReady(true);
  };

  // Handle play button click
  const handlePlayClick = async (statement: Statement, index: number) => {
    console.log('▶️ Executing:', statement.text);
    
    try {
      if (statement.isCommand) {
        // Execute command
        const result = await CommandParser.executeCommand(statement.text);
        
        if (result.success) {
          console.log('✅ Command success:', result.message);
          if (result.result) {
            console.log('📄 Result:', result.result);
          }
          
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
          console.error('❌ Command failed:', result.message);
        }
        
      } else if (statement.isQuery) {
        // Execute flow - results will be written to streams via insert_into
        console.log('🔄 Starting flow...');
        
        const result = await queryEngine.executeStatement(statement.text);
        
        if (result.success) {
          console.log('✅ Flow started:', result.message);
          if (result.flowName) {
            console.log('🆔 Flow Name:', result.flowName);
          }
        } else {
          console.error('❌ Flow failed:', result.message);
        }
      }
    } catch (error: any) {
      console.error('💥 Execution error:', error.message);
    }
  };

  // Handle run all button click
  const handleRunAll = async () => {
    console.log('🚀 Running all statements...');
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`▶️ [${i + 1}/${statements.length}] Executing:`, statement.text);
      
      try {
        await handlePlayClick(statement, i);
        // Small delay between executions to see the flow
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        console.error(`💥 Error in statement ${i + 1}:`, error.message);
        // Continue with next statement even if one fails
      }
    }
    
    console.log('✅ Finished running all statements');
  };

  // JSON viewer component
  const JsonDisplay = ({ data }: { data: any }) => {
    return (
      <div style={{ fontSize: '14px', fontFamily: '"Roboto Mono", Monaco, Consolas, monospace' }}>
        <andypf-json-viewer 
          data={JSON.stringify(data)}
          expand-icon-type="square"
          show-data-types="false"
          theme="solarized-dark"
          style={{ fontSize: '14px', fontFamily: '"Roboto Mono", Monaco, Consolas, monospace' }}
        ></andypf-json-viewer>
      </div>
    );
  };

  // Get available streams for checkboxes
  const availableStreams = Object.keys(streamFilters).sort();

  return (
    <MantineProvider>
      <AppShell
        header={{ height: 60 }}
        style={{ height: '100vh' }}
      >
        <AppShell.Header>
          <Container size="xl" h="100%" style={{ display: 'flex', alignItems: 'center' }}>
            <Title order={3} c="blue">
              🗃️ JSDB Query Demo
            </Title>
          </Container>
        </AppShell.Header>
        
        <AppShell.Main style={{ padding: 0 }}>
          <div style={{ height: '100vh', paddingTop: '60px', display: 'flex' }}>
            {/* Left Panel - Code Editor */}
            <div style={{ width: '50%', height: '100%', borderRight: '1px solid #e0e0e0' }}>
              {/* Demo Controls */}
              <div style={{ 
                padding: '12px 16px', 
                borderBottom: '1px solid #e0e0e0', 
                backgroundColor: '#f8f9fa' 
              }}>
                <Group justify="space-between" align="center">
                  <Button 
                    onClick={handleRunAll}
                    size="sm"
                    variant="filled"
                    disabled={statements.length === 0}
                    leftSection="▶"
                  >
                    Run All
                  </Button>
                  <Select
                    value={selectedDemo}
                    data={demoOptions}
                    onChange={(value) => setSelectedDemo(value || 'flow-processing')}
                    size="sm"
                    w={200}
                  />
                </Group>
              </div>
              
              {/* Editor Container */}
              <div 
                className="editor-container"
                style={{ 
                  height: 'calc(100% - 60px)', 
                  position: 'relative'
                }}
              >
                    <Editor
                      height="100%"
                      defaultLanguage="jsdb"
                      defaultValue={defaultValue}
                      theme="jsdb-theme"
                      onMount={handleEditorDidMount}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineHeight: 19,
                        lineNumbers: 'on',
                        lineNumbersMinChars: 4,
                        roundedSelection: false,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        wordWrap: 'on',
                        glyphMargin: true,
                        folding: false,
                        lineDecorationsWidth: 20,
                        padding: { 
                          left: 20,
                          right: 15,
                          top: 10,
                          bottom: 10
                        },
                        renderLineHighlight: 'line',
                        fontFamily: '"Roboto Mono", Monaco, Consolas,monospace',
                        suggest: { enabled: false },
                        quickSuggestions: false,
                        parameterHints: { enabled: false },
                        hover: { enabled: false },
                        codeLens: false,
                        contextmenu: false,
                        overviewRulerBorder: false,
                        hideCursorInOverviewRuler: true,
                        overviewRulerLanes: 0,
                        disableLayerHinting: false,
                        smoothScrolling: true,
                        scrollbar: {
                          vertical: 'auto',
                          horizontal: 'auto',
                          verticalScrollbarSize: 12,
                          horizontalScrollbarSize: 12
                        }
                      }}
                    />
              </div>
            </div>
            
            {/* Right Panel - JSON Viewer */}
            <div style={{ width: '50%', height: '100%' }}>
              <div style={{ height: '100%', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '16px' }}>
                  <Text size="lg" fw={600} mb="xs">Streams</Text>
                  {availableStreams.length > 0 ? (
                    <Stack gap="xs">
                      {availableStreams.map(streamName => (
                        <Checkbox
                          key={streamName}
                          checked={streamFilters[streamName]?.enabled ?? true}
                          onChange={() => handleStreamToggle(streamName)}
                          label={`${streamName}: ${streamFilters[streamName]?.count ?? 0} documents`}
                          size="sm"
                        />
                      ))}
                    </Stack>
                  ) : (
                    <Text c="dimmed" size="sm">No streams created yet</Text>
                  )}
                </div>
                
                <ScrollArea style={{ flex: 1 }} type="always" scrollbarSize={8} offsetScrollbars>
                  {filteredMessages.length === 0 ? (
                    <Text c="dimmed" ta="center" mt="xl">
                      No messages yet. Execute some commands to see data flowing through streams.
                    </Text>
                  ) : (
                    filteredMessages.map((message) => (
                      <Paper key={message.id} p="sm" mb="xs" withBorder>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <Text size="sm" fw={600} c="blue">
                            {message.streamName}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {message.timestamp.toLocaleTimeString()}
                          </Text>
                        </div>
                        <JsonDisplay data={message.data} />
                      </Paper>
                    ))
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

export default App;