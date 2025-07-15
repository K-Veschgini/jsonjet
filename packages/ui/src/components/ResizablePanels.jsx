import React, { useState, useEffect, useCallback, useRef } from 'react';

export function ResizablePanels({
  leftPanel,
  rightPanel,
  defaultLeftWidth = 65,
  minWidth = 25,
  maxWidth = 70
}) {
  const [leftPanelWidth, setLeftPanelWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    const clampedWidth = Math.min(Math.max(newLeftWidth, minWidth), maxWidth);
    setLeftPanelWidth(clampedWidth);
  }, [minWidth, maxWidth]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className="resizable-container" style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      {/* Left Panel */}
      <div style={{ flexBasis: `${leftPanelWidth}%`, flexShrink: 0, flexGrow: 0, height: '100%', overflow: 'hidden' }}>
        {leftPanel}
      </div>

      {/* Resizable Divider */}
      <div
        style={{
          width: '4px',
          flexShrink: 0,
          height: '100%',
          backgroundColor: isDragging ? '#d1d5db' : '#e0e0e0',
          cursor: 'col-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: isDragging ? 'none' : 'background-color 0.2s ease'
        }}
        onMouseDown={handleMouseDown}
      >
        <div style={{
          width: '2px',
          height: '40px',
          backgroundColor: '#9ca3af',
          borderRadius: '1px'
        }} />
      </div>

      {/* Right Panel */}
      <div style={{
        flexBasis: `${100 - leftPanelWidth}%`,
        flexShrink: 0,
        flexGrow: 0,
        height: '100%',
        overflow: 'hidden',
        minWidth: '380px' // Ensure tabs don't wrap
      }}>
        {rightPanel}
      </div>
    </div>
  );
}