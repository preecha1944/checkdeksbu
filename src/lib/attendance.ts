// Logic หลักของ Attendance module — validate QR, คำนวณสถานะ check-in/check-out, ปิดรอบเรียน
// อ้างอิง IMPLEMENTATION-PLAN.md §7.1, §7.3, §7.4 — ใช้ทั้งฝั่ง API route นักศึกษา (public) และฝั่ง admin

import { randomUUID } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { atBangkok } from '@/lib/time';
import { QR_ROTATE_SECONDS, QR_GRACE_SECONDS } from '@/lib/constants';
import type { ClassSession } from '@/types/db';

/** โยนพร้อมข้อความไทยที่พร้อมส่งตรงให้ client เมื่อ validate QR ไม่ผ่าน */
export class QrValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QrValidationError';
  }
}

/**
 * ตรวจสอบ QR token ตาม §7.1 — ใช้ร่วมทุก endpoint นักศึกษา (lookup / check-in / check-out)
 * หมายเหตุ: ต้อง "ไม่" กรอง is_active=true ตอนหา token — token ที่ถูก deactivate แล้ว (rotate ไปตัวใหม่)
 * แต่ยังไม่เกิน expires_at ต้องยังใช้ได้ (grace 30 วิ ตามสเปก)
 */
export async function validateQr(sessionId: string, token: string): Promise<ClassSession> {
  const supabase = createServiceClient();

  const { data: qrToken } = await supabase
    .from('qr_tokens')
    .select('*')
    .eq('token', token)
    .eq('session_id', sessionId)
    .maybeSingle();

  if (!qrToken) {
    throw new QrValidationError('QR Code ไม่ถูกต้อง');
  }

  if (Date.now() > new Date(qrToken.expires_at).getTime()) {
    throw new QrValidationError('QR Code หมดอายุ กรุณาสแกน QR ใหม่จากหน้าจอ');
  }

  const { data: session } = await supabase
    .from('class_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session || session.status !== 'open') {
    throw new QrValidationError('รอบเรียนปิดแล้ว ไม่สามารถเช็คชื่อได้');
  }

  return session;
}

export interface CheckInCalc {
  status: 'present' | 'late';
  lateMinutes: number;
}

/**
 * คำนวณสถานะตอน Check-in ตาม §7.3
 * สาย = now > late_after_time (เขตเวลาไทย), late_minutes ปัดขึ้นเป็นนาที
 */
export function calcCheckIn(session: ClassSession, now: Date = new Date()): CheckInCalc {
  const threshold = atBangkok(session.learning_date, session.late_after_time);
  if (now.getTime() > threshold.getTime()) {
    const lateMinutes = Math.ceil((now.getTime() - threshold.getTime()) / 60000);
    return { status: 'late', lateMinutes };
  }
  return { status: 'present', lateMinutes: 0 };
}

export interface CheckOutCalc {
  finalStatus: 'present' | 'late' | 'early_leave';
  durationMinutes: number;
}

/**
 * คำนวณสถานะตอน Check-out ตาม §7.3 — ใช้ session.early_leave_minutes ต่อรอบ (ไม่ใช่ค่าคงที่ global)
 * ออกก่อนเวลาเลิกเรียนเกิน early_leave_minutes นาที → early_leave, ไม่งั้นคง late/present ตามตอน check-in
 */
export function calcCheckOut(
  session: ClassSession,
  checkInTime: Date,
  lateMinutes: number,
  now: Date = new Date()
): CheckOutCalc {
  const endTime = atBangkok(session.learning_date, session.end_time);
  const minutesBeforeEnd = (endTime.getTime() - now.getTime()) / 60000;
  const durationMinutes = Math.max(0, Math.round((now.getTime() - checkInTime.getTime()) / 60000));

  if (minutesBeforeEnd > session.early_leave_minutes) {
    return { finalStatus: 'early_leave', durationMinutes };
  }
  return { finalStatus: lateMinutes > 0 ? 'late' : 'present', durationMinutes };
}

/**
 * ปิดรอบเรียน ตาม §7.4:
 * 1. update session status='closed'
 * 2. นักศึกษา active ที่ไม่มี record ในรอบนี้ → insert record final_status='absent' (bulk insert)
 * 3. record ที่มี check_in แต่ไม่มี check_out → update final_status='incomplete'
 * 4. ปิด qr_tokens ทั้งหมดของ session (is_active=false)
 */
export async function closeSession(sessionId: string): Promise<void> {
  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();

  await supabase
    .from('class_sessions')
    .update({ status: 'closed', updated_at: nowIso })
    .eq('id', sessionId);

  const [{ data: activeStudents }, { data: existingRecords }] = await Promise.all([
    supabase.from('students').select('id').eq('status', 'active'),
    supabase.from('attendance_records').select('student_id').eq('session_id', sessionId),
  ]);

  const existingIds = new Set((existingRecords ?? []).map((r) => r.student_id));
  const missing = (activeStudents ?? []).filter((s) => !existingIds.has(s.id));

  if (missing.length > 0) {
    await supabase.from('attendance_records').insert(
      missing.map((s) => ({
        session_id: sessionId,
        student_id: s.id,
        final_status: 'absent' as const,
      }))
    );
  }

  await supabase
    .from('attendance_records')
    .update({ final_status: 'incomplete', updated_at: nowIso })
    .eq('session_id', sessionId)
    .is('check_out_time', null)
    .not('check_in_time', 'is', null);

  await supabase
    .from('qr_tokens')
    .update({ is_active: false })
    .eq('session_id', sessionId)
    .eq('is_active', true);
}

export interface QrTokenResult {
  token: string;
  secondsLeft: number;
}

/**
 * หา/สร้าง QR token ปัจจุบันของ session ตาม §7.1
 * - มี token active อายุ < 180s อยู่แล้ว → คืนตัวเดิม
 * - ไม่มี → deactivate ของเก่าทั้งหมด + สร้างใหม่ expires_at = now + 210s (180 แสดง + 30 grace)
 */
export async function getOrCreateQrToken(sessionId: string): Promise<QrTokenResult> {
  const supabase = createServiceClient();
  const now = Date.now();
  const cutoffIso = new Date(now - QR_ROTATE_SECONDS * 1000).toISOString();

  const { data: existing } = await supabase
    .from('qr_tokens')
    .select('*')
    .eq('session_id', sessionId)
    .eq('is_active', true)
    .gt('created_at', cutoffIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const ageSeconds = Math.floor((now - new Date(existing.created_at).getTime()) / 1000);
    return { token: existing.token, secondsLeft: Math.max(0, QR_ROTATE_SECONDS - ageSeconds) };
  }

  await supabase
    .from('qr_tokens')
    .update({ is_active: false })
    .eq('session_id', sessionId)
    .eq('is_active', true);

  const token = randomUUID().replace(/-/g, '');
  const expiresAt = new Date(now + (QR_ROTATE_SECONDS + QR_GRACE_SECONDS) * 1000).toISOString();

  const { data: created, error } = await supabase
    .from('qr_tokens')
    .insert([{ session_id: sessionId, token, expires_at: expiresAt, is_active: true }])
    .select('*')
    .single();

  if (error || !created) {
    throw new Error('ไม่สามารถสร้าง QR Code ได้');
  }

  return { token: created.token, secondsLeft: QR_ROTATE_SECONDS };
}
