import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';
import { isStudentClassLevel, normalizeOptionalStudentField, normalizeStudentClassLevel } from '@/lib/student-input';

interface ParsedRow {
  lineNumber: number;
  studentCode: string;
  fullName: string;
  classLevel: string;
  phone: string | null;
  email: string | null;
}

function parseLine(line: string, lineNumber: number): ParsedRow | { lineNumber: number; error: string } {
  // แยกด้วย tab ก่อน (วางจาก Excel) ถ้ามีคอลัมน์เดียวให้ fallback แยกด้วยช่องว่าง 2+ ตัว
  let cols = line.split('\t').map((c) => c.trim());
  if (cols.length < 2) {
    cols = line.split(/\s{2,}/).map((c) => c.trim());
  }

  const [studentCode, fullName] = cols;

  if (!studentCode || !fullName) {
    return { lineNumber, error: `บรรทัดที่ ${lineNumber}: ต้องมีรหัสนักศึกษาและชื่อ-สกุลอย่างน้อย` };
  }

  const third = cols[2];
  const hasClassColumn = cols.length >= 5 || isStudentClassLevel(third);
  const classLevel = hasClassColumn ? normalizeStudentClassLevel(third) : normalizeStudentClassLevel(undefined);
  const phone = hasClassColumn ? cols[3] : cols[2];
  const email = hasClassColumn ? cols[4] : cols[3];

  return {
    lineNumber,
    studentCode,
    fullName,
    classLevel,
    phone: normalizeOptionalStudentField(phone),
    email: normalizeOptionalStudentField(email),
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

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const errors: string[] = [];
  const rows: ParsedRow[] = [];

  lines.forEach((line, idx) => {
    const result = parseLine(line, idx + 1);
    if ('error' in result) {
      errors.push(result.error);
    } else {
      rows.push(result);
    }
  });

  const supabase = createServiceClient();
  let added = 0;
  let updated = 0;

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
