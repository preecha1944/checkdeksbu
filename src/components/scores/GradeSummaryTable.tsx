'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from '@/components/ui/Table';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { SPECIAL_STATUSES } from '@/lib/constants';
import type { GradeSummaryRow } from '@/lib/grades';
import type { Course, SpecialStatus } from '@/types/db';

export function GradeSummaryTable({ course, rows }: { course: Course; rows: GradeSummaryRow[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.student.id, row.remark ?? '']))
  );

  async function saveMeta(studentId: string, specialStatus: SpecialStatus | null, remark: string) {
    setMessage(null);
    const res = await fetch(`/api/courses/${course.id}/summary`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, special_status: specialStatus, remark }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data?.error ?? 'บันทึกสถานะพิเศษไม่สำเร็จ');
      return;
    }
    setMessage('บันทึกแล้ว');
    router.refresh();
  }

  return (
    <Card>
      <CardHeader title="สรุปคะแนนและเกรด" description={course.is_locked ? 'ข้อมูลถูก snapshot ตอน Lock แล้ว' : 'คำนวณสดจากคะแนนปัจจุบัน'} />
      {message && <div className="mb-3 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-deep">{message}</div>}
      {rows.length === 0 ? (
        <EmptyState title="ยังไม่มีนักศึกษา" description="เพิ่มนักศึกษา active ก่อนดูสรุปเกรด" />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableTh>รหัส</TableTh>
              <TableTh>ชื่อ-สกุล</TableTh>
              <TableTh>Coursework</TableTh>
              <TableTh>Attendance</TableTh>
              <TableTh>Midterm</TableTh>
              <TableTh>Final</TableTh>
              <TableTh>Total</TableTh>
              <TableTh>Grade</TableTh>
              <TableTh>Special</TableTh>
              <TableTh>Remark</TableTh>
            </tr>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.student.id}>
                <TableTd className="font-medium">{row.student.student_code}</TableTd>
                <TableTd>{row.student.full_name}</TableTd>
                <TableTd>{row.coursework}</TableTd>
                <TableTd>{row.attendance}</TableTd>
                <TableTd>{row.midterm}</TableTd>
                <TableTd>{row.final}</TableTd>
                <TableTd className="font-semibold">{row.total}</TableTd>
                <TableTd>
                  <Badge tone={row.grade === '-' ? 'neutral' : 'primary'}>{row.grade}</Badge>
                </TableTd>
                <TableTd>
                  <Select
                    value={row.special_status ?? ''}
                    disabled={course.is_locked}
                    onChange={(event) => saveMeta(row.student.id, event.target.value ? (event.target.value as SpecialStatus) : null, remarks[row.student.id] ?? '')}
                  >
                    <option value="">-</option>
                    {SPECIAL_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </TableTd>
                <TableTd>
                  <Input
                    value={remarks[row.student.id] ?? ''}
                    disabled={course.is_locked}
                    onChange={(event) => setRemarks((current) => ({ ...current, [row.student.id]: event.target.value }))}
                    onBlur={(event) => saveMeta(row.student.id, row.special_status, event.target.value)}
                  />
                </TableTd>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
