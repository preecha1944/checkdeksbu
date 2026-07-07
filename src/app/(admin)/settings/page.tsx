import Link from 'next/link';
import { BookOpenCheck, Clock, Database, ExternalLink, FileText, QrCode, ShieldCheck, TimerReset } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from '@/components/ui/Table';
import { getSessionUser } from '@/lib/supabase/auth';
import { EARLY_LEAVE_MINUTES, QR_GRACE_SECONDS, QR_ROTATE_SECONDS, TZ_OFFSET } from '@/lib/constants';

const manualChecklist = [
  'รัน supabase/schema.sql ใน Supabase SQL Editor',
  'สร้าง user แรกเพื่อให้ได้ role admin อัตโนมัติ',
  'เพิ่มนักศึกษาและสร้างรายวิชา',
  'สร้างรอบเรียน เปิด QR แล้วทดสอบ Check-in / Check-out',
  'ดึงคะแนน Attendance และ Lock Grade เมื่อสรุปผลแล้ว',
  'ทดสอบ Export Excel ทั้ง 3 ประเภท',
];

export default async function SettingsPage() {
  const sessionUser = await getSessionUser();
  const role = sessionUser?.profile?.role ?? 'teacher';
  const fullName = sessionUser?.profile?.full_name ?? sessionUser?.email ?? 'ผู้ใช้งาน';

  return (
    <div>
      <PageHeader
        title="Settings"
        description="ตรวจค่าระบบ คู่มือการใช้งาน และทางลัดสำหรับผู้ดูแลระบบ"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="บัญชีผู้ใช้" description="ข้อมูล session ปัจจุบัน" />
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-white">
              {fullName.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-ink">{fullName}</p>
              <Badge tone={role === 'admin' ? 'primary' : role === 'viewer' ? 'neutral' : 'info'}>{role}</Badge>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="QR Settings" description="ค่าคงที่ของระบบเช็คชื่อ" />
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-primary-soft p-3">
              <QrCode className="mx-auto mb-1 h-5 w-5 text-primary" aria-hidden="true" />
              <p className="font-bold text-ink">{QR_ROTATE_SECONDS}s</p>
              <p className="text-xs text-ink-muted">Rotate</p>
            </div>
            <div className="rounded-xl bg-info-soft p-3">
              <TimerReset className="mx-auto mb-1 h-5 w-5 text-info" aria-hidden="true" />
              <p className="font-bold text-ink">{QR_GRACE_SECONDS}s</p>
              <p className="text-xs text-ink-muted">Grace</p>
            </div>
            <div className="rounded-xl bg-warning-soft p-3">
              <Clock className="mx-auto mb-1 h-5 w-5 text-warning" aria-hidden="true" />
              <p className="font-bold text-ink">{TZ_OFFSET}</p>
              <p className="text-xs text-ink-muted">Timezone</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Attendance Rules" description="ค่า default ที่ใช้ตอนสร้างรอบเรียน" />
          <div className="rounded-xl border border-border-soft bg-white p-4">
            <p className="text-sm text-ink-muted">Early leave threshold</p>
            <p className="font-[family-name:var(--font-heading)] text-2xl font-bold text-ink">{EARLY_LEAVE_MINUTES} นาที</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader title="Manual Checklist" description="ขั้นตอนสำคัญก่อนใช้งานจริง" />
          <Table>
            <TableHead>
              <tr>
                <TableTh>ลำดับ</TableTh>
                <TableTh>รายการตรวจสอบ</TableTh>
              </tr>
            </TableHead>
            <TableBody>
              {manualChecklist.map((item, index) => (
                <TableRow key={item}>
                  <TableTd className="font-medium">{index + 1}</TableTd>
                  <TableTd>{item}</TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="System Status" description="แหล่งข้อมูลหลักของระบบ" />
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-border-soft bg-white p-3">
                <Database className="h-5 w-5 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-ink">Supabase</p>
                  <p className="text-xs text-ink-muted">Auth, database, service role API</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border-soft bg-white p-3">
                <ShieldCheck className="h-5 w-5 text-success" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-ink">Role Guard</p>
                  <p className="text-xs text-ink-muted">Admin / Teacher / Viewer</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Quick Links" description="ทางลัดงานดูแลระบบ" />
            <div className="flex flex-col gap-2">
              <Link href="/sessions">
                <Button variant="secondary" className="w-full justify-start">
                  <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
                  จัดการรอบเรียน
                </Button>
              </Link>
              <Link href="/reports">
                <Button variant="secondary" className="w-full justify-start">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  รายงานและ Export
                </Button>
              </Link>
              <Link href="/attendance">
                <Button variant="secondary" className="w-full justify-start">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Attendance Center
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
