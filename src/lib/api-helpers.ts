import { NextResponse } from 'next/server';
import { createServerAuthClient } from '@/lib/supabase/auth';
import type { Profile } from '@/types/db';

const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/**
 * สร้าง NextResponse แบบ error รูปแบบเดียวกันทุก API route
 */
export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export interface AuthContext {
  user: { id: string; email: string | null };
  profile: Profile | null;
}

/**
 * ตรวจ session จาก cookie สำหรับ API route ที่ต้อง login (ทุก /api/* ยกเว้น /api/attendance/*)
 * - ไม่มี session → throw NextResponse 401
 * - ถ้าส่ง request มาด้วยและ method เป็น POST/PATCH/PUT/DELETE และ role = 'viewer' → throw NextResponse 403
 *
 * วิธีใช้ใน route handler:
 *   try {
 *     const { user, profile } = await requireAuth(request);
 *   } catch (e) {
 *     if (e instanceof NextResponse) return e;
 *     throw e;
 *   }
 */
export async function requireAuth(request?: Request): Promise<AuthContext> {
  const supabase = await createServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw jsonError('กรุณาเข้าสู่ระบบก่อนใช้งาน', 401);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const typedProfile = (profile as unknown as Profile | null) ?? null;

  if (request && WRITE_METHODS.has(request.method) && typedProfile?.role === 'viewer') {
    throw jsonError('บัญชีนี้มีสิทธิ์ดูข้อมูลอย่างเดียว ไม่สามารถแก้ไขได้', 403);
  }

  return {
    user: { id: user.id, email: user.email ?? null },
    profile: typedProfile,
  };
}
