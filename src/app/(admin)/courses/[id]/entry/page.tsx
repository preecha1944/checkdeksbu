import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { ScoreEntryTable } from '@/components/scores/ScoreEntryTable';
import { CoursePageNav } from '@/components/scores/CoursePageNav';
import { createServiceClient } from '@/lib/supabase/server';
import type { Course, GradeScale, ScoreCategory, ScoreComponent, Student, StudentScore } from '@/types/db';

export default async function CourseEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: courseRaw } = await supabase.from('courses').select('*').eq('id', id).maybeSingle();
  const course = courseRaw as unknown as Course | null;
  if (!course) notFound();

  const { data: studentsRaw } = await supabase.from('students').select('*').eq('status', 'active').order('student_code');
  const { data: categoriesRaw } = await supabase.from('score_categories').select('*').eq('course_id', id).order('sort_order');
  const { data: componentsRaw } = await supabase.from('score_components').select('*').eq('course_id', id).order('sort_order');
  const { data: scoresRaw } = await supabase.from('student_scores').select('*').eq('course_id', id);
  const { data: scalesRaw } = await supabase.from('grade_scales').select('*').eq('course_id', id).order('min_score', { ascending: false });

  return (
    <div>
      <PageHeader
        title={`กรอกคะแนน: ${course.course_name}`}
        description={course.is_locked ? 'รายวิชานี้ถูก Lock แล้ว แก้ไขคะแนนไม่ได้' : 'กรอกคะแนนของนักศึกษาและคำนวณ Total/Grade สด'}
      />
      <CoursePageNav courseId={id} />
      <ScoreEntryTable
        course={course}
        students={(studentsRaw ?? []) as unknown as Student[]}
        categories={(categoriesRaw ?? []) as unknown as ScoreCategory[]}
        components={(componentsRaw ?? []) as unknown as ScoreComponent[]}
        scores={(scoresRaw ?? []) as unknown as StudentScore[]}
        scales={(scalesRaw ?? []) as unknown as GradeScale[]}
      />
    </div>
  );
}
