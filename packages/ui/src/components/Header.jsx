import React from 'react';
import { Title } from '@mantine/core';

export function Header() {
  return (
    <div style={{ 
      height: '60px', 
      borderBottom: '1px solid #e0e0e0',
      display: 'flex', 
      alignItems: 'center',
      padding: '0 24px',
      backgroundColor: 'white',
      flexShrink: 0
    }}>
      <Title order={3} c="blue">
        🗃️ JSONJet Query Demo
      </Title>
    </div>
  );
}