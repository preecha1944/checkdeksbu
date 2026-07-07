'use client';

import { Bell, ChevronDown, Search } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { isNavItemActive, NAV_ITEMS } from '@/components/layout/Sidebar';

export interface TopbarProps {
  fullName: string;
}

export function Topbar({ fullName }: TopbarProps) {
  const pathname = usePathname();
  const current = NAV_ITEMS.find((item) => isNavItemActive(pathname, item));

  return (
    <header className="sticky top-0 z-30 border-b border-border-soft/80 bg-white/80 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 pl-12 lg:pl-0">
          <h1 className="font-[family-name:var(--font-heading)] text-xl font-bold text-ink">
            {current?.label ?? 'Dashboard'}
          </h1>
          <p className="mt-0.5 hidden text-sm text-ink-muted sm:block">ภาพรวมการเข้าเรียนและการตัดเกรด</p>
        </div>

        <div className="hidden min-w-72 max-w-md flex-1 items-center gap-3 rounded-xl border border-border-soft bg-white px-3 py-2 shadow-sm xl:flex">
          <Search className="h-4 w-4 text-ink-muted" aria-hidden="true" />
          <span className="text-sm text-ink-muted">Search students, sessions...</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="การแจ้งเตือน"
            className="hidden h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-border-soft bg-white text-ink-muted transition-colors duration-200 hover:bg-primary-soft hover:text-primary lg:flex"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {fullName.slice(0, 1).toUpperCase()}
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="max-w-32 truncate text-sm font-semibold text-ink">{fullName}</p>
              <p className="text-xs text-ink-muted">Admin</p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-ink-muted sm:block" aria-hidden="true" />
          </div>
        </div>
      </div>
    </header>
  );
}
