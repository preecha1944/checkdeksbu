import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';

// PATCH /api/sections/[id] — เปลี่ยนชื่อ section แล้วให้ students.class_level ตามไปด้วย
// เรียกผ่าน RPC เพราะสองคำสั่งนี้ต้องอยู่ใน transaction เดียว
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) return jsonError('กรุณากรอกชื่อ Section');

  const supabase = createServiceClient();
  const { error } = await supabase.rpc('rename_student_section', { p_id: id, p_name: name });

  if (error) {
    if (error.message.includes('duplicate_section')) return jsonError(`มี Section ชื่อ "${name}" อยู่แล้ว`, 409);
    if (error.message.includes('section_not_found')) return jsonError('ไม่พบ Section นี้', 404);
    return jsonError('เปลี่ยนชื่อ Section ไม่สำเร็จ กรุณาลองใหม่', 500);
  }

  return NextResponse.json({ ok: true, name });
}

// DELETE /api/sections/[id] — ลบได้เฉพาะ section ที่ไม่มีนักศึกษาอยู่
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: sectionRaw } = await supabase
    .from('student_sections')
    .select('name')
    .eq('id', id)
    .maybeSingle();
  const section = sectionRaw as { name: string } | null;
  if (!section) return jsonError('ไม่พบ Section นี้', 404);

  const { count } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('class_level', section.name);

  if ((count ?? 0) > 0) {
    return jsonError(`มีนักศึกษา ${count} คนอยู่ใน Section นี้ ย้ายออกก่อนจึงจะลบได้`, 409);
  }

  const { error } = await supabase.from('student_sections').delete().eq('id', id);
  if (error) return jsonError('ลบ Section ไม่สำเร็จ กรุณาลองใหม่', 500);

  return NextResponse.json({ ok: true });
}
