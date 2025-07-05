import React from 'react';
import '@andypf/json-viewer';

interface JsonDisplayProps {
  data: any;
  compact?: boolean;
}

export function JsonDisplay({ data, compact = false }: JsonDisplayProps) {
  return (
    <div style={{ 
      fontSize: compact ? '11px' : '12px', 
      fontFamily: '"Roboto Mono", Monaco, Consolas, monospace',
      padding: compact ? '4px 0 4px 8px' : '8px 0 8px 10px'
    }}>
      <andypf-json-viewer 
        data={JSON.stringify(data)}
        expand-icon-type="square"
        show-data-types="false"
        theme="one-light"
        style={{ 
          fontSize: compact ? '11px' : '12px', 
          fontFamily: '"Roboto Mono", Monaco, Consolas, monospace',
          padding: '0'
        }}
      ></andypf-json-viewer>
    </div>
  );
}