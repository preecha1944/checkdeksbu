'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  CalendarClock,
  FileBarChart,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  PenLine,
  Settings2,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: ['/dashboard'] },
  { href: '/sessions', label: 'Sessions', icon: CalendarClock, match: ['/sessions'] },
  { href: '/students', label: 'Students', icon: Users, match: ['/students'] },
  { href: '/courses', label: 'Score Setup', icon: Settings2, match: ['/courses', '/setup'] },
  { href: '/courses', label: 'Score Entry', icon: PenLine, match: ['/entry'] },
  { href: '/courses', label: 'Grade Summary', icon: BookOpen, match: ['/grades'] },
  { href: '/reports', label: 'Reports', icon: FileBarChart, match: ['/reports'] },
];

export function isNavItemActive(pathname: string | null, item: (typeof NAV_ITEMS)[number]) {
  if (!pathname) return false;
  if (item.match.includes('/courses')) return pathname === '/courses' || pathname.includes('/setup');
  return item.match.some((pattern) => pathname === pattern || pathname.includes(pattern));
}

export interface SidebarProps {
  fullName: string;
  role: string;
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'System Administrator',
  teacher: 'Teacher',
  viewer: 'Viewer',
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
    <nav className="flex flex-1 flex-col gap-1.5 px-3">
      {NAV_ITEMS.map((item, index) => {
        const active = isNavItemActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={`${item.href}-${index}`}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              'flex h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-semibold',
              'transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
              active ? 'bg-white/18 text-white shadow-sm' : 'text-white/78 hover:bg-white/12 hover:text-white'
            )}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const sidebarContent = (
    <div className="flex h-full w-64 flex-col bg-gradient-to-b from-primary-deep via-primary-dark to-[#241044] text-white">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/10">
          <GraduationCap className="h-7 w-7" aria-hidden="true" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="font-[family-name:var(--font-heading)] text-sm font-bold">Student Attendance &</p>
          <p className="font-[family-name:var(--font-heading)] text-sm font-bold">Grade Management</p>
        </div>
      </div>

      {navList}

      <div className="p-4">
        <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
          <div className="mb-3">
            <p className="truncate text-sm font-semibold text-white">{fullName}</p>
            <p className="text-xs text-white/70">{ROLE_LABEL[role] ?? role}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              'flex h-10 w-full cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold text-white/80',
              'transition-colors duration-200 ease-out hover:bg-white/12 hover:text-white',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70'
            )}
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="เปิดเมนู"
        className={cn(
          'fixed left-4 top-4 z-40 flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl',
          'border border-border-soft bg-card shadow-sm lg:hidden',
          'transition-colors duration-200 hover:bg-primary-soft',
          open && 'hidden'
        )}
      >
        <Menu className="h-5 w-5 text-ink" aria-hidden="true" />
      </button>

      <aside className="sticky top-0 hidden h-screen shrink-0 lg:block">{sidebarContent}</aside>

      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} role="presentation" />
          <div className="relative z-10 h-full shadow-2xl">
            {sidebarContent}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="ปิดเมนู"
              className="absolute right-3 top-6 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white/75 transition-colors duration-200 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
