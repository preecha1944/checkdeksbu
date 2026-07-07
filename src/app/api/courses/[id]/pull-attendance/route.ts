import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';
import { roundScore } from '@/lib/grades';
import type { AttendanceFinalStatus, Course, ScoreCategory, ScoreComponent, Student } from '@/types/db';

const COMPLETE_STATUSES: AttendanceFinalStatus[] = ['present', 'late', 'early_leave'];

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
  if (course.is_locked) return jsonError('รายวิชาถูก Lock แล้ว', 403);

  const { data: categoriesRaw } = await supabase.from('score_categories').select('*').eq('course_id', courseId);
  const categories = (categoriesRaw ?? []) as unknown as ScoreCategory[];
  const attendanceCategory = categories.find((category) => category.kind === 'attendance');
  if (!attendanceCategory) return jsonError('ไม่พบหมวด Attendance', 404);

  const { data: componentRaw } = await supabase
    .from('score_components')
    .select('*')
    .eq('course_id', courseId)
    .eq('category_id', attendanceCategory.id)
    .eq('is_system', true)
    .maybeSingle();
  const component = componentRaw as unknown as ScoreComponent | null;
  if (!component) return jsonError('ไม่พบช่องคะแนน Attendance', 404);

  const { data: sessionsRaw } = await supabase
    .from('class_sessions')
    .select('id')
    .eq('course_id', courseId)
    .eq('status', 'closed');
  const sessions = (sessionsRaw ?? []) as unknown as { id: string }[];
  if (sessions.length === 0) return jsonError('ยังไม่มีรอบเรียนที่ปิดแล้วสำหรับวิชานี้');

  const { data: studentsRaw } = await supabase.from('students').select('*').eq('status', 'active');
  const students = (studentsRaw ?? []) as unknown as Student[];
  const sessionIds = sessions.map((session) => session.id);
  const { data: recordsRaw } = await supabase
    .from('attendance_records')
    .select('student_id, final_status')
    .in('session_id', sessionIds);
  const records = (recordsRaw ?? []) as unknown as Array<{
    student_id: string;
    final_status: AttendanceFinalStatus | null;
  }>;

  const recordsByStudent = new Map<string, typeof records>();
  for (const record of records) {
    const list = recordsByStudent.get(record.student_id) ?? [];
    list.push(record);
    recordsByStudent.set(record.student_id, list);
  }

  const rows = students.map((student) => {
    const complete = (recordsByStudent.get(student.id) ?? []).filter((record) =>
      record.final_status ? COMPLETE_STATUSES.includes(record.final_status) : false
    ).length;
    return {
      course_id: courseId,
      student_id: student.id,
      score_component_id: component.id,
      score: Math.min(Number(component.max_score), roundScore((complete / sessions.length) * Number(component.max_score), 1)),
      updated_at: new Date().toISOString(),
    };
  });

  if (rows.length > 0) {
    const { error } = await supabase
      .from('student_scores')
      .upsert(rows, { onConflict: 'course_id,student_id,score_component_id' });
    if (error) return jsonError(error.message, 500);
  }

  return NextResponse.json({ updated: rows.length, totalSessions: sessions.length });
}
