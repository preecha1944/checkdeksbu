import Link from 'next/link';
import { AlertTriangle, FileBarChart } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { ReportsExportCards } from '@/components/reports/ReportsExportCards';
import { createServiceClient } from '@/lib/supabase/server';
import type { AttendanceFinalStatus, ClassSession, Course, Student } from '@/types/db';

const COMPLETE_STATUSES: AttendanceFinalStatus[] = ['present', 'late', 'early_leave'];

interface TrackingRow {
  student: Pick<Student, 'id' | 'student_code' | 'full_name'>;
  absent: number;
  late: number;
  percent: number;
}

function isComplete(status: AttendanceFinalStatus | null) {
  return !!status && COMPLETE_STATUSES.includes(status);
}

function roundPercent(part: number, total: number) {
  if (total === 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export default async function ReportsPage() {
  const supabase = createServiceClient();

  const { data: studentsRaw } = await supabase
    .from('students')
    .select('id, student_code, full_name')
    .eq('status', 'active')
    .order('student_code', { ascending: true });
  const { data: sessionsRaw } = await supabase
    .from('class_sessions')
    .select('id, title, learning_date, status')
    .order('learning_date', { ascending: false })
    .order('start_time', { ascending: false });
  const { data: coursesRaw } = await supabase
    .from('courses')
    .select('id, course_code, course_name')
    .order('created_at', { ascending: false });

  const students = (studentsRaw ?? []) as unknown as Pick<Student, 'id' | 'student_code' | 'full_name'>[];
  const sessions = (sessionsRaw ?? []) as unknown as Pick<ClassSession, 'id' | 'title' | 'learning_date' | 'status'>[];
  const courses = (coursesRaw ?? []) as unknown as Pick<Course, 'id' | 'course_code' | 'course_name'>[];
  const closedSessions = sessions.filter((session) => session.status === 'closed');
  const closedSessionIds = closedSessions.map((session) => session.id);

  const { data: recordsRaw } = closedSessionIds.length
    ? await supabase
        .from('attendance_records')
        .select('student_id, final_status')
        .in('session_id', closedSessionIds)
    : { data: [] };
  const records = (recordsRaw ?? []) as unknown as Array<{
    student_id: string;
    final_status: AttendanceFinalStatus | null;
  }>;

  const recordsByStudent = new Map<string, typeof records>();
  for (const record of records) {
    const list = recordsByStudent.get(record.student_id) ?? [];
    list.push(record);
    recordsByStudent.set(record.student_id, list);
  }

  const trackingRows: TrackingRow[] =
    closedSessions.length === 0
      ? []
      : students
          .map((student) => {
            const studentRecords = recordsByStudent.get(student.id) ?? [];
            const complete = studentRecords.filter((record) => isComplete(record.final_status)).length;
            const late = studentRecords.filter((record) => record.final_status === 'late').length;
            const explicitAbsent = studentRecords.filter((record) => record.final_status === 'absent').length;
            const missingRecords = Math.max(0, closedSessions.length - studentRecords.length);

            return {
              student,
              absent: explicitAbsent + missingRecords,
              late,
              percent: roundPercent(complete, closedSessions.length),
            };
          })
          .sort((a, b) => a.percent - b.percent || b.absent - a.absent || a.student.student_code.localeCompare(b.student.student_code))
          .slice(0, 10);

  return (
    <div>
      <PageHeader
        title="รายงาน"
        description="ส่งออกข้อมูลและติดตามนักศึกษาที่มีความเสี่ยงจากสถิติการเข้าเรียน"
      />

      <ReportsExportCards
        sessions={sessions.map((session) => ({
          id: session.id,
          title: session.title,
          learning_date: session.learning_date,
        }))}
        courses={courses.map((course) => ({
          id: course.id,
          course_code: course.course_code,
          course_name: course.course_name,
        }))}
      />

      <Card>
        <CardHeader
          title="นักศึกษาที่ควรติดตาม"
          description="10 คนที่มีเปอร์เซ็นต์เข้าเรียนต่ำสุดจากรอบเรียนที่ปิดแล้ว"
        />
        {closedSessions.length === 0 ? (
          <EmptyState
            icon={FileBarChart}
            title="ยังไม่มีรอบเรียนที่ปิดแล้ว"
            description="ตารางติดตามจะแสดงเมื่อมีการปิดรอบเรียนอย่างน้อย 1 รอบ"
          />
        ) : trackingRows.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="ยังไม่มีนักศึกษาให้ติดตาม"
            description="เพิ่มนักศึกษา active เพื่อเริ่มคำนวณสถิติการเข้าเรียน"
          />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <TableTh>รหัส</TableTh>
                <TableTh>ชื่อ-สกุล</TableTh>
                <TableTh>ขาด</TableTh>
                <TableTh>สาย</TableTh>
                <TableTh>% เข้าเรียน</TableTh>
                <TableTh>รายละเอียด</TableTh>
              </tr>
            </TableHead>
            <TableBody>
              {trackingRows.map((row) => (
                <TableRow key={row.student.id}>
                  <TableTd className="font-medium">{row.student.student_code}</TableTd>
                  <TableTd>{row.student.full_name}</TableTd>
                  <TableTd>{row.absent}</TableTd>
                  <TableTd>{row.late}</TableTd>
                  <TableTd>
                    <Badge tone={row.percent < 70 ? 'danger' : row.percent < 80 ? 'warning' : 'success'}>
                      {row.percent}%
                    </Badge>
                  </TableTd>
                  <TableTd>
                    <Link href={`/students/${row.student.id}`} className="text-sm font-medium text-primary hover:text-primary-deep">
                      ดูสถิติ
                    </Link>
                  </TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
