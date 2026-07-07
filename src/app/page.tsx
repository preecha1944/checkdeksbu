import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/supabase/auth';

export default async function HomePage() {
  const sessionUser = await getSessionUser();

  if (sessionUser) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
