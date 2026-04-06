/**
 * Wraps Chart.js components to fix "Canvas is already in use" error
 * caused by React Strict Mode double-mounting in development.
 * Delays chart render until after mount cycle completes (next macrotask).
 */
import React, { useState, useEffect } from 'react';

interface ChartWrapperProps {
  children: React.ReactNode;
  height?: string | number;
}

const ChartWrapper: React.FC<ChartWrapperProps> = ({ children, height = '100%' }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);

  if (!mounted) {
    return <div style={{ height: typeof height === 'number' ? `${height}px` : height, minHeight: 60 }} />;
  }

  return <>{children}</>;
};

export default ChartWrapper;
