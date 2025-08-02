import React, { memo } from 'react';
import ReactJsonView from '@microlink/react-json-view';

export const JsonDisplay = memo(function JsonDisplay({ data, compact = false }) {
  return (
    <div style={{ 
      fontSize: compact ? '11px' : '12px', 
      fontFamily: '"Roboto Mono", Monaco, Consolas, monospace',
      padding: compact ? '4px 0 4px 8px' : '8px 0 8px 10px'
    }}>
      <ReactJsonView 
        src={data}
        collapsed={false}
        displayDataTypes={false}
        theme="bright:inverted"
        style={{ 
          fontSize: compact ? '11px' : '12px', 
          fontFamily: '"Roboto Mono", Monaco, Consolas, monospace',
          padding: '0',
          backgroundColor: 'transparent'
        }}
      />
    </div>
  );
});