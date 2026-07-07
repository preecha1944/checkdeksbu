import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api-helpers';
import { validateQr, QrValidationError } from '@/lib/attendance';

// GET /api/attendance/session-info?sid=..&t=.. — public, ใช้แสดงหัวการ์ดในหน้า /scan ก่อนกรอกรหัส
// ต้องมี token ที่ valid เท่านั้นถึงจะเห็นข้อมูล (ใช้ validateQr ตัวเดียวกับ lookup/check-in/check-out)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sid');
  const token = url.searchParams.get('t');

  if (!sessionId || !token) {
    return jsonError('ลิงก์ไม่ถูกต้อง กรุณาสแกน QR ใหม่จากหน้าจอในห้องเรียน');
  }

  let session;
  try {
    session = await validateQr(sessionId, token);
  } catch (e) {
    if (e instanceof QrValidationError) return jsonError(e.message, 400);
    throw e;
  }

  const supabase = createServiceClient();
  const { data: course } = session.course_id
    ? await supabase.from('courses').select('course_name').eq('id', session.course_id).maybeSingle()
    : { data: null };

  return NextResponse.json({
    title: session.title,
    courseName: course?.course_name ?? null,
    learningDate: session.learning_date,
    startTime: session.start_time,
    endTime: session.end_time,
  });
}
