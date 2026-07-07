import Link from 'next/link';
import { CalendarClock, CheckCircle2, Clock, ExternalLink, QrCode, ScanLine, UserX, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from '@/components/ui/Table';
import { createServiceClient } from '@/lib/supabase/server';
import { attendanceStatusLabel, attendanceStatusTone, SESSION_STATUS_MAP } from '@/lib/status';
import { formatThaiDateOnly, formatTime, formatTimeOfDay } from '@/lib/time';
import type { AttendanceFinalStatus, ClassSession, Student } from '@/types/db';

interface AttendanceRecordRow {
  id: string;
  session_id: string;
  student_id: string;
  check_in_time: string | null;
  check_out_time: string | null;
  final_status: AttendanceFinalStatus | null;
  updated_at: string;
  students?: Pick<Student, 'student_code' | 'full_name'> | null;
  rooms?: { name: string } | null;
  class_sessions?: Pick<ClassSession, 'id' | 'title' | 'learning_date'> | null;
}

function getBangkokToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export default async function AttendancePage() {
  const supabase = createServiceClient();
  const today = getBangkokToday();

  const { data: sessionsRaw } = await supabase
    .from('class_sessions')
    .select('*')
    .order('learning_date', { ascending: false })
    .order('start_time', { ascending: false });
  const { data: recentRecordsRaw } = await supabase
    .from('attendance_records')
    .select('*, students(student_code, full_name), rooms(name), class_sessions(id, title, learning_date)')
    .order('updated_at', { ascending: false })
    .limit(12);
  const { count: totalStudents } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  const sessions = (sessionsRaw ?? []) as unknown as ClassSession[];
  const recentRecords = (recentRecordsRaw ?? []) as unknown as AttendanceRecordRow[];
  const openSessions = sessions.filter((session) => session.status === 'open');
  const todaySessions = sessions.filter((session) => session.learning_date === today);
  const todaySessionIds = new Set(todaySessions.map((session) => session.id));
  const todayRecords = recentRecords.filter((record) => todaySessionIds.has(record.session_id));

  const checkedIn = todayRecords.filter((record) => record.check_in_time).length;
  const checkedOut = todayRecords.filter((record) => record.check_out_time).length;
  const late = todayRecords.filter((record) => record.final_status === 'late').length;
  const absent = todayRecords.filter((record) => record.final_status === 'absent').length;

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="ศูนย์ควบคุมการเช็คชื่อ เปิด QR ติดตามรอบที่กำลังเรียน และดูรายการเช็คชื่อล่าสุด"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/sessions">
              <Button variant="secondary">
                <CalendarClock className="h-4 w-4" aria-hidden="true" />
                จัดการรอบเรียน
              </Button>
            </Link>
            <Link href="/scan" target="_blank">
              <Button>
                <ScanLine className="h-4 w-4" aria-hidden="true" />
                หน้า Scan
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard icon={Users} label="นักศึกษา active" value={totalStudents ?? 0} tint="primary" />
        <StatCard icon={CalendarClock} label="รอบวันนี้" value={todaySessions.length} tint="primary-light" />
        <StatCard icon={CheckCircle2} label="Check-in วันนี้" value={checkedIn} tint="success" />
        <StatCard icon={Clock} label="มาสาย" value={late} tint="warning" />
        <StatCard icon={UserX} label="ขาด" value={absent} tint="danger" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader title="รอบที่กำลังเปิดเช็คชื่อ" description="เปิด QR หรือดูรายละเอียดรอบเรียนที่กำลังใช้งาน" />
          {openSessions.length === 0 ? (
            <EmptyState
              icon={QrCode}
              title="ยังไม่มีรอบที่เปิดอยู่"
              description="สร้างรอบเรียนและเปิดเช็คชื่อจากหน้า Sessions"
              action={
                <Link href="/sessions">
                  <Button variant="secondary">ไปหน้า Sessions</Button>
                </Link>
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {openSessions.map((session) => {
                const statusMeta = SESSION_STATUS_MAP[session.status] ?? { label: session.status, tone: 'neutral' as const };
                return (
                  <div key={session.id} className="rounded-2xl border border-border-soft bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-[family-name:var(--font-heading)] font-semibold text-ink">{session.title}</p>
                        <p className="mt-1 text-sm text-ink-muted">
                          {formatThaiDateOnly(session.learning_date)} · {formatTimeOfDay(session.start_time)} - {formatTimeOfDay(session.end_time)}
                        </p>
                      </div>
                      <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/sessions/${session.id}`}>
                        <Button variant="secondary" size="sm">
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                          รายละเอียด
                        </Button>
                      </Link>
                      <Link href={`/sessions/${session.id}/qr`} target="_blank">
                        <Button size="sm">
                          <QrCode className="h-4 w-4" aria-hidden="true" />
                          เปิด QR
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="รายการเช็คชื่อล่าสุด" description="รายการล่าสุดจากการ Check-in / Check-out" />
          {recentRecords.length === 0 ? (
            <EmptyState title="ยังไม่มีรายการเช็คชื่อ" description="เมื่อมีนักศึกษาเช็คชื่อ รายการจะแสดงที่นี่" />
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableTh>เวลา</TableTh>
                  <TableTh>รหัส</TableTh>
                  <TableTh>ชื่อ</TableTh>
                  <TableTh>รอบเรียน</TableTh>
                  <TableTh>ห้อง</TableTh>
                  <TableTh>สถานะ</TableTh>
                </tr>
              </TableHead>
              <TableBody>
                {recentRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableTd>{formatTime(record.check_in_time ?? record.updated_at)}</TableTd>
                    <TableTd className="font-medium">{record.students?.student_code ?? '-'}</TableTd>
                    <TableTd>{record.students?.full_name ?? '-'}</TableTd>
                    <TableTd>
                      {record.class_sessions ? (
                        <Link href={`/sessions/${record.class_sessions.id}`} className="font-medium text-primary hover:text-primary-deep">
                          {record.class_sessions.title}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </TableTd>
                    <TableTd>{record.rooms?.name ? <Badge tone="primary">{record.rooms.name}</Badge> : '-'}</TableTd>
                    <TableTd>
                      <Badge tone={attendanceStatusTone(record.final_status)}>
                        {attendanceStatusLabel(record.final_status)}
                      </Badge>
                    </TableTd>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
