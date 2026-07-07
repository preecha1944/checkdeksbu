import { PageHeader } from '@/components/ui/PageHeader';
import { StudentsTable } from '@/components/students/StudentsTable';
import { StudentsPageActions } from '@/components/students/StudentsPageActions';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/supabase/auth';
import type { Student } from '@/types/db';

export default async function StudentsPage() {
  const sessionUser = await getSessionUser();
  const isViewer = sessionUser?.profile?.role === 'viewer';

  const supabase = createServiceClient();
  const { data: studentsRaw } = await supabase
    .from('students')
    .select('*')
    .order('student_code', { ascending: true });
  const students = (studentsRaw ?? []) as unknown as Student[];

  return (
    <div>
      <PageHeader
        title="นักศึกษา"
        description="จัดการรายชื่อนักศึกษาในระบบ"
        action={!isViewer && <StudentsPageActions />}
      />
      <StudentsTable students={students} isViewer={isViewer} />
    </div>
  );
}
