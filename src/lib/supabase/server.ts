import { createClient } from '@supabase/supabase-js';

// การ์ดกันไม่ให้ไฟล์นี้ถูก import เข้าไปใน client bundle โดยไม่ตั้งใจ
// (โปรเจกต์นี้ไม่ได้ติดตั้งแพ็กเกจ `server-only` จึงใช้ runtime guard แทน)
if (typeof window !== 'undefined') {
  throw new Error('src/lib/supabase/server.ts ต้องถูกเรียกใช้ฝั่งเซิร์ฟเวอร์เท่านั้น');
}

/**
 * Service-role Supabase client — ใช้ในฝั่ง server (API route handlers) เท่านั้น
 * ข้าม RLS ทั้งหมด ห้าม import เข้าไปใน client component เด็ดขาด
 * อ่าน env ภายในฟังก์ชัน (ไม่ใช่ module scope) เพื่อไม่ให้ build พังตอนไม่มี env
 *
 * ตั้งใจไม่ parameterize ด้วย <Database>: hand-written schema type ไม่ตรงกับ GenericSchema ที่
 * postgrest-js คาดหวังเป๊ะ ทำให้ select/insert/update บางจุด infer เป็น never ทั้งที่โค้ดถูกต้อง
 * โปรเจกต์นี้ validate ความถูกต้องของข้อมูลที่ชั้น API route ทุกจุดอยู่แล้ว (ไม่ได้พึ่ง type ของ
 * client ตัวนี้เป็นเครื่องมือความถูกต้อง) จึงตัดปัญหาด้วยการไม่ผูก schema แทนการไล่แก้ทีละจุด
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
