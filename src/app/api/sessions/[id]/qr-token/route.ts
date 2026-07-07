import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';
import { getOrCreateQrToken } from '@/lib/attendance';

// GET /api/sessions/[id]/qr-token — คืน token ปัจจุบัน/ออกใหม่ ตาม §7.1
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
  if (session.status !== 'open') return jsonError('รอบเรียนยังไม่เปิด', 400);

  let result;
  try {
    result = await getOrCreateQrToken(id);
  } catch {
    return jsonError('ไม่สามารถสร้าง QR Code ได้ กรุณาลองใหม่', 500);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const scanUrl = `${appUrl}/scan?sid=${id}&t=${result.token}`;

  return NextResponse.json({ token: result.token, scanUrl, secondsLeft: result.secondsLeft });
}
