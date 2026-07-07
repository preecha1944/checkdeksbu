import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';
import { calcCheckIn } from '@/lib/attendance';

// PATCH /api/records/[id] — แก้ไข record รายคน (admin/teacher) ตาม §7.4
// server recompute late_minutes + duration_minutes ใหม่จากเวลาของ session เมื่อเวลาถูกแก้ไข
// final_status เป็นค่าที่ admin เลือกตรง ๆ ใน RecordEditModal (รวม 'leave') ไม่ auto-override
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

  const supabase = createServiceClient();
  const { data: record } = await supabase.from('attendance_records').select('*').eq('id', id).maybeSingle();
  if (!record) return jsonError('ไม่พบข้อมูลการเช็คชื่อ', 404);

  const { data: session } = await supabase
    .from('class_sessions')
    .select('*')
    .eq('id', record.session_id)
    .maybeSingle();
  if (!session) return jsonError('ไม่พบรอบเรียน', 404);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.roomId !== undefined) patch.room_id = body.roomId || null;
  if (body.note !== undefined) patch.note = body.note || null;
  if (body.finalStatus !== undefined) patch.final_status = body.finalStatus || null;

  let checkInTime = record.check_in_time;
  let checkOutTime = record.check_out_time;
  let timesChanged = false;

  if (body.checkInTime !== undefined) {
    checkInTime = body.checkInTime || null;
    patch.check_in_time = checkInTime;
    timesChanged = true;
  }
  if (body.checkOutTime !== undefined) {
    checkOutTime = body.checkOutTime || null;
    patch.check_out_time = checkOutTime;
    timesChanged = true;
  }

  if (timesChanged) {
    if (checkInTime) {
      const { lateMinutes } = calcCheckIn(session, new Date(checkInTime));
      patch.late_minutes = lateMinutes;
    } else {
      patch.late_minutes = 0;
    }

    if (checkInTime && checkOutTime) {
      patch.duration_minutes = Math.max(
        0,
        Math.round((new Date(checkOutTime).getTime() - new Date(checkInTime).getTime()) / 60000)
      );
    } else {
      patch.duration_minutes = null;
    }
  }

  const { data: updated, error } = await supabase
    .from('attendance_records')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ record: updated });
}

// DELETE /api/records/[id] — ลบ record เช็คชื่อรายคนเพื่อให้สแกนใหม่ได้
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: record } = await supabase.from('attendance_records').select('id').eq('id', id).maybeSingle();
  if (!record) return jsonError('ไม่พบข้อมูลการเช็คชื่อ', 404);

  const { error } = await supabase.from('attendance_records').delete().eq('id', id);
  if (error) return jsonError('ลบข้อมูลการเช็คชื่อไม่สำเร็จ กรุณาลองใหม่', 500);

  return NextResponse.json({ ok: true });
}
