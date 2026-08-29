import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';
import { normalizeOptionalStudentField } from '@/lib/student-input';
import { listSections, matchSectionName } from '@/lib/sections';
import type { StudentSection } from '@/types/db';

interface ParsedRow {
  lineNumber: number;
  studentCode: string;
  fullName: string;
  classLevel: string;
  phone: string | null;
  email: string | null;
}

/**
 * รูปแบบคอลัมน์ตัดสินจาก "จำนวนคอลัมน์" อย่างเดียว
 *   4 คอลัมน์ = รหัส, ชื่อ, เบอร์, อีเมล            → ใช้ section ที่เลือกไว้ทั้งชุด
 *   5 คอลัมน์ = รหัส, ชื่อ, section, เบอร์, อีเมล  → ใช้ section ในแถว
 * เดิมใช้การเดาว่าคอลัมน์ที่ 3 "หน้าตาเหมือน section มั้ย" ทำให้ชื่อ section ที่ไม่รู้จัก
 * ถูกเลื่อนไปเก็บเป็นเบอร์โทรทั้งแถวโดยไม่มีการเตือน
 */
function parseLine(
  line: string,
  lineNumber: number,
  sections: StudentSection[],
  fallbackSection: string
): ParsedRow | { lineNumber: number; error: string } {
  // แยกด้วย tab ก่อน (วางจาก Excel) ถ้ามีคอลัมน์เดียวให้ fallback แยกด้วยช่องว่าง 2+ ตัว
  let cols = line.split('\t').map((c) => c.trim());
  if (cols.length < 2) {
    cols = line.split(/\s{2,}/).map((c) => c.trim());
  }

  const [studentCode, fullName] = cols;

  if (!studentCode || !fullName) {
    return { lineNumber, error: `บรรทัดที่ ${lineNumber}: ต้องมีรหัสนักศึกษาและชื่อ-สกุลอย่างน้อย` };
  }

  const hasSectionColumn = cols.length >= 5;
  let classLevel = fallbackSection;

  if (hasSectionColumn) {
    const matched = matchSectionName(sections, cols[2]);
    if (!matched) {
      return { lineNumber, error: `บรรทัดที่ ${lineNumber}: ไม่มี Section ชื่อ "${cols[2]}" ในระบบ` };
    }
    classLevel = matched;
  }

  return {
    lineNumber,
    studentCode,
    fullName,
    classLevel,
    phone: normalizeOptionalStudentField(hasSectionColumn ? cols[3] : cols[2]),
    email: normalizeOptionalStudentField(hasSectionColumn ? cols[4] : cols[3]),
  };
}

// POST /api/students/bulk — วางรายชื่อจากคลิปบอร์ด (แทน Import Excel) ตาม §8.2
export async function POST(request: Request) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const body = await request.json().catch(() => null);
  const text: string = typeof body?.text === 'string' ? body.text : '';
  if (!text.trim()) return jsonError('กรุณาวางรายชื่อนักศึกษา');

  const sections = await listSections();
  if (sections.length === 0) return jsonError('ยังไม่มี Section ในระบบ กรุณาเพิ่ม Section ที่หน้า Settings ก่อน');

  const fallbackSection = matchSectionName(sections, body?.section);
  if (!fallbackSection) return jsonError('กรุณาเลือก Section สำหรับรายชื่อชุดนี้');

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const parseErrors: string[] = [];
  const rows: ParsedRow[] = [];

  lines.forEach((line, idx) => {
    const result = parseLine(line, idx + 1, sections, fallbackSection);
    if ('error' in result) {
      parseErrors.push(result.error);
    } else {
      rows.push(result);
    }
  });

  // ตรวจให้ผ่านครบทุกบรรทัดก่อน ค่อยเขียนลง DB — ไม่งั้นวางผิดทีเดียวได้ข้อมูลเข้าครึ่ง ๆ กลาง ๆ
  if (parseErrors.length > 0) {
    return NextResponse.json(
      { error: 'รายชื่อมีบรรทัดที่ไม่ถูกต้อง ยังไม่ได้นำเข้าข้อมูลใด ๆ', errors: parseErrors },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  let added = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const { data: existing } = await supabase
      .from('students')
      .select('id')
      .eq('student_code', row.studentCode)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('students')
        .update({
          full_name: row.fullName,
          class_level: row.classLevel,
          phone: row.phone,
          email: row.email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) {
        errors.push(`บรรทัดที่ ${row.lineNumber}: อัปเดตไม่สำเร็จ (${row.studentCode})`);
      } else {
        updated += 1;
      }
    } else {
      const { error } = await supabase.from('students').insert([
        {
          student_code: row.studentCode,
          full_name: row.fullName,
          class_level: row.classLevel,
          phone: row.phone,
          email: row.email,
          status: 'active',
        },
      ]);
      if (error) {
        errors.push(`บรรทัดที่ ${row.lineNumber}: เพิ่มไม่สำเร็จ (${row.studentCode})`);
      } else {
        added += 1;
      }
    }
  }

  return NextResponse.json({ added, updated, errors });
}
