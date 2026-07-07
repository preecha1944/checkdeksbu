import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';
import { validateGradeScaleRows, type GradeScaleInput } from '@/lib/grades';
import type { Course } from '@/types/db';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const { id: courseId } = await params;
  const body = await request.json().catch(() => null);
  const rows = Array.isArray(body?.scales) ? (body.scales as GradeScaleInput[]) : [];
  const validation = validateGradeScaleRows(rows);
  if (validation) return jsonError(validation);

  const supabase = createServiceClient();
  const { data: courseRaw } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle();
  const course = courseRaw as unknown as Course | null;
  if (!course) return jsonError('ไม่พบรายวิชา', 404);
  if (course.is_locked) return jsonError('รายวิชาถูก Lock แล้ว', 403);

  const normalized = rows
    .map((row, index) => ({
      course_id: courseId,
      grade: row.grade.trim(),
      min_score: Number(row.min_score),
      max_score: Number(row.max_score),
      sort_order: row.sort_order ?? index + 1,
    }))
    .sort((a, b) => b.min_score - a.min_score);

  const { error: deleteError } = await supabase.from('grade_scales').delete().eq('course_id', courseId);
  if (deleteError) return jsonError(deleteError.message, 500);

  const { data, error } = await supabase.from('grade_scales').insert(normalized).select('*');
  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ scales: data ?? [] });
}
