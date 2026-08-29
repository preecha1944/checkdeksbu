import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';
import { listSections } from '@/lib/sections';

// GET /api/sections — รายการ section พร้อมจำนวนนักศึกษาในแต่ละอัน
export async function GET() {
  try {
    await requireAuth();
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const sections = await listSections();
  const supabase = createServiceClient();
  const { data: studentsRaw } = await supabase.from('students').select('class_level');
  const rows = (studentsRaw ?? []) as unknown as { class_level: string }[];

  // นับในหน่วยความจำ — รายชื่อนักศึกษาของระบบนี้อยู่ระดับหลักสิบ ไม่คุ้มที่จะทำ view หรือ RPC เพิ่ม
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.class_level, (counts.get(row.class_level) ?? 0) + 1);
  }

  return NextResponse.json({
    sections: sections.map((section) => ({ ...section, student_count: counts.get(section.name) ?? 0 })),
  });
}

// POST /api/sections — เพิ่ม section ใหม่
export async function POST(request: Request) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) return jsonError('กรุณากรอกชื่อ Section');

  const supabase = createServiceClient();
  const { data: last } = await supabase
    .from('student_sections')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = ((last as { sort_order: number } | null)?.sort_order ?? 0) + 1;

  const { data: section, error } = await supabase
    .from('student_sections')
    .insert([{ name, sort_order: sortOrder }])
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') return jsonError(`มี Section ชื่อ "${name}" อยู่แล้ว`, 409);
    return jsonError('เพิ่ม Section ไม่สำเร็จ กรุณาลองใหม่', 500);
  }

  return NextResponse.json({ section }, { status: 201 });
}
