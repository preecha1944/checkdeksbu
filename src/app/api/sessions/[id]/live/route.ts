import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';

// GET /api/sessions/[id]/live — ตัวเลขสด (poll ทุก 5 วิ) ตาม §7.4
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: session } = await supabase.from('class_sessions').select('id, status').eq('id', id).maybeSingle();
  if (!session) return jsonError('ไม่พบรอบเรียน', 404);

  const { count: totalStudents } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  const { data: records } = await supabase
    .from('attendance_records')
    .select('room_id, check_in_time, check_out_time, final_status')
    .eq('session_id', id);
  const { data: sessionRoomsRaw } = await supabase
    .from('session_rooms')
    .select('room_id, rooms(id, name)')
    .eq('session_id', id);
  const sessionRooms = sessionRoomsRaw as unknown as
    | { room_id: string; rooms: { id: string; name: string } | null }[]
    | null;

  const list = records ?? [];
  const checkedIn = list.filter((r) => r.check_in_time).length;
  const checkedOut = list.filter((r) => r.check_out_time).length;
  const late = list.filter((r) => r.final_status === 'late').length;
  const notCome = Math.max(0, (totalStudents ?? 0) - checkedIn);

  const byRoom = (sessionRooms ?? []).map((sr) => {
    const room = sr.rooms;
    const roomRecords = list.filter((r) => r.room_id === sr.room_id);
    return {
      roomId: sr.room_id,
      roomName: room?.name ?? '',
      checkedIn: roomRecords.filter((r) => r.check_in_time).length,
      checkedOut: roomRecords.filter((r) => r.check_out_time).length,
    };
  });

  return NextResponse.json({
    totalStudents: totalStudents ?? 0,
    status: session.status,
    checkedIn,
    checkedOut,
    late,
    notCome,
    byRoom,
  });
}
