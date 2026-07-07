'use client';

import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/components/layout/Sidebar';

export interface TopbarProps {
  fullName: string;
}

export function Topbar({ fullName }: TopbarProps) {
  const pathname = usePathname();
  const current = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname?.startsWith(`${item.href}/`)
  );

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border-soft bg-card/80 px-6 backdrop-blur">
      <h1 className="ml-12 font-[family-name:var(--font-heading)] text-lg font-semibold text-ink lg:ml-0">
        {current?.label ?? 'ระบบเช็คชื่อและตัดเกรด'}
      </h1>
      <p className="hidden text-sm font-medium text-ink-muted sm:block">{fullName}</p>
    </header>
  );
}
