import { createServiceClient } from '@/lib/supabase/server';
import type { StudentSection } from '@/types/db';

/** รายการ section ทั้งหมด เรียงตาม sort_order แล้วค่อยชื่อ — ใช้ได้ทั้งใน server component และ API route */
export async function listSections(): Promise<StudentSection[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('student_sections')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  return (data ?? []) as unknown as StudentSection[];
}

/**
 * หา section ตามชื่อแบบไม่สนตัวพิมพ์เล็ก/ใหญ่
 * คืน "ชื่อตามที่บันทึกไว้จริง" เพื่อให้ students.class_level สะกดตรงกับ student_sections.name เสมอ
 * (ถ้าเก็บตามที่ผู้ใช้พิมพ์ ตัวกรองและการเปลี่ยนชื่อจะ match ไม่เจอ)
 */
export function matchSectionName(sections: StudentSection[], value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const needle = value.trim().toLowerCase();
  if (!needle) return null;
  return sections.find((s) => s.name.toLowerCase() === needle)?.name ?? null;
}
