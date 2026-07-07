import Link from 'next/link';
import { BookOpen, GraduationCap, LockKeyhole, PenLine, Settings2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CreateCourseButton } from '@/components/courses/CreateCourseButton';
import { EditCourseButton } from '@/components/courses/EditCourseButton';
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
        title="รายวิชาและคะแนน"
        description="เลือกวิชาก่อนเข้าสู่ Score Setup, Score Entry หรือ Grade Summary"
        action={!isViewer && <CreateCourseButton />}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Score Setup" description="ตั้งค่างานย่อย coursework และดึงคะแนน Attendance" />
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Settings2 className="h-5 w-5" aria-hidden="true" />
          </div>
        </Card>
        <Card>
          <CardHeader title="Score Entry" description="กรอกคะแนนรายคน คำนวณ total และ grade แบบสด" />
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info-soft text-info">
            <PenLine className="h-5 w-5" aria-hidden="true" />
          </div>
        </Card>
        <Card>
          <CardHeader title="Grade Summary" description="ตรวจสรุปเกรด ตั้งค่า grade scale และ Lock Grade" />
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-soft text-success">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </div>
        </Card>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="ยังไม่มีรายวิชา"
          description="สร้างรายวิชาแรกก่อนเริ่มตั้งค่าคะแนนและกรอกคะแนน"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                    Setup
                  </Button>
                </Link>
                <Link href={`/courses/${course.id}/entry`}>
                  <Button variant="secondary" size="sm">
                    <PenLine className="h-4 w-4" aria-hidden="true" />
                    Entry
                  </Button>
                </Link>
                <Link href={`/courses/${course.id}/grades`}>
                  <Button variant="secondary" size="sm">
                    <GraduationCap className="h-4 w-4" aria-hidden="true" />
                    Summary
                  </Button>
                </Link>
                {!isViewer && <EditCourseButton course={course} />}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
