import React from 'react';
import { ShapeProps } from '../types';

export const Triangle: React.FC<ShapeProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 4L22 20H2z" />
  </svg>
);

export const Diamond: React.FC<ShapeProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2L22 12L12 22L2 12z" />
  </svg>
);

export const Circle: React.FC<ShapeProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="12" cy="12" r="10" />
  </svg>
);

export const Square: React.FC<ShapeProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="4" y="4" width="16" height="16" />
  </svg>
);

export const Sparkles: React.FC<ShapeProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2L14.4 7.2L20 9L14.4 10.8L12 16L9.6 10.8L4 9L9.6 7.2L12 2Z" />
    <path d="M19 15L20.2 17.8L23 19L20.2 20.2L19 23L17.8 20.2L15 19L17.8 17.8L19 15Z" />
    <path d="M5 16L5.8 17.8L8 19L5.8 20.2L5 22L4.2 20.2L2 19L4.2 17.8L5 16Z" />
  </svg>
);