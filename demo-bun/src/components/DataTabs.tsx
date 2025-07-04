import React from 'react';
import { Tabs, Text, Stack, Checkbox, Paper, Badge, Button, Group } from '@mantine/core';
import { JsonDisplay } from './JsonDisplay';
import { BadgeWithAnimation } from './BadgeWithAnimation';

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

interface DataTabsProps {
  activeTab: string;
  onTabChange: (value: string | null) => void;
  
  // Stream data
  messages: StreamMessage[];
  streamFilters: Record<string, { enabled: boolean; count: number }>;
  onStreamToggle: (streamName: string) => void;
  unreadStreamMessages: number;
  fadingOutStreams: boolean;
  maxMessagesPerStream: number;
  onFlushAllStreams: () => void;
  onDeleteAllStreams: () => void;
  
  // Log data
  logs: LogMessage[];
  unreadCounts: {
    error: number;
    warning: number;
    success: number;
    info: number;
  };
  fadingOutLogs: boolean;
  maxLogs: number;
}

export function DataTabs({
  activeTab,
  onTabChange,
  messages,
  streamFilters,
  onStreamToggle,
  unreadStreamMessages,
  fadingOutStreams,
  maxMessagesPerStream,
  onFlushAllStreams,
  onDeleteAllStreams,
  logs,
  unreadCounts,
  fadingOutLogs,
  maxLogs
}: DataTabsProps) {
  const availableStreams = Object.keys(streamFilters).sort();
  
  // Filter messages based on enabled streams and limit per stream
  const filteredMessages = (() => {
    const messagesByStream: Record<string, StreamMessage[]> = {};
    
    messages.forEach(msg => {
      if (streamFilters[msg.streamName]?.enabled ?? true) {
        if (!messagesByStream[msg.streamName]) {
          messagesByStream[msg.streamName] = [];
        }
        messagesByStream[msg.streamName].push(msg);
      }
    });
    
    const limitedMessages: StreamMessage[] = [];
    Object.values(messagesByStream).forEach(streamMessages => {
      limitedMessages.push(...streamMessages.slice(0, maxMessagesPerStream));
    });
    
    return limitedMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  })();

  const hasUnreadLogs = unreadCounts.error > 0 || unreadCounts.warning > 0 || 
                       unreadCounts.success > 0 || unreadCounts.info > 0;

  return (
    <Tabs value={activeTab} onChange={onTabChange} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Tabs.List grow style={{ height: '48px', padding: '0 16px', flexShrink: 0 }}>
        <Tabs.Tab 
          value="streams"
          style={{ minWidth: '120px' }}
          rightSection={
            <BadgeWithAnimation 
              count={unreadStreamMessages} 
              color="blue" 
              isAnimating={fadingOutStreams}
            />
          }
        >
          Streams
        </Tabs.Tab>
        <Tabs.Tab 
          value="logs"
          style={{ minWidth: '120px' }}
          rightSection={
            hasUnreadLogs ? (
              <div style={{ display: 'flex', gap: '4px' }}>
                <BadgeWithAnimation count={unreadCounts.error} color="red" isAnimating={fadingOutLogs} />
                <BadgeWithAnimation count={unreadCounts.warning} color="yellow" isAnimating={fadingOutLogs} />
                <BadgeWithAnimation count={unreadCounts.success} color="green" isAnimating={fadingOutLogs} />
                <BadgeWithAnimation count={unreadCounts.info} color="blue" isAnimating={fadingOutLogs} />
              </div>
            ) : undefined
          }
        >
          Logs
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="streams" style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', paddingBottom: '0', flexShrink: 0 }}>
            <Text size="lg" fw={600} mb="xs">Stream Filters</Text>
            {availableStreams.length > 0 ? (
              <Stack gap="xs" mb="md">
                {availableStreams.map(streamName => (
                  <Checkbox
                    key={streamName}
                    checked={streamFilters[streamName]?.enabled ?? true}
                    onChange={() => onStreamToggle(streamName)}
                    label={`${streamName}: ${streamFilters[streamName]?.count ?? 0} documents`}
                    size="sm"
                  />
                ))}
              </Stack>
            ) : (
              <Text c="dimmed" size="sm" mb="md">No streams created yet</Text>
            )}
            
            {availableStreams.length > 0 && (
              <Group gap="xs" mb="md">
                <Button 
                  size="xs" 
                  variant="light" 
                  color="blue"
                  onClick={onFlushAllStreams}
                >
                  Flush All Streams
                </Button>
                <Button 
                  size="xs" 
                  variant="light" 
                  color="red"
                  onClick={onDeleteAllStreams}
                >
                  Delete All Streams
                </Button>
              </Group>
            )}
          </div>
          
          <div style={{ 
            padding: '8px 16px', 
            backgroundColor: '#f8f9fa', 
            fontSize: '12px',
            color: '#666',
            flexShrink: 0
          }}>
            Top {maxMessagesPerStream} recent messages per stream
          </div>
          
          <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px', paddingRight: '24px' }}>
            {filteredMessages.length === 0 ? (
              <Text c="dimmed" ta="center" mt="xl">
                No messages yet. Execute some commands to see data flowing through streams.
              </Text>
            ) : (
              filteredMessages.map((message) => (
                <Paper key={message.id} p="xs" mb="xs" withBorder style={{ backgroundColor: '#fafafa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <Text size="sm" fw={600} c="blue">
                      {message.streamName}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {message.timestamp.toLocaleTimeString()}
                    </Text>
                  </div>
                  <JsonDisplay data={message.data} compact />
                </Paper>
              ))
            )}
          </div>
        </div>
      </Tabs.Panel>

      <Tabs.Panel value="logs" style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ 
            padding: '8px 16px', 
            backgroundColor: '#f8f9fa', 
            fontSize: '12px',
            color: '#666',
            flexShrink: 0
          }}>
            Top {maxLogs} recent log entries
          </div>
          
          <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px', paddingRight: '24px' }}>
            {logs.length === 0 ? (
              <Text c="dimmed" ta="center" mt="xl">
                No logs yet. Execute some commands to see logs.
              </Text>
            ) : (
              logs.map((log) => (
                <Paper key={log.id} p="xs" mb="xs" withBorder style={{ backgroundColor: '#fafafa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <Badge 
                      size="sm" 
                      color={
                        log.level === 'error' ? 'red' : 
                        log.level === 'warning' ? 'yellow' : 
                        log.level === 'success' ? 'green' : 'blue'
                      }
                    >
                      {log.level.toUpperCase()}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {log.timestamp.toLocaleTimeString()}
                    </Text>
                  </div>
                  <Text size="sm" style={{ 
                    fontFamily: '"Roboto Mono", Monaco, Consolas, monospace',
                    wordWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                    fontSize: '11px',
                    lineHeight: '1.4'
                  }}>
                    {log.message}
                  </Text>
                </Paper>
              ))
            )}
          </div>
        </div>
      </Tabs.Panel>
    </Tabs>
  );
}