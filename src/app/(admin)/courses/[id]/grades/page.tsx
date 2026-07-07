import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { CoursePageNav } from '@/components/scores/CoursePageNav';
import { GradeScaleEditor } from '@/components/scores/GradeScaleEditor';
import { GradeSummaryTable } from '@/components/scores/GradeSummaryTable';
import { LockGradeActions } from '@/components/scores/LockGradeActions';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/supabase/auth';
import { buildGradeSummary } from '@/lib/grades';
import type { Course, FinalGrade, GradeScale, ScoreCategory, ScoreComponent, Student, StudentScore, UserRole } from '@/types/db';

export default async function CourseGradesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();
  const sessionUser = await getSessionUser();

  const { data: courseRaw } = await supabase
    .from('courses')
    .select('id, course_name, is_locked, locked_at')
    .eq('id', id)
    .maybeSingle();
  const course = courseRaw as unknown as Course | null;
  if (!course) notFound();

  const { data: studentsRaw } = await supabase
    .from('students')
    .select('id, student_code, full_name, class_level')
    .eq('status', 'active')
    .order('student_code');
  const { data: categoriesRaw } = await supabase
    .from('score_categories')
    .select('id, kind')
    .eq('course_id', id)
    .order('sort_order');
  const { data: componentsRaw } = await supabase
    .from('score_components')
    .select('id, category_id, name, max_score, sort_order, created_at')
    .eq('course_id', id)
    .order('sort_order');
  const { data: scoresRaw } = await supabase
    .from('student_scores')
    .select('student_id, score_component_id, score')
    .eq('course_id', id);
  const { data: scalesRaw } = await supabase
    .from('grade_scales')
    .select('grade, min_score, max_score')
    .eq('course_id', id)
    .order('min_score', { ascending: false });
  const { data: finalRaw } = await supabase
    .from('final_grades')
    .select('student_id, special_status, remark')
    .eq('course_id', id);

  const finalGrades = (finalRaw ?? []) as unknown as FinalGrade[];
  const meta = new Map(finalGrades.map((row) => [row.student_id, { special_status: row.special_status, remark: row.remark }]));
  const rows = buildGradeSummary({
    students: (studentsRaw ?? []) as unknown as Student[],
    categories: (categoriesRaw ?? []) as unknown as ScoreCategory[],
    components: (componentsRaw ?? []) as unknown as ScoreComponent[],
    scores: (scoresRaw ?? []) as unknown as StudentScore[],
    scales: (scalesRaw ?? []) as unknown as GradeScale[],
    finalGradeMeta: meta,
  });

  return (
    <div>
      <PageHeader
        title={`สรุปเกรด: ${course.course_name}`}
        description="ตรวจคะแนนรวม ตั้งค่า Grade Scale และ Lock ผลเกรด"
        action={
          <Link href={`/api/export/courses/${course.id}`}>
            <Button variant="secondary">
              <Download className="h-4 w-4" aria-hidden="true" />
              Export Excel
            </Button>
          </Link>
        }
      />
      <CoursePageNav courseId={id} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <GradeSummaryTable course={course} rows={rows} />
        <div className="flex flex-col gap-4">
          <GradeScaleEditor course={course} scales={(scalesRaw ?? []) as unknown as GradeScale[]} />
          <LockGradeActions course={course} role={(sessionUser?.profile?.role ?? 'teacher') as UserRole} />
        </div>
      </div>
    </div>
  );
}
