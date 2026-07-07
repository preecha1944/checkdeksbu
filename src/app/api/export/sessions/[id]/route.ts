import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';
import { createWorkbook, autosizeColumns, styleHeader, todayStamp, workbookResponse } from '@/lib/excel';
import { attendanceStatusLabel } from '@/lib/status';
import { formatThaiDateOnly, formatTime } from '@/lib/time';
import type { AttendanceFinalStatus, AttendanceRecord, ClassSession, Student } from '@/types/db';

interface RecordWithJoins extends AttendanceRecord {
  students: Pick<Student, 'id' | 'student_code' | 'full_name'> | null;
  rooms: { name: string } | null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: sessionRaw, error: sessionError } = await supabase
    .from('class_sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (sessionError) return jsonError(sessionError.message, 500);
  const session = sessionRaw as unknown as ClassSession | null;
  if (!session) return jsonError('ไม่พบรอบเรียน', 404);

  const { data: studentsRaw } = await supabase
    .from('students')
    .select('*')
    .eq('status', 'active')
    .order('student_code', { ascending: true });
  const { data: recordsRaw, error: recordsError } = await supabase
    .from('attendance_records')
    .select('*, students(id, student_code, full_name), rooms(name)')
    .eq('session_id', id);
  if (recordsError) return jsonError(recordsError.message, 500);

  const students = (studentsRaw ?? []) as unknown as Student[];
  const records = (recordsRaw ?? []) as unknown as RecordWithJoins[];
  const recordByStudent = new Map(records.map((record) => [record.student_id, record]));

  const workbook = createWorkbook();
  const sheet = workbook.addWorksheet('Session');
  sheet.addRow([`${session.title} | ${formatThaiDateOnly(session.learning_date)}`]);
  sheet.mergeCells(1, 1, 1, 10);
  sheet.getRow(1).font = { bold: true, size: 14 };
  sheet.addRow(['ลำดับ', 'รหัส', 'ชื่อ-สกุล', 'ห้อง', 'เวลา Check-in', 'เวลา Check-out', 'สาย(นาที)', 'ระยะเวลา(นาที)', 'สถานะ', 'หมายเหตุ']);
  styleHeader(sheet.getRow(2));

  students.forEach((student, index) => {
    const record = recordByStudent.get(student.id);
    const status = (record?.final_status ?? 'absent') as AttendanceFinalStatus;
    sheet.addRow([
      index + 1,
      student.student_code,
      student.full_name,
      record?.rooms?.name ?? '',
      formatTime(record?.check_in_time),
      formatTime(record?.check_out_time),
      record?.late_minutes ?? 0,
      record?.duration_minutes ?? '',
      attendanceStatusLabel(status),
      record?.note ?? '',
    ]);
  });

  autosizeColumns(sheet);
  return workbookResponse(workbook, `session-${todayStamp()}.xlsx`);
}
