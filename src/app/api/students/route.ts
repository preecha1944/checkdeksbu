import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';

// POST /api/students — เพิ่มนักศึกษา 1 คน (§8.2)
export async function POST(request: Request) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const body = await request.json().catch(() => null);
  if (!body) return jsonError('ข้อมูลไม่ถูกต้อง');

  const studentCode = typeof body.student_code === 'string' ? body.student_code.trim() : '';
  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() || null : null;
  const email = typeof body.email === 'string' ? body.email.trim() || null : null;
  const status = body.status === 'inactive' ? 'inactive' : 'active';

  if (!studentCode) return jsonError('กรุณากรอกรหัสนักศึกษา');
  if (!fullName) return jsonError('กรุณากรอกชื่อ-สกุล');

  const supabase = createServiceClient();
  const { data: student, error } = await supabase
    .from('students')
    .insert([{ student_code: studentCode, full_name: fullName, phone, email, status }])
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') return jsonError('รหัสนักศึกษานี้มีอยู่แล้ว', 409);
    return jsonError('เพิ่มนักศึกษาไม่สำเร็จ กรุณาลองใหม่', 500);
  }

  return NextResponse.json({ student }, { status: 201 });
}
