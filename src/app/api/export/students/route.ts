import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';
import { createWorkbook, autosizeColumns, styleHeader, todayStamp, workbookResponse } from '@/lib/excel';
import { STUDENT_STATUS_MAP } from '@/lib/status';
import type { Student } from '@/types/db';

export async function GET() {
  try {
    await requireAuth();
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.from('students').select('*').order('student_code', { ascending: true });
  if (error) return jsonError(error.message, 500);

  const students = (data ?? []) as unknown as Student[];
  const workbook = createWorkbook();
  const sheet = workbook.addWorksheet('Students');

  sheet.addRow(['ลำดับ', 'รหัสนักศึกษา', 'ชื่อ-สกุล', 'เบอร์โทร', 'อีเมล', 'สถานะ']);
  styleHeader(sheet.getRow(1));

  students.forEach((student, index) => {
    sheet.addRow([
      index + 1,
      student.student_code,
      student.full_name,
      student.phone ?? '',
      student.email ?? '',
      STUDENT_STATUS_MAP[student.status]?.label ?? student.status,
    ]);
  });

  autosizeColumns(sheet);
  return workbookResponse(workbook, `students-${todayStamp()}.xlsx`);
}
