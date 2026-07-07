import Link from 'next/link';
import { BookOpen, LockKeyhole, Settings2, PenLine, GraduationCap } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CreateCourseButton } from '@/components/courses/CreateCourseButton';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/supabase/auth';
import type { Course } from '@/types/db';

export default async function CoursesPage() {
  const sessionUser = await getSessionUser();
  const isViewer = sessionUser?.profile?.role === 'viewer';

  const supabase = createServiceClient();
  const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
  const courses = (data ?? []) as unknown as Course[];

  return (
    <div>
      <PageHeader
        title="รายวิชา"
        description="จัดการโครงสร้างคะแนน กรอกคะแนน และตัดเกรดของแต่ละรายวิชา"
        action={!isViewer && <CreateCourseButton />}
      />

      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="ยังไม่มีรายวิชา"
          description="สร้างรายวิชาก่อนเพื่อเริ่มสร้างรอบเรียนและตั้งค่าคะแนน"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <GraduationCap className="h-5 w-5" aria-hidden="true" />
                </div>
                {course.is_locked && (
                  <Badge tone="primary">
                    <LockKeyhole className="h-3 w-3" aria-hidden="true" />
                    Lock แล้ว
                  </Badge>
                )}
              </div>

              <div>
                <p className="font-[family-name:var(--font-heading)] text-base font-semibold text-ink">
                  {course.course_name}
                </p>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {course.course_code ? `${course.course_code} · ` : ''}
                  ปี {course.academic_year} เทอม {course.semester}
                </p>
              </div>

              <div className="mt-auto flex flex-wrap gap-2">
                <Link href={`/courses/${course.id}/setup`}>
                  <Button variant="secondary" size="sm">
                    <Settings2 className="h-4 w-4" aria-hidden="true" />
                    ตั้งค่าคะแนน
                  </Button>
                </Link>
                <Link href={`/courses/${course.id}/entry`}>
                  <Button variant="secondary" size="sm">
                    <PenLine className="h-4 w-4" aria-hidden="true" />
                    กรอกคะแนน
                  </Button>
                </Link>
                <Link href={`/courses/${course.id}/grades`}>
                  <Button variant="secondary" size="sm">
                    <GraduationCap className="h-4 w-4" aria-hidden="true" />
                    สรุปเกรด
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
