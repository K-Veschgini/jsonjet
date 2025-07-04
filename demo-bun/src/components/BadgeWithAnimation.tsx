import React from 'react';
import { Badge } from '@mantine/core';

interface BadgeWithAnimationProps {
  count: number;
  color: string;
  isAnimating?: boolean;
}

export function BadgeWithAnimation({ count, color, isAnimating = false }: BadgeWithAnimationProps) {
  if (count === 0) return null;

  return (
    <Badge 
      size="xs" 
      color={color}
      style={{ 
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        opacity: isAnimating ? 0 : 1,
        transform: isAnimating ? 'scale(0.8)' : 'scale(1)'
      }}
    >
      {count}
    </Badge>
  );
}