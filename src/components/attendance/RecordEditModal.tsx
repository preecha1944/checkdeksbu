'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toBangkokDateTimeLocal, fromBangkokDateTimeLocal } from '@/lib/time';
import { ATTENDANCE_STATUS_MAP } from '@/lib/status';
import type { AttendanceFinalStatus } from '@/types/db';

export interface RecordEditModalRecord {
  id: string;
  studentCode: string;
  studentName: string;
  roomId: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  finalStatus: AttendanceFinalStatus | null;
  note: string | null;
}

export interface RecordEditModalProps {
  open: boolean;
  onClose: () => void;
  record: RecordEditModalRecord | null;
  rooms: { id: string; name: string }[];
}

const STATUS_OPTIONS = Object.entries(ATTENDANCE_STATUS_MAP) as [AttendanceFinalStatus, { label: string }][];

export function RecordEditModal({ open, onClose, record, rooms }: RecordEditModalProps) {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');
  const [checkInLocal, setCheckInLocal] = useState('');
  const [checkOutLocal, setCheckOutLocal] = useState('');
  const [finalStatus, setFinalStatus] = useState<AttendanceFinalStatus | ''>('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      setRoomId(record.roomId ?? '');
      setCheckInLocal(toBangkokDateTimeLocal(record.checkInTime));
      setCheckOutLocal(toBangkokDateTimeLocal(record.checkOutTime));
      setFinalStatus(record.finalStatus ?? '');
      setNote(record.note ?? '');
      setError(null);
    }
  }, [record]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!record) return;
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/records/${record.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: roomId || null,
        checkInTime: fromBangkokDateTimeLocal(checkInLocal),
        checkOutTime: fromBangkokDateTimeLocal(checkOutLocal),
        finalStatus: finalStatus || null,
        note: note || null,
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data?.error ?? 'บันทึกไม่สำเร็จ');
      setLoading(false);
      return;
    }

    setLoading(false);
    onClose();
    router.refresh();
  }

  if (!record) return null;

  return (
    <Modal open={open} onClose={onClose} title={`แก้ไขข้อมูล: ${record.studentName}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">รหัสนักศึกษา {record.studentCode}</p>

        <Field label="ห้องเรียน" htmlFor="roomId">
          <Select id="roomId" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            <option value="">- ไม่ระบุ -</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="เวลา Check-in" htmlFor="checkInLocal">
            <Input
              id="checkInLocal"
              type="datetime-local"
              value={checkInLocal}
              onChange={(e) => setCheckInLocal(e.target.value)}
            />
          </Field>
          <Field label="เวลา Check-out" htmlFor="checkOutLocal">
            <Input
              id="checkOutLocal"
              type="datetime-local"
              value={checkOutLocal}
              onChange={(e) => setCheckOutLocal(e.target.value)}
            />
          </Field>
        </div>

        <Field label="สถานะ" htmlFor="finalStatus">
          <Select
            id="finalStatus"
            value={finalStatus}
            onChange={(e) => setFinalStatus(e.target.value as AttendanceFinalStatus)}
          >
            <option value="">- ไม่ระบุ -</option>
            {STATUS_OPTIONS.map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="หมายเหตุ" htmlFor="note">
          <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>

        {error && (
          <div className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
            {error}
          </div>
        )}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" loading={loading}>
            บันทึก
          </Button>
        </div>
      </form>
    </Modal>
  );
}
