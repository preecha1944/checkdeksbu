import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';
import { buildGradeSummary } from '@/lib/grades';
import type { Course, FinalGrade, GradeScale, ScoreCategory, ScoreComponent, Student, StudentScore } from '@/types/db';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const { id: courseId } = await params;
  const supabase = createServiceClient();
  const { data: courseRaw } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle();
  const course = courseRaw as unknown as Course | null;
  if (!course) return jsonError('ไม่พบรายวิชา', 404);
  if (course.is_locked) return jsonError('รายวิชานี้ Lock แล้ว', 400);

  const { data: scalesRaw } = await supabase.from('grade_scales').select('*').eq('course_id', courseId);
  const scales = (scalesRaw ?? []) as unknown as GradeScale[];
  if (scales.length === 0) return jsonError('ต้องตั้งค่า Grade Scale ก่อน Lock');

  const { data: studentsRaw } = await supabase.from('students').select('*').eq('status', 'active').order('student_code');
  const { data: categoriesRaw } = await supabase.from('score_categories').select('*').eq('course_id', courseId).order('sort_order');
  const { data: componentsRaw } = await supabase.from('score_components').select('*').eq('course_id', courseId).order('sort_order');
  const { data: scoresRaw } = await supabase.from('student_scores').select('*').eq('course_id', courseId);
  const { data: finalRaw } = await supabase.from('final_grades').select('*').eq('course_id', courseId);

  const finalGrades = (finalRaw ?? []) as unknown as FinalGrade[];
  const meta = new Map(finalGrades.map((row) => [row.student_id, { special_status: row.special_status, remark: row.remark }]));
  const rows = buildGradeSummary({
    students: (studentsRaw ?? []) as unknown as Student[],
    categories: (categoriesRaw ?? []) as unknown as ScoreCategory[],
    components: (componentsRaw ?? []) as unknown as ScoreComponent[],
    scores: (scoresRaw ?? []) as unknown as StudentScore[],
    scales,
    finalGradeMeta: meta,
  });

  const payload = rows.map((row) => ({
    course_id: courseId,
    student_id: row.student.id,
    coursework_score: row.coursework,
    attendance_score: row.attendance,
    midterm_score: row.midterm,
    final_score: row.final,
    total_score: row.total,
    grade: row.grade,
    special_status: row.special_status,
    remark: row.remark,
    updated_at: new Date().toISOString(),
  }));

  if (payload.length > 0) {
    const { error: upsertError } = await supabase
      .from('final_grades')
      .upsert(payload, { onConflict: 'course_id,student_id' });
    if (upsertError) return jsonError(upsertError.message, 500);
  }

  const { error: lockError } = await supabase
    .from('courses')
    .update({ is_locked: true, locked_at: new Date().toISOString() })
    .eq('id', courseId);
  if (lockError) return jsonError(lockError.message, 500);

  return NextResponse.json({ locked: true, rows: payload.length });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  if (auth.profile?.role !== 'admin') return jsonError('เฉพาะผู้ดูแลระบบเท่านั้นที่ปลดล็อกได้', 403);

  const { id: courseId } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('courses')
    .update({ is_locked: false, locked_at: null })
    .eq('id', courseId);

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ locked: false });
}
