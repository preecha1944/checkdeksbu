import Link from 'next/link';
import { Activity, CheckCircle2, Clock, Home, LogOut, Plus, UserX, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AttendanceTrendChart, type AttendanceTrendPoint } from '@/components/dashboard/AttendanceTrendChart';
import { RoomDistributionChart, type RoomDistributionPoint } from '@/components/dashboard/RoomDistributionChart';
import { createServiceClient } from '@/lib/supabase/server';
import { attendanceStatusLabel, attendanceStatusTone } from '@/lib/status';
import { formatThaiDateOnly, formatTime } from '@/lib/time';
import type { AttendanceFinalStatus, ClassSession, Student } from '@/types/db';

const COMPLETE_STATUSES: AttendanceFinalStatus[] = ['present', 'late', 'early_leave'];

interface AttendanceRecordRow {
  id: string;
  session_id: string;
  student_id: string;
  room_id: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  final_status: AttendanceFinalStatus | null;
  created_at: string;
  updated_at: string;
  students?: Pick<Student, 'student_code' | 'full_name'> | null;
  rooms?: { name: string } | null;
  class_sessions?: Pick<ClassSession, 'id' | 'title' | 'learning_date'> | null;
}

function getBangkokToday() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

function percent(part: number, total: number) {
  if (total === 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function isComplete(status: AttendanceFinalStatus | null) {
  return !!status && COMPLETE_STATUSES.includes(status);
}

export default async function DashboardPage() {
  const supabase = createServiceClient();

  const { data: studentsRaw } = await supabase.from('students').select('id, status');
  const { data: sessionsRaw } = await supabase
    .from('class_sessions')
    .select('*')
    .order('learning_date', { ascending: false })
    .order('start_time', { ascending: false });
  const { data: closedSessionsRaw } = await supabase
    .from('class_sessions')
    .select('*')
    .eq('status', 'closed')
    .order('learning_date', { ascending: false })
    .order('start_time', { ascending: false })
    .limit(7);
  const { data: recentRecordsRaw } = await supabase
    .from('attendance_records')
    .select('*, students(student_code, full_name), rooms(name), class_sessions(id, title, learning_date)')
    .order('updated_at', { ascending: false })
    .limit(10);

  const students = (studentsRaw ?? []) as unknown as Pick<Student, 'id' | 'status'>[];
  const sessions = (sessionsRaw ?? []) as unknown as ClassSession[];
  const closedSessions = (closedSessionsRaw ?? []) as unknown as ClassSession[];
  const recentRecords = (recentRecordsRaw ?? []) as unknown as AttendanceRecordRow[];
  const today = getBangkokToday();
  const latestSession = sessions.find((session) => session.learning_date === today) ?? sessions[0] ?? null;

  const { data: latestRecordsRaw } = latestSession
    ? await supabase
        .from('attendance_records')
        .select('*, students(student_code, full_name), rooms(name)')
        .eq('session_id', latestSession.id)
        .order('updated_at', { ascending: false })
    : { data: [] };
  const latestRecords = (latestRecordsRaw ?? []) as unknown as AttendanceRecordRow[];

  const closedSessionIds = closedSessions.map((session) => session.id);
  const { data: closedRecordsRaw } = closedSessionIds.length
    ? await supabase
        .from('attendance_records')
        .select('session_id, final_status')
        .in('session_id', closedSessionIds)
    : { data: [] };
  const closedRecords = (closedRecordsRaw ?? []) as unknown as Pick<AttendanceRecordRow, 'session_id' | 'final_status'>[];

  const totalStudents = students.length;
  const checkedIn = latestRecords.filter((record) => record.check_in_time).length;
  const checkedOut = latestRecords.filter((record) => record.check_out_time).length;
  const absent = latestRecords.filter((record) => record.final_status === 'absent').length;
  const late = latestRecords.filter((record) => record.final_status === 'late').length;

  const roomCounts = new Map<string, number>();
  for (const record of latestRecords) {
    if (!record.check_in_time || !record.rooms?.name) continue;
    roomCounts.set(record.rooms.name, (roomCounts.get(record.rooms.name) ?? 0) + 1);
  }
  const roomDistribution: RoomDistributionPoint[] = Array.from(roomCounts.entries()).map(([name, value]) => ({
    name,
    value,
  }));
  const roomOne = roomCounts.get('ห้อง 1') ?? 0;
  const roomTwo = roomCounts.get('ห้อง 2') ?? 0;

  const recordsBySession = new Map<string, Pick<AttendanceRecordRow, 'session_id' | 'final_status'>[]>();
  for (const record of closedRecords) {
    const list = recordsBySession.get(record.session_id) ?? [];
    list.push(record);
    recordsBySession.set(record.session_id, list);
  }
  const trendData: AttendanceTrendPoint[] = closedSessions
    .slice()
    .reverse()
    .map((session) => {
      const records = recordsBySession.get(session.id) ?? [];
      const denominator = records.length || totalStudents;
      const complete = records.filter((record) => isComplete(record.final_status)).length;
      return {
        label: formatThaiDateOnly(session.learning_date),
        percent: percent(complete, denominator),
      };
    });

  const hasAnyData = totalStudents > 0 || sessions.length > 0 || recentRecords.length > 0;

  return (
    <div>
      <PageHeader
        title="แดชบอร์ด"
        description="ภาพรวมการเช็คชื่อและสถิติการเข้าเรียน"
        action={
          <Link href="/sessions">
            <Button>
              <Plus className="h-4 w-4" aria-hidden="true" />
              สร้างรอบเรียน
            </Button>
          </Link>
        }
      />

      {!hasAnyData ? (
        <EmptyState
          icon={Activity}
          title="ยังไม่มีข้อมูลสรุป"
          description="เพิ่มนักศึกษาและสร้างรอบเรียนแรกเพื่อเริ่มดูสถิติการเข้าเรียน"
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/students">
                <Button variant="secondary">เพิ่มนักศึกษา</Button>
              </Link>
              <Link href="/sessions">
                <Button>สร้างรอบเรียน</Button>
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-7">
            <StatCard icon={Users} label="นักศึกษาทั้งหมด" value={totalStudents} tint="primary" />
            <StatCard
              icon={CheckCircle2}
              label="Check-in"
              value={checkedIn}
              hint={`${percent(checkedIn, totalStudents)}% ของทั้งหมด`}
              tint="success"
            />
            <StatCard icon={LogOut} label="Check-out" value={checkedOut} tint="info" />
            <StatCard icon={UserX} label="ขาด" value={absent} tint="danger" />
            <StatCard icon={Clock} label="มาสาย" value={late} tint="warning" />
            <StatCard icon={Home} label="ห้อง 1" value={roomOne} tint="primary" />
            <StatCard icon={Home} label="ห้อง 2" value={roomTwo} tint="primary-light" />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <Card>
              <CardHeader
                title="แนวโน้มการเข้าเรียน"
                description="อัตราเข้าเรียนของ 7 รอบล่าสุดที่ปิดแล้ว"
              />
              <AttendanceTrendChart data={trendData} />
            </Card>
            <Card>
              <CardHeader
                title="สัดส่วนตามห้อง"
                description={latestSession ? `${latestSession.title} (${formatThaiDateOnly(latestSession.learning_date)})` : 'รอบเรียนล่าสุด'}
              />
              <RoomDistributionChart data={roomDistribution} />
            </Card>
          </div>

          <Card>
            <CardHeader
              title="การเช็คชื่อล่าสุด"
              description="10 รายการล่าสุดจากระบบเช็คชื่อ"
              action={
                latestSession && (
                  <Link href={`/sessions/${latestSession.id}`} className="text-sm font-medium text-primary hover:text-primary-deep">
                    ดูรอบล่าสุด
                  </Link>
                )
              }
            />
            {recentRecords.length === 0 ? (
              <EmptyState title="ยังไม่มีรายการเช็คชื่อ" description="เมื่อมีนักศึกษา Check-in รายการล่าสุดจะแสดงที่นี่" />
            ) : (
              <Table>
                <TableHead>
                  <tr>
                    <TableTh>เวลา</TableTh>
                    <TableTh>รหัส</TableTh>
                    <TableTh>ชื่อ-สกุล</TableTh>
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
                          <Link href={`/sessions/${record.class_sessions.id}`} className="text-primary hover:text-primary-deep">
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
        </>
      )}
    </div>
  );
}
