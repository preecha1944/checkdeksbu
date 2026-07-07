import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpenCheck, CheckCircle2, Clock, UserX, AlertCircle, Percent } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { createServiceClient } from '@/lib/supabase/server';
import { formatThaiDateOnly, formatTime } from '@/lib/time';
import { attendanceStatusLabel, attendanceStatusTone } from '@/lib/status';
import type { AttendanceFinalStatus, Student } from '@/types/db';

interface HistoryRow {
  id: string;
  learningDate: string | null;
  sessionTitle: string;
  sessionStatus: string;
  roomName: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  finalStatus: AttendanceFinalStatus | null;
}

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: studentRaw } = await supabase.from('students').select('*').eq('id', id).maybeSingle();
  if (!studentRaw) notFound();
  const student = studentRaw as unknown as Student;

  const { data: recordsRaw } = await supabase
    .from('attendance_records')
    .select('*, class_sessions(title, learning_date, status), rooms(name)')
    .eq('student_id', id)
    .order('created_at', { ascending: false });

  const records = (recordsRaw ?? []) as unknown as Array<{
    id: string;
    room_id: string | null;
    check_in_time: string | null;
    check_out_time: string | null;
    final_status: AttendanceFinalStatus | null;
    class_sessions: { title: string; learning_date: string; status: string } | null;
    rooms: { name: string } | null;
  }>;

  const history: HistoryRow[] = records.map((r) => ({
    id: r.id,
    learningDate: r.class_sessions?.learning_date ?? null,
    sessionTitle: r.class_sessions?.title ?? '-',
    sessionStatus: r.class_sessions?.status ?? '-',
    roomName: r.rooms?.name ?? null,
    checkInTime: r.check_in_time,
    checkOutTime: r.check_out_time,
    finalStatus: r.final_status,
  }));

  const closedRecords = records.filter((r) => r.class_sessions?.status === 'closed');
  const { count: totalClosedSessions } = await supabase
    .from('class_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'closed');

  const present = closedRecords.filter((r) => r.final_status === 'present').length;
  const late = closedRecords.filter((r) => r.final_status === 'late').length;
  const earlyLeave = closedRecords.filter((r) => r.final_status === 'early_leave').length;
  const absent = closedRecords.filter((r) => r.final_status === 'absent').length;
  const incomplete = closedRecords.filter((r) => r.final_status === 'incomplete').length;

  const total = totalClosedSessions ?? 0;
  const complete = present + late + earlyLeave;
  const percent = total === 0 ? null : Math.round((complete / total) * 1000) / 10;

  return (
    <div>
      <Link
        href="/students"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors duration-150 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        กลับไปหน้ารายชื่อนักศึกษา
      </Link>

      <PageHeader
        title={student.full_name}
        description={`รหัสนักศึกษา ${student.student_code}${student.phone ? ` · ${student.phone}` : ''}${student.email ? ` · ${student.email}` : ''}`}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={BookOpenCheck} label="เรียนทั้งหมด" value={total} tint="primary" />
        <StatCard icon={CheckCircle2} label="มาเรียน" value={present} tint="success" />
        <StatCard icon={Clock} label="มาสาย" value={late} tint="warning" />
        <StatCard icon={UserX} label="ขาด" value={absent} tint="danger" />
        <StatCard icon={AlertCircle} label="ไม่สมบูรณ์" value={incomplete} tint="primary-light" />
        <StatCard icon={Percent} label="% เข้าเรียน" value={percent === null ? '-' : `${percent}%`} tint="info" />
      </div>

      <Card>
        <p className="mb-4 font-[family-name:var(--font-heading)] text-base font-semibold text-ink">
          ประวัติการเข้าเรียน
        </p>
        {history.length === 0 ? (
          <EmptyState title="ยังไม่มีประวัติการเข้าเรียน" />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <TableTh>วันที่</TableTh>
                <TableTh>รอบเรียน</TableTh>
                <TableTh>ห้อง</TableTh>
                <TableTh>Check-in</TableTh>
                <TableTh>Check-out</TableTh>
                <TableTh>สถานะ</TableTh>
              </tr>
            </TableHead>
            <TableBody>
              {history.map((h) => (
                <TableRow key={h.id}>
                  <TableTd>{formatThaiDateOnly(h.learningDate)}</TableTd>
                  <TableTd>{h.sessionTitle}</TableTd>
                  <TableTd>{h.roomName ? <Badge tone="primary">{h.roomName}</Badge> : '-'}</TableTd>
                  <TableTd>{formatTime(h.checkInTime)}</TableTd>
                  <TableTd>{formatTime(h.checkOutTime)}</TableTd>
                  <TableTd>
                    <Badge tone={attendanceStatusTone(h.finalStatus)}>{attendanceStatusLabel(h.finalStatus)}</Badge>
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
