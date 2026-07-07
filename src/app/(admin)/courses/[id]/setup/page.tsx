import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { ScoreSetupPanel } from '@/components/scores/ScoreSetupPanel';
import { CoursePageNav } from '@/components/scores/CoursePageNav';
import { createServiceClient } from '@/lib/supabase/server';
import type { Course, ScoreCategory, ScoreComponent } from '@/types/db';

export default async function CourseSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: courseRaw } = await supabase.from('courses').select('*').eq('id', id).maybeSingle();
  const course = courseRaw as unknown as Course | null;
  if (!course) notFound();

  const { data: categoriesRaw } = await supabase
    .from('score_categories')
    .select('*')
    .eq('course_id', id)
    .order('sort_order');
  const { data: componentsRaw } = await supabase
    .from('score_components')
    .select('*')
    .eq('course_id', id)
    .order('sort_order');

  const categories = (categoriesRaw ?? []) as unknown as ScoreCategory[];
  const components = (componentsRaw ?? []) as unknown as ScoreComponent[];

  return (
    <div>
      <PageHeader
        title={`ตั้งค่าคะแนน: ${course.course_name}`}
        description={`${course.course_code ? `${course.course_code} · ` : ''}ปี ${course.academic_year} เทอม ${course.semester}`}
      />
      <CoursePageNav courseId={id} />
      <ScoreSetupPanel course={course} categories={categories} components={components} />
    </div>
  );
}
