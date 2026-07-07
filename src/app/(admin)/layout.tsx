import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/supabase/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect('/login');
  }

  const fullName = sessionUser.profile?.full_name || sessionUser.email || 'ผู้ใช้งาน';
  const role = sessionUser.profile?.role ?? 'teacher';

  return (
    <div className="flex min-h-screen">
      <Sidebar fullName={fullName} role={role} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar fullName={fullName} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
