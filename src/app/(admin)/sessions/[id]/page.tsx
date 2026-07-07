import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Users, CheckCircle2, LogOut, Clock, UserX, Home, Download } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { SessionStatusActions } from '@/components/attendance/SessionStatusActions';
import { SessionRecordsTable, SessionRecordRow } from '@/components/attendance/SessionRecordsTable';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/supabase/auth';
import { formatThaiDateOnly, formatTimeOfDay } from '@/lib/time';
import { SESSION_STATUS_MAP } from '@/lib/status';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { AttendanceRecord, ClassSession } from '@/types/db';

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionUser = await getSessionUser();
  const isViewer = sessionUser?.profile?.role === 'viewer';

  const supabase = createServiceClient();

  const { data: sessionRow } = await supabase
    .from('class_sessions')
    .select('id, title, course_id, learning_date, start_time, end_time, status')
    .eq('id', id)
    .maybeSingle();
  if (!sessionRow) notFound();
  const session = sessionRow as unknown as ClassSession;

  // Database type ใน types/db.ts ไม่มี Relationships metadata ทำให้ raw `data` ของทุก query
  // infer เป็น never — ต้อง cast เป็น type จริงเสมอก่อนใช้งาน (เหมือน sessionRow ด้านบน)
  const { data: courseRow } = await supabase
    .from('courses')
    .select('course_name')
    .eq('id', session.course_id ?? '')
    .maybeSingle();
  const course = courseRow as unknown as { course_name: string } | null;

  const { data: sessionRoomsRaw } = await supabase
    .from('session_rooms')
    .select('room_id, rooms(id, name)')
    .eq('session_id', id);
  const sessionRooms = sessionRoomsRaw as unknown as
    | { room_id: string; rooms: { id: string; name: string } | null }[]
    | null;

  const { data: recordsRaw } = await supabase
    .from('attendance_records')
    .select('id, room_id, check_in_time, check_out_time, late_minutes, final_status, note, students(student_code, full_name), rooms(id, name)')
    .eq('session_id', id)
    .order('check_in_time', { ascending: true });
  const records = recordsRaw as unknown as
    | Array<
        AttendanceRecord & {
          students: { student_code: string; full_name: string } | null;
          rooms: { id: string; name: string } | null;
        }
      >
    | null;

  const { count: totalStudents } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  const rooms = (sessionRooms ?? [])
    .map((sr) => sr.rooms)
    .filter((r): r is { id: string; name: string } => !!r);

  const recordRows: SessionRecordRow[] = (records ?? []).map((r) => {
    const student = r.students;
    const room = r.rooms;
    return {
      id: r.id,
      studentCode: student?.student_code ?? '-',
      studentName: student?.full_name ?? '-',
      roomId: r.room_id,
      roomName: room?.name ?? null,
      checkInTime: r.check_in_time,
      checkOutTime: r.check_out_time,
      lateMinutes: r.late_minutes ?? 0,
      finalStatus: r.final_status,
      note: r.note,
    };
  });

  const checkedIn = recordRows.filter((r) => r.checkInTime).length;
  const checkedOut = recordRows.filter((r) => r.checkOutTime).length;
  const late = recordRows.filter((r) => r.finalStatus === 'late').length;
  const notCome = Math.max(0, (totalStudents ?? 0) - checkedIn);

  const statusMeta = SESSION_STATUS_MAP[session.status] ?? { label: session.status, tone: 'neutral' as const };

  return (
    <div>
      <PageHeader
        title={session.title}
        description={`${course?.course_name ?? 'ไม่ระบุวิชา'} · ${formatThaiDateOnly(session.learning_date)} · ${formatTimeOfDay(session.start_time)} - ${formatTimeOfDay(session.end_time)}`}
        action={
          <div className="flex items-center gap-3">
            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
            <Link href={`/api/export/sessions/${session.id}`}>
              <Button variant="secondary" size="sm">
                <Download className="h-4 w-4" aria-hidden="true" />
                Export Excel
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6">
        <SessionStatusActions sessionId={session.id} sessionTitle={session.title} status={session.status} isViewer={isViewer} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={Users} label="นักศึกษาทั้งหมด" value={totalStudents ?? 0} tint="primary" />
        <StatCard icon={CheckCircle2} label="Check-in แล้ว" value={checkedIn} tint="success" />
        <StatCard icon={LogOut} label="Check-out แล้ว" value={checkedOut} tint="info" />
        <StatCard icon={Clock} label="มาสาย" value={late} tint="warning" />
        <StatCard icon={UserX} label="ยังไม่มา" value={notCome} tint="danger" />
        {rooms.map((room) => {
          const roomCheckedIn = recordRows.filter((r) => r.roomId === room.id && r.checkInTime).length;
          return (
            <StatCard
              key={room.id}
              icon={Home}
              label={room.name}
              value={roomCheckedIn}
              hint="Check-in แล้ว"
              tint="primary-light"
            />
          );
        })}
      </div>

      <Card>
        <CardHeader title="รายชื่อเช็คชื่อ" description="รายชื่อนักศึกษาที่เช็คชื่อในรอบเรียนนี้" />
        <SessionRecordsTable records={recordRows} rooms={rooms} isViewer={isViewer} />
      </Card>
    </div>
  );
}
