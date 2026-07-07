import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api-helpers';
import { validateQr, QrValidationError, calcCheckOut } from '@/lib/attendance';

// POST /api/attendance/check-out — public (validate QR ทุก request) ดู §7.3
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return jsonError('ข้อมูลไม่ถูกต้อง');

  const { sessionId, token, studentCode } = body as {
    sessionId?: string;
    token?: string;
    studentCode?: string;
  };

  if (!sessionId || !token) return jsonError('ลิงก์ไม่ถูกต้อง กรุณาสแกน QR ใหม่จากหน้าจอในห้องเรียน');
  if (!studentCode?.trim()) return jsonError('กรุณากรอกรหัสนักศึกษา');

  let session;
  try {
    session = await validateQr(sessionId, token);
  } catch (e) {
    if (e instanceof QrValidationError) return jsonError(e.message, 400);
    throw e;
  }

  const supabase = createServiceClient();
  const code = studentCode.trim();

  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('student_code', code)
    .eq('status', 'active')
    .maybeSingle();

  if (!student) return jsonError('ไม่พบรหัสนักศึกษา กรุณาตรวจสอบอีกครั้ง', 404);

  const { data: record } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('session_id', session.id)
    .eq('student_id', student.id)
    .maybeSingle();

  if (!record) return jsonError('กรุณา Check-in ก่อน', 400);
  if (record.check_out_time) return jsonError('คุณได้ Check-out ไปแล้ว', 409);
  if (!record.check_in_time) return jsonError('กรุณา Check-in ก่อน', 400);

  const now = new Date();
  const checkInTime = new Date(record.check_in_time);
  const { finalStatus, durationMinutes } = calcCheckOut(session, checkInTime, record.late_minutes ?? 0, now);

  const { data: updated, error } = await supabase
    .from('attendance_records')
    .update({
      check_out_time: now.toISOString(),
      duration_minutes: durationMinutes,
      final_status: finalStatus,
      updated_at: now.toISOString(),
    })
    .eq('id', record.id)
    .select('*')
    .single();

  if (error || !updated) return jsonError('บันทึกการเช็คออกไม่สำเร็จ กรุณาลองใหม่', 500);

  return NextResponse.json({
    ok: true,
    finalStatus,
    durationMinutes,
    checkOutTime: updated.check_out_time,
  });
}
