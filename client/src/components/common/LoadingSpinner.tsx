import React from 'react';
import clsx from 'clsx';

interface Props {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ className, size = 'md' }: Props) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
  return (
    <div
      role="status"
      aria-label="Loading"
      className={clsx(
        'border-2 border-slate-600 border-t-accent rounded-full animate-spin',
        sizes[size],
        className
      )}
    />
  );
}
