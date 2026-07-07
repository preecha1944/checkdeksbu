'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/db';

/**
 * Browser Supabase client — ใช้เฉพาะฝั่ง client (เช่น หน้า /login สำหรับ signIn/signOut)
 * ใช้ anon key เท่านั้น ไม่มีสิทธิ์ข้าม RLS
 */
export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createBrowserClient<Database>(url, anonKey);
}
