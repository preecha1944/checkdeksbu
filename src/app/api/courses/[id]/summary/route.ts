import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';
import { buildGradeSummary } from '@/lib/grades';
import type { Course, FinalGrade, GradeScale, ScoreCategory, ScoreComponent, SpecialStatus, Student, StudentScore } from '@/types/db';

async function loadSummaryData(courseId: string) {
  const supabase = createServiceClient();
  const { data: courseRaw } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle();
  const course = courseRaw as unknown as Course | null;
  if (!course) return { supabase, error: jsonError('ไม่พบรายวิชา', 404) };

  const { data: studentsRaw } = await supabase.from('students').select('*').eq('status', 'active').order('student_code');
  const { data: categoriesRaw } = await supabase.from('score_categories').select('*').eq('course_id', courseId).order('sort_order');
  const { data: componentsRaw } = await supabase.from('score_components').select('*').eq('course_id', courseId).order('sort_order');
  const { data: scoresRaw } = await supabase.from('student_scores').select('*').eq('course_id', courseId);
  const { data: scalesRaw } = await supabase.from('grade_scales').select('*').eq('course_id', courseId).order('min_score', { ascending: false });
  const { data: finalRaw } = await supabase.from('final_grades').select('*').eq('course_id', courseId);

  return {
    supabase,
    course,
    students: (studentsRaw ?? []) as unknown as Student[],
    categories: (categoriesRaw ?? []) as unknown as ScoreCategory[],
    components: (componentsRaw ?? []) as unknown as ScoreComponent[],
    scores: (scoresRaw ?? []) as unknown as StudentScore[],
    scales: (scalesRaw ?? []) as unknown as GradeScale[],
    finalGrades: (finalRaw ?? []) as unknown as FinalGrade[],
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const { id: courseId } = await params;
  const loaded = await loadSummaryData(courseId);
  if ('error' in loaded) return loaded.error;

  const meta = new Map(
    loaded.finalGrades.map((row) => [row.student_id, { special_status: row.special_status, remark: row.remark }])
  );
  const rows = buildGradeSummary({
    students: loaded.students,
    categories: loaded.categories,
    components: loaded.components,
    scores: loaded.scores,
    scales: loaded.scales,
    finalGradeMeta: meta,
  });

  return NextResponse.json({ course: loaded.course, rows });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const { id: courseId } = await params;
  const body = await request.json().catch(() => null);
  const studentId = typeof body?.student_id === 'string' ? body.student_id : '';
  const specialStatus = body?.special_status ? (String(body.special_status) as SpecialStatus) : null;
  const remark = typeof body?.remark === 'string' ? body.remark.trim() || null : null;
  if (!studentId) return jsonError('ไม่พบนักศึกษา');

  const loaded = await loadSummaryData(courseId);
  if ('error' in loaded) return loaded.error;
  if (loaded.course.is_locked) return jsonError('รายวิชาถูก Lock แล้ว', 403);

  const rows = buildGradeSummary({
    students: loaded.students.filter((student) => student.id === studentId),
    categories: loaded.categories,
    components: loaded.components,
    scores: loaded.scores.filter((score) => score.student_id === studentId),
    scales: loaded.scales,
    finalGradeMeta: new Map([[studentId, { special_status: specialStatus, remark }]]),
  });
  const row = rows[0];
  if (!row) return jsonError('ไม่พบนักศึกษา', 404);

  const { data, error } = await loaded.supabase
    .from('final_grades')
    .upsert(
      {
        course_id: courseId,
        student_id: studentId,
        coursework_score: row.coursework,
        attendance_score: row.attendance,
        midterm_score: row.midterm,
        final_score: row.final,
        total_score: row.total,
        grade: row.grade,
        special_status: specialStatus,
        remark,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'course_id,student_id' }
    )
    .select('*')
    .single();

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ finalGrade: data });
}
