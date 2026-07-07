import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';
import { normalizeOptionalStudentField } from '@/lib/student-input';

// PATCH /api/students/[id] — แก้ไขนักศึกษา (§8.2)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return jsonError('ข้อมูลไม่ถูกต้อง');

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.student_code !== undefined) {
    const code = String(body.student_code).trim();
    if (!code) return jsonError('กรุณากรอกรหัสนักศึกษา');
    patch.student_code = code;
  }
  if (body.full_name !== undefined) {
    const name = String(body.full_name).trim();
    if (!name) return jsonError('กรุณากรอกชื่อ-สกุล');
    patch.full_name = name;
  }
  if (body.phone !== undefined) patch.phone = normalizeOptionalStudentField(body.phone);
  if (body.email !== undefined) patch.email = normalizeOptionalStudentField(body.email);
  if (body.status !== undefined) patch.status = body.status === 'inactive' ? 'inactive' : 'active';

  const supabase = createServiceClient();
  const { data: student, error } = await supabase
    .from('students')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') return jsonError('รหัสนักศึกษานี้มีอยู่แล้ว', 409);
    return jsonError('บันทึกไม่สำเร็จ กรุณาลองใหม่', 500);
  }

  return NextResponse.json({ student });
}

// DELETE /api/students/[id] — ลบนักศึกษา (ประวัติเช็คชื่อ/คะแนนถูกลบตาม cascade ใน schema)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const { id } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase.from('students').delete().eq('id', id);

  if (error) return jsonError('ลบไม่สำเร็จ กรุณาลองใหม่', 500);
  return NextResponse.json({ ok: true });
}
