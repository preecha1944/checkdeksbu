import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';
import { closeSession } from '@/lib/attendance';
import type { SessionStatus } from '@/types/db';

const ALLOWED_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  draft: ['open', 'cancelled'],
  open: ['closed', 'cancelled'],
  closed: [],
  cancelled: [],
};

// GET /api/sessions/[id] — รายละเอียดรอบเรียน + ห้องที่ผูกไว้
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: session } = await supabase.from('class_sessions').select('*').eq('id', id).maybeSingle();
  if (!session) return jsonError('ไม่พบรอบเรียน', 404);

  const { data: sessionRoomsRaw } = await supabase
    .from('session_rooms')
    .select('room_id, rooms(id, name)')
    .eq('session_id', id);
  const sessionRooms = sessionRoomsRaw as unknown as
    | { room_id: string; rooms: { id: string; name: string } | null }[]
    | null;

  const rooms = (sessionRooms ?? [])
    .map((sr) => sr.rooms)
    .filter((r): r is { id: string; name: string } => !!r);

  return NextResponse.json({ session, rooms });
}

// PATCH /api/sessions/[id] — แก้ไขฟิลด์ หรือเปลี่ยนสถานะ (open/closed/cancelled) — closed จะเรียก closeSession (§7.4)
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
  const { data: existing } = await supabase.from('class_sessions').select('*').eq('id', id).maybeSingle();
  if (!existing) return jsonError('ไม่พบรอบเรียน', 404);

  if (body.status) {
    const allowed = ALLOWED_TRANSITIONS[existing.status as SessionStatus] ?? [];
    if (!allowed.includes(body.status)) {
      return jsonError('ไม่สามารถเปลี่ยนสถานะนี้ได้', 400);
    }

    if (body.status === 'closed') {
      await closeSession(id);
    } else {
      const { error } = await supabase
        .from('class_sessions')
        .update({ status: body.status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) return jsonError(error.message, 500);
    }

    const { data: updated } = await supabase.from('class_sessions').select('*').eq('id', id).maybeSingle();
    return NextResponse.json({ session: updated });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) patch.title = body.title;
  if (body.courseId !== undefined) patch.course_id = body.courseId || null;
  if (body.learningDate !== undefined) patch.learning_date = body.learningDate;
  if (body.startTime !== undefined) patch.start_time = body.startTime;
  if (body.endTime !== undefined) patch.end_time = body.endTime;
  if (body.lateAfterTime !== undefined) patch.late_after_time = body.lateAfterTime;
  if (body.earlyLeaveMinutes !== undefined) patch.early_leave_minutes = body.earlyLeaveMinutes;

  const { data: updated, error } = await supabase
    .from('class_sessions')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ session: updated });
}

// DELETE /api/sessions/[id] — ลบรอบเรียนที่สร้างผิด พร้อมข้อมูลเช็คชื่อ/QR ที่ผูกอยู่กับรอบนี้
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: existing } = await supabase.from('class_sessions').select('id').eq('id', id).maybeSingle();
  if (!existing) return jsonError('ไม่พบรอบเรียน', 404);

  const { error } = await supabase.from('class_sessions').delete().eq('id', id);
  if (error) return jsonError('ลบรอบเรียนไม่สำเร็จ กรุณาลองใหม่', 500);

  return NextResponse.json({ ok: true });
}
