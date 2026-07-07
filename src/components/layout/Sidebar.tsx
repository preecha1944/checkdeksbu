'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  GraduationCap,
  LayoutDashboard,
  CalendarClock,
  Users,
  BookOpen,
  FileBarChart,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
  { href: '/sessions', label: 'รอบเรียน', icon: CalendarClock },
  { href: '/students', label: 'นักศึกษา', icon: Users },
  { href: '/courses', label: 'รายวิชา/คะแนน', icon: BookOpen },
  { href: '/reports', label: 'รายงาน', icon: FileBarChart },
];

export interface SidebarProps {
  fullName: string;
  role: string;
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ',
  teacher: 'อาจารย์ผู้สอน',
  viewer: 'ผู้เข้าชม',
};

export function Sidebar({ fullName, role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const navList = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              'flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium cursor-pointer',
              'transition-colors duration-150 ease-out',
              active ? 'bg-primary text-white' : 'text-ink-muted hover:bg-primary-soft'
            )}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarContent = (
    <div className="flex h-full w-60 flex-col bg-card">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
          <GraduationCap className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="leading-tight">
          <p className="font-[family-name:var(--font-heading)] text-sm font-semibold text-ink">
            ระบบเช็คชื่อ
          </p>
          <p className="font-[family-name:var(--font-heading)] text-sm font-semibold text-ink">
            และตัดเกรด
          </p>
        </div>
      </div>

      {navList}

      <div className="border-t border-border-soft p-4">
        <div className="mb-3">
          <p className="truncate text-sm font-medium text-ink">{fullName}</p>
          <p className="text-xs text-ink-muted">{ROLE_LABEL[role] ?? role}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            'flex h-11 w-full cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-medium text-ink-muted',
            'transition-colors duration-150 ease-out hover:bg-danger-soft hover:text-danger',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
          )}
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          ออกจากระบบ
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ปุ่ม hamburger สำหรับมือถือ/แท็บเล็ต (< 1024px) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="เปิดเมนู"
        className={cn(
          'fixed left-4 top-4 z-40 flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl',
          'border border-border-soft bg-card shadow-sm lg:hidden',
          'transition-colors duration-150 hover:bg-primary-soft',
          open && 'hidden'
        )}
      >
        <Menu className="h-5 w-5 text-ink" aria-hidden="true" />
      </button>

      {/* Sidebar เต็มความสูงฝั่ง desktop */}
      <aside className="sticky top-0 hidden h-screen shrink-0 border-r border-border-soft lg:block">
        {sidebarContent}
      </aside>

      {/* Drawer สำหรับมือถือ */}
      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            role="presentation"
          />
          <div className="relative z-10 h-full border-r border-border-soft shadow-lg">
            {sidebarContent}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="ปิดเมนู"
              className={cn(
                'absolute right-3 top-6 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full',
                'text-ink-muted transition-colors duration-150 hover:bg-neutral-soft'
              )}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
