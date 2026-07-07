'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from '@/components/ui/Table';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { SPECIAL_STATUSES } from '@/lib/constants';
import { DEFAULT_STUDENT_CLASS_LEVEL, STUDENT_CLASS_LEVELS } from '@/lib/student-input';
import type { GradeSummaryRow } from '@/lib/grades';
import type { Course, SpecialStatus } from '@/types/db';

export function GradeSummaryTable({ course, rows }: { course: Course; rows: GradeSummaryRow[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState('all');
  const [remarks, setRemarks] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.student.id, row.remark ?? '']))
  );

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => classFilter === 'all' || (row.student.class_level ?? DEFAULT_STUDENT_CLASS_LEVEL) === classFilter),
    [rows, classFilter]
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
      <CardHeader
        title="สรุปคะแนนและเกรด"
        description={course.is_locked ? 'ข้อมูลถูก snapshot ตอน Lock แล้ว' : 'คำนวณสดจากคะแนนปัจจุบัน'}
      />
      <div className="mb-4 max-w-48">
        <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="all">ทุกชั้นเรียน</option>
          {STUDENT_CLASS_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </Select>
      </div>
      {message && <div className="mb-3 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-deep">{message}</div>}
      {filteredRows.length === 0 ? (
        <EmptyState title="ยังไม่มีนักศึกษา" description="เพิ่มนักศึกษา active ก่อนดูสรุปเกรด หรือเลือกชั้นเรียนอื่น" />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableTh>รหัส</TableTh>
              <TableTh>ชื่อ-สกุล</TableTh>
              <TableTh>ชั้นเรียน</TableTh>
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
            {filteredRows.map((row) => (
              <TableRow key={row.student.id}>
                <TableTd className="font-medium">{row.student.student_code}</TableTd>
                <TableTd>{row.student.full_name}</TableTd>
                <TableTd>
                  <Badge tone="primary">{row.student.class_level ?? DEFAULT_STUDENT_CLASS_LEVEL}</Badge>
                </TableTd>
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
                    onChange={(event) =>
                      saveMeta(row.student.id, event.target.value ? (event.target.value as SpecialStatus) : null, remarks[row.student.id] ?? '')
                    }
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
