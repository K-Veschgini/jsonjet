import { useState, useRef } from 'react';

export interface UnreadCounts {
  error: number;
  warning: number;
  success: number;
  info: number;
}

export interface FadingState {
  streams: boolean;
  logs: boolean;
}

export function useUnreadCounts() {
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({
    error: 0,
    warning: 0,
    success: 0,
    info: 0
  });
  
  const [unreadStreamMessages, setUnreadStreamMessages] = useState<number>(0);
  const [fadingOut, setFadingOut] = useState<FadingState>({ streams: false, logs: false });
  const activeTabRef = useRef<string>('streams');

  const clearUnreadCounts = (tab: 'streams' | 'logs') => {
    if (tab === 'logs') {
      setFadingOut(prev => ({ ...prev, logs: true }));
      setTimeout(() => {
        setUnreadCounts({ error: 0, warning: 0, success: 0, info: 0 });
        setFadingOut(prev => ({ ...prev, logs: false }));
      }, 300);
    } else if (tab === 'streams') {
      setFadingOut(prev => ({ ...prev, streams: true }));
      setTimeout(() => {
        setUnreadStreamMessages(0);
        setFadingOut(prev => ({ ...prev, streams: false }));
      }, 300);
    }
  };

  const incrementLogCount = (level: keyof UnreadCounts) => {
    if (activeTabRef.current !== 'logs') {
      setUnreadCounts(prev => ({
        ...prev,
        [level]: prev[level] + 1
      }));
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
    fadingOut,
    activeTabRef,
    clearUnreadCounts,
    incrementLogCount,
    incrementStreamMessages
  };
}