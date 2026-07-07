import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';
import type { Course, ScoreCategory, ScoreComponent } from '@/types/db';

async function loadComponent(id: string) {
  const supabase = createServiceClient();
  const { data: componentRaw } = await supabase.from('score_components').select('*').eq('id', id).maybeSingle();
  const component = componentRaw as unknown as ScoreComponent | null;
  if (!component) return { supabase, error: jsonError('ไม่พบงานย่อย', 404) };

  const { data: courseRaw } = await supabase.from('courses').select('*').eq('id', component.course_id).maybeSingle();
  const course = courseRaw as unknown as Course | null;
  if (!course) return { supabase, error: jsonError('ไม่พบรายวิชา', 404) };
  if (course.is_locked) return { supabase, error: jsonError('รายวิชาถูก Lock แล้ว', 403) };
  if (component.is_system) return { supabase, error: jsonError('ไม่สามารถแก้ไขหรือลบคะแนนระบบได้', 400) };

  const { data: categoryRaw } = await supabase
    .from('score_categories')
    .select('*')
    .eq('id', component.category_id)
    .maybeSingle();
  const category = categoryRaw as unknown as ScoreCategory | null;
  if (!category) return { supabase, error: jsonError('ไม่พบหมวดคะแนน', 404) };

  return { supabase, component, category };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const { id } = await params;
  const loaded = await loadComponent(id);
  if ('error' in loaded) return loaded.error;

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : loaded.component.name;
  const maxScore = body?.max_score === undefined ? Number(loaded.component.max_score) : Number(body.max_score);

  if (!name) return jsonError('กรุณากรอกชื่องานย่อย');
  if (!Number.isFinite(maxScore) || maxScore <= 0) return jsonError('คะแนนเต็มต้องมากกว่า 0');

  const { data: siblingsRaw } = await loaded.supabase
    .from('score_components')
    .select('*')
    .eq('category_id', loaded.component.category_id);
  const siblings = (siblingsRaw ?? []) as unknown as ScoreComponent[];
  const total = siblings
    .filter((component) => component.id !== loaded.component.id)
    .reduce((sum, component) => sum + Number(component.max_score), 0) + maxScore;

  if (total > Number(loaded.category.max_score)) {
    return jsonError(`คะแนนรวมของงานย่อยเกิน ${loaded.category.max_score} คะแนน (ปัจจุบัน ${total}/${loaded.category.max_score})`);
  }

  const { data, error } = await loaded.supabase
    .from('score_components')
    .update({ name, max_score: maxScore })
    .eq('id', id)
    .select('*')
    .single();

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ component: data });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const { id } = await params;
  const loaded = await loadComponent(id);
  if ('error' in loaded) return loaded.error;

  const { error } = await loaded.supabase.from('score_components').delete().eq('id', id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
