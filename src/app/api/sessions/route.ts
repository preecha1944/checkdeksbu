import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';
import { atBangkok } from '@/lib/time';
import { EARLY_LEAVE_MINUTES } from '@/lib/constants';

// GET /api/sessions — รายการรอบเรียนทั้งหมด + จำนวน check-in ต่อรอบ (§7.4)
export async function GET(request: Request) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const supabase = createServiceClient();
  const { data: sessions, error } = await supabase
    .from('class_sessions')
    .select('*')
    .order('learning_date', { ascending: false })
    .order('start_time', { ascending: false });

  if (error) return jsonError(error.message, 500);

  const ids = (sessions ?? []).map((s) => s.id);
  const countMap = new Map<string, number>();

  if (ids.length > 0) {
    const { data: records } = await supabase
      .from('attendance_records')
      .select('session_id')
      .in('session_id', ids)
      .not('check_in_time', 'is', null);

    for (const r of records ?? []) {
      countMap.set(r.session_id, (countMap.get(r.session_id) ?? 0) + 1);
    }
  }

  const result = (sessions ?? []).map((s) => ({
    ...s,
    checkedInCount: countMap.get(s.id) ?? 0,
  }));

  return NextResponse.json({ sessions: result });
}

// POST /api/sessions — สร้างรอบเรียนใหม่ (§7.4 SessionForm)
export async function POST(request: Request) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const body = await request.json().catch(() => null);
  if (!body) return jsonError('ข้อมูลไม่ถูกต้อง');

  const {
    courseId,
    title,
    learningDate,
    startTime,
    endTime,
    lateAfterTime,
    earlyLeaveMinutes,
    roomIds,
  } = body as {
    courseId?: string | null;
    title?: string;
    learningDate?: string;
    startTime?: string;
    endTime?: string;
    lateAfterTime?: string;
    earlyLeaveMinutes?: number;
    roomIds?: string[];
  };

  if (!title?.trim()) return jsonError('กรุณากรอกชื่อกิจกรรม/วิชา');
  if (!learningDate || !startTime || !endTime || !lateAfterTime) {
    return jsonError('กรุณากรอกวันที่และเวลาให้ครบ');
  }
  if (!Array.isArray(roomIds) || roomIds.length === 0) {
    return jsonError('กรุณาเลือกห้องเรียนอย่างน้อย 1 ห้อง');
  }

  const start = atBangkok(learningDate, startTime);
  const end = atBangkok(learningDate, endTime);
  const late = atBangkok(learningDate, lateAfterTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || Number.isNaN(late.getTime())) {
    return jsonError('รูปแบบวันที่หรือเวลาไม่ถูกต้อง');
  }
  if (end.getTime() <= start.getTime()) {
    return jsonError('เวลาเลิกต้องอยู่หลังเวลาเริ่ม');
  }
  if (late.getTime() < start.getTime() || late.getTime() > end.getTime()) {
    return jsonError('เวลาที่ถือว่าสายต้องอยู่ระหว่างเวลาเริ่มและเวลาเลิก');
  }

  const earlyLeave = earlyLeaveMinutes === undefined ? EARLY_LEAVE_MINUTES : Number(earlyLeaveMinutes);
  if (!Number.isFinite(earlyLeave) || earlyLeave < 0) {
    return jsonError('เวลาที่ถือว่าออกก่อนต้องไม่ติดลบ');
  }

  const supabase = createServiceClient();

  const { data: session, error } = await supabase
    .from('class_sessions')
    .insert([
      {
        course_id: courseId || null,
        title: title.trim(),
        learning_date: learningDate,
        start_time: startTime,
        end_time: endTime,
        late_after_time: lateAfterTime,
        early_leave_minutes: earlyLeave,
        created_by: auth.user.id,
      },
    ])
    .select('*')
    .single();

  if (error || !session) return jsonError('สร้างรอบเรียนไม่สำเร็จ กรุณาลองใหม่', 500);

  const { error: roomsError } = await supabase
    .from('session_rooms')
    .insert(roomIds.map((roomId) => ({ session_id: session.id, room_id: roomId })));

  if (roomsError) {
    return jsonError('สร้างรอบเรียนสำเร็จ แต่บันทึกห้องเรียนไม่สำเร็จ กรุณาแก้ไขรอบเรียนอีกครั้ง', 500);
  }

  return NextResponse.json({ session }, { status: 201 });
}
