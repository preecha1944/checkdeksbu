import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/Card';

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tint?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'orange' | 'primary-light';
  className?: string;
}

const TINT_CLASSES: Record<NonNullable<StatCardProps['tint']>, string> = {
  primary: 'bg-primary-soft text-primary',
  'primary-light': 'bg-primary-soft/60 text-primary-deep',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  orange: 'bg-orange-100 text-orange-700',
};

export function StatCard({ icon: Icon, label, value, hint, tint = 'primary', className }: StatCardProps) {
  return (
    <Card className={cn('flex min-h-28 flex-col justify-between gap-3', className)}>
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', TINT_CLASSES[tint])}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
        <p className="font-[family-name:var(--font-heading)] text-2xl font-bold text-ink">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
      </div>
    </Card>
  );
}
