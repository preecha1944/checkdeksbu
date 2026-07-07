import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api-helpers';
import { validateQr, QrValidationError, calcCheckIn } from '@/lib/attendance';

// POST /api/attendance/check-in — public (validate QR ทุก request) ดู §7.3
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return jsonError('ข้อมูลไม่ถูกต้อง');

  const { sessionId, token, studentCode, roomId } = body as {
    sessionId?: string;
    token?: string;
    studentCode?: string;
    roomId?: string;
  };

  if (!sessionId || !token) return jsonError('ลิงก์ไม่ถูกต้อง กรุณาสแกน QR ใหม่จากหน้าจอในห้องเรียน');
  if (!studentCode?.trim()) return jsonError('กรุณากรอกรหัสนักศึกษา');
  if (!roomId) return jsonError('กรุณาเลือกห้องเรียน');

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

  const { data: sessionRoomRaw } = await supabase
    .from('session_rooms')
    .select('room_id, rooms(id, name)')
    .eq('session_id', session.id)
    .eq('room_id', roomId)
    .maybeSingle();
  const sessionRoom = sessionRoomRaw as unknown as {
    room_id: string;
    rooms: { id: string; name: string } | null;
  } | null;

  if (!sessionRoom) return jsonError('ห้องเรียนไม่ถูกต้อง', 400);

  const roomInfo = sessionRoom.rooms;
  const now = new Date();
  const { status, lateMinutes } = calcCheckIn(session, now);

  const { data: inserted, error } = await supabase
    .from('attendance_records')
    .insert([
      {
        session_id: session.id,
        student_id: student.id,
        room_id: roomId,
        check_in_time: now.toISOString(),
        late_minutes: lateMinutes,
        final_status: status,
      },
    ])
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return jsonError('คุณได้ Check-in ไปแล้ว', 409);
    }
    return jsonError('บันทึกการเช็คชื่อไม่สำเร็จ กรุณาลองใหม่', 500);
  }

  return NextResponse.json({
    ok: true,
    status,
    checkInTime: inserted.check_in_time,
    roomName: roomInfo?.name ?? null,
    lateMinutes,
  });
}
