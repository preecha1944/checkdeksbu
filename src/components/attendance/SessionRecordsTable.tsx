'use client';

import { useState } from 'react';
import { Pencil, Users } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { RecordEditModal, RecordEditModalRecord } from '@/components/attendance/RecordEditModal';
import { formatTime } from '@/lib/time';
import { attendanceStatusLabel, attendanceStatusTone } from '@/lib/status';

export interface SessionRecordRow {
  id: string;
  studentCode: string;
  studentName: string;
  roomId: string | null;
  roomName: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  lateMinutes: number;
  finalStatus: RecordEditModalRecord['finalStatus'];
  note: string | null;
}

export interface SessionRecordsTableProps {
  records: SessionRecordRow[];
  rooms: { id: string; name: string }[];
  isViewer: boolean;
}

export function SessionRecordsTable({ records, rooms, isViewer }: SessionRecordsTableProps) {
  const [editing, setEditing] = useState<SessionRecordRow | null>(null);

  if (records.length === 0) {
    return (
      <EmptyState icon={Users} title="ยังไม่มีการเช็คชื่อ" description="รายชื่อจะปรากฏเมื่อนักศึกษาเริ่ม Check-in" />
    );
  }

  return (
    <>
      <Table>
        <TableHead>
          <tr>
            <TableTh>รหัส</TableTh>
            <TableTh>ชื่อ-สกุล</TableTh>
            <TableTh>ห้อง</TableTh>
            <TableTh>Check-in</TableTh>
            <TableTh>Check-out</TableTh>
            <TableTh>สาย (นาที)</TableTh>
            <TableTh>สถานะ</TableTh>
            {!isViewer && <TableTh>จัดการ</TableTh>}
          </tr>
        </TableHead>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.id}>
              <TableTd className="font-medium">{r.studentCode}</TableTd>
              <TableTd>{r.studentName}</TableTd>
              <TableTd>
                {r.roomName ? <Badge tone="primary">{r.roomName}</Badge> : <span className="text-ink-muted">-</span>}
              </TableTd>
              <TableTd>{formatTime(r.checkInTime)}</TableTd>
              <TableTd>{formatTime(r.checkOutTime)}</TableTd>
              <TableTd>{r.lateMinutes > 0 ? r.lateMinutes : '-'}</TableTd>
              <TableTd>
                <Badge tone={attendanceStatusTone(r.finalStatus)}>{attendanceStatusLabel(r.finalStatus)}</Badge>
              </TableTd>
              {!isViewer && (
                <TableTd>
                  <button
                    type="button"
                    onClick={() => setEditing(r)}
                    aria-label={`แก้ไขข้อมูลของ ${r.studentName}`}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-primary-soft hover:text-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                </TableTd>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <RecordEditModal
        open={!!editing}
        onClose={() => setEditing(null)}
        record={
          editing
            ? {
                id: editing.id,
                studentCode: editing.studentCode,
                studentName: editing.studentName,
                roomId: editing.roomId,
                checkInTime: editing.checkInTime,
                checkOutTime: editing.checkOutTime,
                finalStatus: editing.finalStatus,
                note: editing.note,
              }
            : null
        }
        rooms={rooms}
      />
    </>
  );
}
