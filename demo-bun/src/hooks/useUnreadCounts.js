import { useState, useRef } from 'react';


export function useUnreadCounts() {
  const [unreadCounts, setUnreadCounts] = useState({
    error: 0,
    warning: 0,
    success: 0,
    info: 0
  });
  
  const [unreadStreamMessages, setUnreadStreamMessages] = useState(0);
  const [unreadConsoleEntries, setUnreadConsoleEntries] = useState(0);
  const [fadingOut, setFadingOut] = useState({ streams: false, console: false });
  const activeTabRef = useRef('console');

  const clearUnreadCounts = (tab) => {
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

  const resetAllCounts = () => {
    setUnreadCounts({
      error: 0,
      warning: 0,
      success: 0,
      info: 0
    });
    setUnreadStreamMessages(0);
    setUnreadConsoleEntries(0);
    setFadingOut({ streams: false, console: false });
  };

  return {
    unreadCounts,
    unreadStreamMessages,
    unreadConsoleEntries,
    fadingOut,
    activeTabRef,
    clearUnreadCounts,
    incrementConsoleEntries,
    incrementStreamMessages,
    resetAllCounts
  };
}