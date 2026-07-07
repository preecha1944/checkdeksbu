import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';
import type { Course, ScoreComponent } from '@/types/db';

interface ScorePayload {
  studentId: string;
  componentId: string;
  score: unknown;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const { id: courseId } = await params;
  const body = await request.json().catch(() => null);
  const scores = Array.isArray(body?.scores) ? (body.scores as ScorePayload[]) : [];

  const supabase = createServiceClient();
  const { data: courseRaw } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle();
  const course = courseRaw as unknown as Course | null;
  if (!course) return jsonError('ไม่พบรายวิชา', 404);
  if (course.is_locked) return jsonError('รายวิชาถูก Lock แล้ว', 403);

  const { data: componentsRaw } = await supabase.from('score_components').select('*').eq('course_id', courseId);
  const components = (componentsRaw ?? []) as unknown as ScoreComponent[];
  const componentMap = new Map(components.map((component) => [component.id, component]));

  const rows = [];
  for (const item of scores) {
    const component = componentMap.get(item.componentId);
    if (!component) return jsonError('พบช่องคะแนนที่ไม่อยู่ในรายวิชานี้');
    const value = item.score === null || item.score === undefined || item.score === '' ? null : Number(item.score);
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > Number(component.max_score))) {
      return jsonError(`คะแนน ${component.name} ต้องอยู่ระหว่าง 0 ถึง ${component.max_score}`);
    }
    rows.push({
      course_id: courseId,
      student_id: item.studentId,
      score_component_id: item.componentId,
      score: value,
      updated_at: new Date().toISOString(),
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase
      .from('student_scores')
      .upsert(rows, { onConflict: 'course_id,student_id,score_component_id' });
    if (error) return jsonError(error.message, 500);
  }

  return NextResponse.json({ saved: rows.length });
}
