import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';
import type { Course, ScoreCategory, ScoreComponent } from '@/types/db';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const { id: courseId } = await params;
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const maxScore = Number(body?.max_score);
  const categoryId = typeof body?.category_id === 'string' ? body.category_id : '';

  if (!name) return jsonError('กรุณากรอกชื่องานย่อย');
  if (!Number.isFinite(maxScore) || maxScore <= 0) return jsonError('คะแนนเต็มต้องมากกว่า 0');
  if (!categoryId) return jsonError('ไม่พบหมวดคะแนน');

  const supabase = createServiceClient();
  const { data: courseRaw } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle();
  const course = courseRaw as unknown as Course | null;
  if (!course) return jsonError('ไม่พบรายวิชา', 404);
  if (course.is_locked) return jsonError('รายวิชาถูก Lock แล้ว', 403);

  const { data: categoryRaw } = await supabase
    .from('score_categories')
    .select('*')
    .eq('id', categoryId)
    .eq('course_id', courseId)
    .maybeSingle();
  const category = categoryRaw as unknown as ScoreCategory | null;
  if (!category || category.kind !== 'coursework') return jsonError('เพิ่มงานย่อยได้เฉพาะหมวด Coursework', 400);

  const { data: existingRaw } = await supabase
    .from('score_components')
    .select('*')
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: true });
  const existing = (existingRaw ?? []) as unknown as ScoreComponent[];
  const total = existing.reduce((sum, component) => sum + Number(component.max_score), 0) + maxScore;
  if (total > Number(category.max_score)) {
    return jsonError(`คะแนนรวมของงานย่อยเกิน ${category.max_score} คะแนน (ปัจจุบัน ${total}/${category.max_score})`);
  }

  const { data, error } = await supabase
    .from('score_components')
    .insert([
      {
        course_id: courseId,
        category_id: categoryId,
        name,
        max_score: maxScore,
        sort_order: existing.length + 1,
        is_system: false,
      },
    ])
    .select('*')
    .single();

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ component: data }, { status: 201 });
}
