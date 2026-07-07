import { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { BadgeTone } from '@/lib/status';

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  orange: 'bg-orange-100 text-orange-700',
  primary: 'bg-primary-soft text-primary-deep',
  info: 'bg-info-soft text-info',
  neutral: 'bg-neutral-soft text-ink-muted',
};

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold',
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
