import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {}

function Badge({ className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-[var(--panel-2)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted',
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
