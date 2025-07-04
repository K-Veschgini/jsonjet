import React, { useRef, useEffect } from 'react';
import { Button, Group, Select } from '@mantine/core';
import Editor from '@monaco-editor/react';

interface Statement {
  text: string;
  line: number;
  isCommand: boolean;
  isQuery: boolean;
}

interface CodeEditorProps {
  demoContent: string;
  statements: Statement[];
  onStatementsChange: (statements: Statement[]) => void;
  onStatementExecute: (statement: Statement, index: number) => void;
  onRunAll: () => void;
  selectedDemo: string;
  demoOptions: Array<{ value: string; label: string }>;
  onDemoChange: (value: string) => void;
}

export function CodeEditor({
  demoContent,
  statements,
  onStatementsChange,
  onStatementExecute,
  onRunAll,
  selectedDemo,
  demoOptions,
  onDemoChange
}: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<any>(null);

  const parseStatements = (content: string) => {
    if (!content) return;
    
    const lines = content.split('\n');
    const newStatements: Statement[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line || line.startsWith('//')) {
        continue;
      }
      
      if (/^(create|insert|delete|flush|list|info|subscribe|unsubscribe|[a-zA-Z_][a-zA-Z0-9_]*\s*\|)/.test(line)) {
        let currentStatement = line;
        let currentLine = i;
        
        if (!line.endsWith(';')) {
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j].trim();
            
            if (!nextLine || nextLine.startsWith('//')) {
              break;
            }
            
            currentStatement += ' ' + nextLine;
            
            if (nextLine.endsWith(';')) {
              i = j;
              break;
            }
            
            if (isCompleteStatement(currentStatement)) {
              i = j;
              break;
            }
          }
        }
        
        if (isCompleteStatement(currentStatement)) {
          const trimmed = currentStatement.replace(/;$/, '').trim();
          const isCommand = /^(create\s+stream|insert\s+into|delete\s+(stream|flow)|flush|list|info|subscribe|unsubscribe)\b/.test(trimmed);
          const isFlow = /^create\s+flow\b/.test(trimmed);
          
          const stmt: Statement = {
            text: trimmed,
            line: currentLine,
            isCommand: isCommand && !isFlow,
            isQuery: isFlow || (!isCommand && trimmed.length > 0),
          };
          
          newStatements.push(stmt);
        }
      }
    }
    
    onStatementsChange(newStatements);
    
    if (editorRef.current && decorationsRef.current) {
      updatePlayButtonDecorations(newStatements);
    }
  };

  const isCompleteStatement = (stmt: string) => {
    const trimmed = stmt.trim();
    
    if (!trimmed) return false;
    
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
    
    if (braceCount !== 0 || bracketCount !== 0) {
      return false;
    }
    
    if (/^(create|insert|delete|flush|list|info|subscribe|unsubscribe)\b/.test(trimmed)) {
      return true;
    }
    
    if (trimmed.includes('|')) {
      return !trimmed.endsWith('|') && 
             !trimmed.endsWith('where') && 
             !trimmed.endsWith('project') && 
             !trimmed.endsWith('summarize') &&
             !trimmed.endsWith('by') &&
             !trimmed.endsWith('and') &&
             !trimmed.endsWith('or');
    }
    
    return trimmed.length > 0;
  };

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
    
    setTimeout(() => {
      statements.forEach((statement, index) => {
        const element = document.querySelector(`.play-button-${index}`);
        if (element) {
          element.addEventListener('click', () => onStatementExecute(statement, index));
        }
      });
    }, 100);
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    monaco.languages.register({ id: 'jsdb' });
    
    monaco.languages.setMonarchTokensProvider('jsdb', {
      tokenizer: {
        root: [
          [/\/\/.*$/, 'comment'],
          [/\b(create|delete|insert|flush|list|info|subscribe|unsubscribe)\b/, 'keyword.command'],
          [/\b(flow|from|ttl)\b/, 'keyword.flow'],
          [/\bstream\b/, 'keyword.stream'],
          [/\binto\b/, 'keyword.into'],
          [/\b(where|project|summarize|insert_into|by|over|and|or|not)\b/, 'keyword.query'],
          [/\b(count|sum|avg|min|max)\b/, 'keyword.function'],
          [/\b\d+[nμmshwd]+\b/, 'number.duration'],
          [/[|]/, 'operator.pipe'],
          [/[=><!=]+/, 'operator.comparison'],
          [/[+\-*/%]/, 'operator.arithmetic'],
          [/[{}]/, 'delimiter.curly'],
          [/[\[\]]/, 'delimiter.square'],
          [/[()]/, 'delimiter.parenthesis'],
          [/[;]/, 'delimiter.semicolon'],
          [/[,]/, 'delimiter.comma'],
          [/[:]/, 'delimiter.colon'],
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string_double'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/'/, 'string', '@string_single'],
          [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
          [/\d+/, 'number'],
          [/\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*:)/, 'key'],
          [/[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier'],
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
    
    const model = editor.getModel();
    monaco.editor.setModelLanguage(model, 'jsdb');
    monaco.editor.setTheme('jsdb-theme');
    
    decorationsRef.current = editor.createDecorationsCollection([]);
    
    parseStatements(editor.getValue());
    
    editor.onDidChangeModelContent(() => {
      parseStatements(editor.getValue());
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Demo Controls */}
      <div style={{ 
        height: '48px',
        padding: '0 16px', 
        backgroundColor: '#f8f9fa',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Button 
            onClick={onRunAll}
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
            onChange={(value) => onDemoChange(value || 'flow-processing')}
            size="sm"
            w={200}
          />
        </div>
      </div>
      
      {/* Editor Container */}
      <div 
        className="editor-container"
        style={{ 
          flex: 1, 
          position: 'relative'
        }}
      >
        <Editor
          height="100%"
          defaultLanguage="jsdb"
          value={demoContent}
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
  );
}