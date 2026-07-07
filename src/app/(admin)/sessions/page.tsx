import Link from 'next/link';
import { CalendarClock, QrCode, Eye } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from '@/components/ui/Table';
import { CreateSessionButton } from '@/components/attendance/CreateSessionButton';
import { DeleteSessionButton } from '@/components/attendance/DeleteSessionButton';
import { createServiceClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/supabase/auth';
import { formatThaiDateOnly, formatTimeOfDay } from '@/lib/time';
import { SESSION_STATUS_MAP } from '@/lib/status';
import type { ClassSession, Course } from '@/types/db';

export default async function SessionsPage() {
  const sessionUser = await getSessionUser();
  const isViewer = sessionUser?.profile?.role === 'viewer';

  const supabase = createServiceClient();
  // เขียนเป็น await เรียงลำดับแทนการรวมใน Promise.all([...]) เดียว — Promise.all กับ query builder
  // ที่มี generic ต่างชนิดกันหลายตัวทำให้ TS infer type ของบางตำแหน่งเป็น never (พบเจอแล้วในไฟล์นี้และ
  // sessions/[id]/page.tsx) แยก await ทำให้แต่ละตัวคง type ที่ถูกต้องของตัวเอง
  const { data: sessionsRaw } = await supabase
    .from('class_sessions')
    .select('*')
    .order('learning_date', { ascending: false })
    .order('start_time', { ascending: false });
  const { data: coursesRaw } = await supabase
    .from('courses')
    .select('id, course_name')
    .order('created_at', { ascending: false });
  const { data: roomsRaw } = await supabase.from('rooms').select('id, name').eq('status', 'active').order('name');
  const { data: recordsRaw } = await supabase.from('attendance_records').select('session_id, check_in_time');

  const sessionList = (sessionsRaw ?? []) as unknown as ClassSession[];
  const courses = (coursesRaw ?? []) as unknown as { id: string; course_name: string }[];
  const rooms = (roomsRaw ?? []) as unknown as { id: string; name: string }[];
  const records = (recordsRaw ?? []) as unknown as { session_id: string; check_in_time: string | null }[];

  const courseNameMap = new Map(courses.map((c) => [c.id, c.course_name]));
  const checkedInCount = new Map<string, number>();
  for (const r of records) {
    if (r.check_in_time) {
      checkedInCount.set(r.session_id, (checkedInCount.get(r.session_id) ?? 0) + 1);
    }
  }

  return (
    <div>
      <PageHeader
        title="รอบเรียน"
        description="สร้างและจัดการรอบเรียน เปิด/ปิดการเช็คชื่อ และดู QR Code"
        action={
          !isViewer && (
            <CreateSessionButton
              courses={(courses ?? []) as unknown as Course[]}
              rooms={rooms ?? []}
            />
          )
        }
      />

      {sessionList.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="ยังไม่มีรอบเรียน"
          description="สร้างรอบเรียนแรกเพื่อเริ่มเปิดเช็คชื่อด้วย QR Code"
        />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableTh>ชื่อรอบเรียน</TableTh>
              <TableTh>รายวิชา</TableTh>
              <TableTh>วันที่</TableTh>
              <TableTh>เวลา</TableTh>
              <TableTh>สถานะ</TableTh>
              <TableTh>Check-in แล้ว</TableTh>
              <TableTh>จัดการ</TableTh>
            </tr>
          </TableHead>
          <TableBody>
            {sessionList.map((s) => {
              const statusMeta = SESSION_STATUS_MAP[s.status] ?? { label: s.status, tone: 'neutral' as const };
              return (
                <TableRow key={s.id}>
                  <TableTd className="font-medium">{s.title}</TableTd>
                  <TableTd>{s.course_id ? courseNameMap.get(s.course_id) ?? '-' : '-'}</TableTd>
                  <TableTd>{formatThaiDateOnly(s.learning_date)}</TableTd>
                  <TableTd>
                    {formatTimeOfDay(s.start_time)} - {formatTimeOfDay(s.end_time)}
                  </TableTd>
                  <TableTd>
                    <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                  </TableTd>
                  <TableTd>{checkedInCount.get(s.id) ?? 0}</TableTd>
                  <TableTd>
                    <div className="flex gap-2">
                      <Link href={`/sessions/${s.id}`}>
                        <Button variant="secondary" size="sm">
                          <Eye className="h-4 w-4" aria-hidden="true" />
                          ดูรายละเอียด
                        </Button>
                      </Link>
                      {s.status === 'open' && (
                        <Link href={`/sessions/${s.id}/qr`} target="_blank">
                          <Button variant="secondary" size="sm">
                            <QrCode className="h-4 w-4" aria-hidden="true" />
                            แสดง QR
                          </Button>
                        </Link>
                      )}
                      {!isViewer && <DeleteSessionButton sessionId={s.id} sessionTitle={s.title} />}
                    </div>
                  </TableTd>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
