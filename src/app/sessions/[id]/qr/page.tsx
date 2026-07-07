import { redirect, notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/supabase/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { QrDisplay } from '@/components/qr/QrDisplay';
import type { ClassSession } from '@/types/db';

export default async function SessionQrPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect('/login');

  const supabase = createServiceClient();
  const { data: sessionRow } = await supabase.from('class_sessions').select('*').eq('id', id).maybeSingle();
  if (!sessionRow) notFound();

  const session = sessionRow as unknown as ClassSession;

  if (session.status !== 'open') {
    redirect(`/sessions/${id}`);
  }

  const { data: course } = session.course_id
    ? await supabase.from('courses').select('course_name').eq('id', session.course_id).maybeSingle()
    : { data: null };

  return (
    <QrDisplay
      session={{
        id: session.id,
        title: session.title,
        courseName: course?.course_name ?? null,
        learningDate: session.learning_date,
        startTime: session.start_time,
        endTime: session.end_time,
      }}
    />
  );
}
