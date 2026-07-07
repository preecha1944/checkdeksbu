import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database, Profile } from '@/types/db';

/**
 * สร้าง Supabase client ฝั่งเซิร์ฟเวอร์ที่ผูกกับ cookies ของ request ปัจจุบัน
 * ใช้ anon key + อ่าน session จาก cookie (ใช้ตรวจ auth ใน Server Component / Route Handler)
 */
export async function createServerAuthClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // เรียกจาก Server Component ระหว่าง render จะ set cookie ไม่ได้ (ปกติ) — ไม่ต้องทำอะไร
        }
      },
    },
  });
}

export interface SessionUser {
  id: string;
  email: string | null;
  profile: Profile | null;
}

/**
 * อ่าน session ปัจจุบันจาก cookie แล้วโหลด profile คู่กัน
 * คืน null ถ้าไม่ได้ login
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    profile: (profile as unknown as Profile | null) ?? null,
  };
}
