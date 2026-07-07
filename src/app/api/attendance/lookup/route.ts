import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api-helpers';
import { validateQr, QrValidationError } from '@/lib/attendance';

interface RoomJoin {
  id: string;
  name: string;
  status: string;
}

// POST /api/attendance/lookup — public (validate QR ทุก request) ดู §7.3
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

  if (!student) {
    return jsonError('ไม่พบรหัสนักศึกษา กรุณาตรวจสอบอีกครั้ง', 404);
  }

  const studentPayload = { code: student.student_code, fullName: student.full_name };

  const { data: recordRaw } = await supabase
    .from('attendance_records')
    .select('*, rooms(id, name)')
    .eq('session_id', session.id)
    .eq('student_id', student.id)
    .maybeSingle();
  const record = recordRaw as unknown as {
    check_in_time: string | null;
    check_out_time: string | null;
    final_status: string | null;
    rooms: { id: string; name: string } | null;
  } | null;

  if (!record) {
    const { data: sessionRoomsRaw } = await supabase
      .from('session_rooms')
      .select('room_id, rooms(id, name, status)')
      .eq('session_id', session.id);
    const sessionRooms = sessionRoomsRaw as unknown as { room_id: string; rooms: RoomJoin | null }[] | null;

    const rooms = (sessionRooms ?? [])
      .map((sr) => sr.rooms)
      .filter((r): r is RoomJoin => !!r && r.status === 'active')
      .map((r) => ({ id: r.id, name: r.name }));

    return NextResponse.json({ student: studentPayload, mode: 'checkin', rooms });
  }

  const roomInfo = record.rooms;

  if (!record.check_out_time) {
    return NextResponse.json({
      student: studentPayload,
      mode: 'checkout',
      record: {
        roomName: roomInfo?.name ?? null,
        checkInTime: record.check_in_time,
      },
    });
  }

  return NextResponse.json({
    student: studentPayload,
    mode: 'done',
    record: {
      roomName: roomInfo?.name ?? null,
      checkInTime: record.check_in_time,
      checkOutTime: record.check_out_time,
      finalStatus: record.final_status,
    },
  });
}
