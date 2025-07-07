import React, { memo, useMemo } from 'react';
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

interface ConsoleEntry {
  id: string;
  timestamp: Date;
  command: string;
  response: any;
}

interface FlowInfo {
  queryId: number;
  flowName: string;
  source: { type: string; name: string };
  sinks: { type: string; name: string; order: number }[];
  ttlSeconds?: number;
  status: string;
  startTime: Date;
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
  
  // Console data  
  consoleEntries: ConsoleEntry[];
  unreadConsoleEntries: number;
  fadingOutConsole: boolean;
  maxConsoleEntries: number;
  
  // Flow data
  activeFlows: FlowInfo[];
}

export const DataTabs = memo(function DataTabs({
  activeTab,
  onTabChange,
  messages,
  streamFilters,
  onStreamToggle,
  unreadStreamMessages,
  fadingOutStreams,
  maxMessagesPerStream,
  onFlushAllStreams,
  consoleEntries,
  unreadConsoleEntries,
  fadingOutConsole,
  maxConsoleEntries,
  activeFlows
}: DataTabsProps) {
  const availableStreams = useMemo(() => Object.keys(streamFilters).sort(), [streamFilters]);
  
  // Filter messages based on enabled streams and limit per stream
  const filteredMessages = useMemo(() => {
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
  }, [messages, streamFilters, maxMessagesPerStream]);

  const hasUnreadConsole = unreadConsoleEntries > 0;

  return (
    <Tabs value={activeTab} onChange={onTabChange} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Tabs.List grow style={{ height: '48px', padding: '0 16px', flexShrink: 0 }}>
        <Tabs.Tab value="flows" style={{ minWidth: '120px' }}>
          Flows
        </Tabs.Tab>
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
          value="console"
          style={{ minWidth: '120px' }}
          rightSection={
            hasUnreadConsole ? (
              <BadgeWithAnimation 
                count={unreadConsoleEntries} 
                color="blue" 
                isAnimating={fadingOutConsole} 
              />
            ) : undefined
          }
        >
          Console
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="flows" style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', paddingBottom: '0', flexShrink: 0 }}>
            <Text size="lg" fw={600} mb="xs">Active Flows</Text>
            {activeFlows.length > 0 ? (
              <Stack gap="xs" mb="md">
                {activeFlows.map(flow => {
                  const ttlDisplay = flow.ttlSeconds ? ` (ttl:${flow.ttlSeconds}s)` : '';
                  
                  return (
                    <Paper key={flow.queryId} p="sm" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <Text size="sm" fw={600} c="blue">
                          {flow.flowName}{ttlDisplay}
                        </Text>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Source */}
                        <Badge size="sm" color="green" variant="light">
                          {flow.source.type}: {flow.source.name}
                        </Badge>
                        
                        {/* Arrow and sinks */}
                        {flow.sinks.map((sink, index) => (
                          <React.Fragment key={index}>
                            <Text size="xs" c="dimmed">→</Text>
                            <Badge size="sm" color="blue" variant="light">
                              {sink.type}: {sink.name}
                            </Badge>
                          </React.Fragment>
                        ))}
                      </div>
                    </Paper>
                  );
                })}
              </Stack>
            ) : (
              <Text c="dimmed" size="sm" mb="md">No active flows</Text>
            )}
          </div>
        </div>
      </Tabs.Panel>

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
          
          <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px', paddingRight: '24px', minHeight: '200px', contain: 'layout' }}>
            {filteredMessages.length === 0 ? (
              <div style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text c="dimmed" ta="center">
                  No messages yet. Execute some commands to see data flowing through streams.
                </Text>
              </div>
            ) : (
              filteredMessages.map((message) => (
                <Paper key={message.id} p="xs" mb="xs" withBorder style={{ backgroundColor: '#fafafa', minHeight: '60px', willChange: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <Text size="sm" fw={600} c="blue">
                      {message.streamName}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {message.timestamp.toLocaleTimeString()}
                    </Text>
                  </div>
                  <div style={{ minHeight: '30px' }}>
                    <JsonDisplay data={message.data} compact />
                  </div>
                </Paper>
              ))
            )}
          </div>
        </div>
      </Tabs.Panel>

      <Tabs.Panel value="console" style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ 
            padding: '8px 16px', 
            backgroundColor: '#f8f9fa', 
            fontSize: '12px',
            color: '#666',
            flexShrink: 0
          }}>
            Top {maxConsoleEntries} recent console entries
          </div>
          
          <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px', paddingRight: '24px', minHeight: '200px', contain: 'layout' }}>
            {consoleEntries.length === 0 ? (
              <div style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text c="dimmed" ta="center">
                  No console entries yet. Execute some commands to see the console.
                </Text>
              </div>
            ) : (
              consoleEntries.map((entry) => (
                <Paper key={entry.id} p="md" mb="md" withBorder style={{ backgroundColor: '#fafafa', minHeight: '120px', willChange: 'auto' }}>
                  {/* Command Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <Badge size="sm" color="blue">
                      COMMAND
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {entry.timestamp.toLocaleTimeString()}
                    </Text>
                  </div>
                  
                  {/* Command */}
                  <Paper p="xs" mb="sm" style={{ backgroundColor: '#2a2a2a', border: '1px solid #444', minHeight: '32px' }}>
                    <Text size="sm" style={{ 
                      fontFamily: '"Roboto Mono", Monaco, Consolas, monospace',
                      color: '#7dd3fc',
                      fontSize: '12px',
                      fontWeight: 500
                    }}>
                      {entry.command}
                    </Text>
                  </Paper>
                  
                  {/* Response Header */}
                  <Badge 
                    size="sm" 
                    color={entry.response?.success === false ? 'red' : 'green'}
                    mb="xs"
                  >
                    RESPONSE
                  </Badge>
                  
                  {/* Response */}
                  <div style={{ minHeight: '40px' }}>
                    <JsonDisplay data={entry.response} />
                  </div>
                </Paper>
              ))
            )}
          </div>
        </div>
      </Tabs.Panel>
    </Tabs>
  );
});