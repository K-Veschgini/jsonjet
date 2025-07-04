import React, { useState, useEffect, ReactNode } from 'react';

interface ResizablePanelsProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  defaultLeftWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

export function ResizablePanels({ 
  leftPanel, 
  rightPanel, 
  defaultLeftWidth = 65,
  minWidth = 25,
  maxWidth = 75
}: ResizablePanelsProps) {
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const containerRect = document.querySelector('.resizable-container')?.getBoundingClientRect();
    if (!containerRect) return;
    
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    const clampedWidth = Math.min(Math.max(newLeftWidth, minWidth), maxWidth);
    setLeftPanelWidth(clampedWidth);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  return (
    <div className="resizable-container" style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      {/* Left Panel */}
      <div style={{ width: `${leftPanelWidth}%`, height: '100%', overflow: 'hidden' }}>
        {leftPanel}
      </div>
      
      {/* Resizable Divider */}
      <div 
        style={{
          width: '4px',
          height: '100%',
          backgroundColor: '#e0e0e0',
          cursor: 'col-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: isDragging ? 'none' : 'background-color 0.2s ease'
        }}
        onMouseDown={handleMouseDown}
        onMouseEnter={(e) => {
          if (!isDragging) e.currentTarget.style.backgroundColor = '#d1d5db';
        }}
        onMouseLeave={(e) => {
          if (!isDragging) e.currentTarget.style.backgroundColor = '#e0e0e0';
        }}
      >
        <div style={{
          width: '2px',
          height: '40px',
          backgroundColor: '#9ca3af',
          borderRadius: '1px'
        }} />
      </div>
      
      {/* Right Panel */}
      <div style={{ width: `${100 - leftPanelWidth}%`, height: '100%', overflow: 'hidden' }}>
        {rightPanel}
      </div>
    </div>
  );
}