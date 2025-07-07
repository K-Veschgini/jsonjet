import { useState, useRef } from 'react';

export interface UnreadCounts {
  error: number;
  warning: number;
  success: number;
  info: number;
}

export interface FadingState {
  streams: boolean;
  console: boolean;
}

export function useUnreadCounts() {
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({
    error: 0,
    warning: 0,
    success: 0,
    info: 0
  });
  
  const [unreadStreamMessages, setUnreadStreamMessages] = useState<number>(0);
  const [unreadConsoleEntries, setUnreadConsoleEntries] = useState<number>(0);
  const [fadingOut, setFadingOut] = useState<FadingState>({ streams: false, console: false });
  const activeTabRef = useRef<string>('console');

  const clearUnreadCounts = (tab: 'streams' | 'console') => {
    if (tab === 'console') {
      setFadingOut(prev => ({ ...prev, console: true }));
      setTimeout(() => {
        setUnreadConsoleEntries(0);
        setFadingOut(prev => ({ ...prev, console: false }));
      }, 300);
    } else if (tab === 'streams') {
      setFadingOut(prev => ({ ...prev, streams: true }));
      setTimeout(() => {
        setUnreadStreamMessages(0);
        setFadingOut(prev => ({ ...prev, streams: false }));
      }, 300);
    }
  };

  const incrementConsoleEntries = () => {
    if (activeTabRef.current !== 'console') {
      setUnreadConsoleEntries(prev => prev + 1);
    }
  };

  const incrementStreamMessages = () => {
    if (activeTabRef.current !== 'streams') {
      setUnreadStreamMessages(prev => prev + 1);
    }
  };

  return {
    unreadCounts,
    unreadStreamMessages,
    unreadConsoleEntries,
    fadingOut,
    activeTabRef,
    clearUnreadCounts,
    incrementConsoleEntries,
    incrementStreamMessages
  };
}