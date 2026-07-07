'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Users } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
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
  const router = useRouter();
  const [editing, setEditing] = useState<SessionRecordRow | null>(null);
  const [deleting, setDeleting] = useState<SessionRecordRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleting) return;
    setDeleteError(null);
    setDeleteLoading(true);

    const res = await fetch(`/api/records/${deleting.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    setDeleteLoading(false);

    if (!res.ok) {
      setDeleteError(data?.error ?? 'ลบข้อมูลการเช็คชื่อไม่สำเร็จ');
      return;
    }

    setDeleting(null);
    router.refresh();
  }

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
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(r)}
                      aria-label={`แก้ไขข้อมูลของ ${r.studentName}`}
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-primary-soft hover:text-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleting(r);
                      }}
                      aria-label={`ลบข้อมูลเช็คชื่อของ ${r.studentName}`}
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
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

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="ยืนยันการลบข้อมูลเช็คชื่อ">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            ต้องการลบ record ของ <span className="font-medium text-ink">{deleting?.studentName}</span> (
            {deleting?.studentCode}) ใช่หรือไม่? หลังลบแล้วนักศึกษาคนนี้จะสามารถสแกน Check-in ใหม่ในรอบเรียนนี้ได้
          </p>

          {deleteError && (
            <div className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
              {deleteError}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setDeleting(null)}>
              ยกเลิก
            </Button>
            <Button type="button" variant="danger" loading={deleteLoading} onClick={handleDelete}>
              ยืนยันลบ
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
