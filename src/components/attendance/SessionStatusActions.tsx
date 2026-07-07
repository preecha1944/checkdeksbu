'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QrCode, PlayCircle, StopCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DeleteSessionButton } from '@/components/attendance/DeleteSessionButton';
import type { SessionStatus } from '@/types/db';

export interface SessionStatusActionsProps {
  sessionId: string;
  sessionTitle: string;
  status: SessionStatus;
  isViewer: boolean;
}

export function SessionStatusActions({ sessionId, sessionTitle, status, isViewer }: SessionStatusActionsProps) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [confirmClose, setConfirmClose] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentStatus(status);
  }, [status]);

  async function updateStatus(next: 'open' | 'closed') {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? 'ดำเนินการไม่สำเร็จ');
      return;
    }

    setConfirmClose(false);
    setCurrentStatus(next);
    router.refresh();
  }

  if (isViewer) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {error && <p className="text-sm text-danger">{error}</p>}

      {currentStatus === 'draft' && (
        <Button onClick={() => updateStatus('open')} loading={loading}>
          <PlayCircle className="h-4 w-4" aria-hidden="true" />
          เปิดรอบเช็คชื่อ
        </Button>
      )}

      {currentStatus === 'open' && (
        <>
          <Link href={`/sessions/${sessionId}/qr`} target="_blank">
            <Button variant="secondary">
              <QrCode className="h-4 w-4" aria-hidden="true" />
              แสดง QR Code
            </Button>
          </Link>
          <Button variant="danger" onClick={() => setConfirmClose(true)}>
            <StopCircle className="h-4 w-4" aria-hidden="true" />
            ปิดรอบเรียน
          </Button>
        </>
      )}

      {currentStatus === 'closed' && (
        <a href={`/api/export/sessions/${sessionId}`}>
          <Button variant="secondary">
            <Download className="h-4 w-4" aria-hidden="true" />
            Export Excel
          </Button>
        </a>
      )}

      <DeleteSessionButton sessionId={sessionId} sessionTitle={sessionTitle} redirectTo="/sessions" size="md" />

      <Modal open={confirmClose} onClose={() => setConfirmClose(false)} title="ยืนยันปิดรอบเรียน">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            เมื่อปิดรอบเรียนแล้ว QR Code จะใช้งานไม่ได้ นักศึกษาที่ยังไม่เช็คชื่อจะถูกบันทึกเป็น
            &quot;ขาดเรียน&quot; และคนที่ Check-in แต่ไม่ Check-out จะถูกบันทึกเป็น &quot;เช็คชื่อไม่สมบูรณ์&quot;
            ไม่สามารถย้อนกลับได้
          </p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setConfirmClose(false)}>
              ยกเลิก
            </Button>
            <Button type="button" variant="danger" loading={loading} onClick={() => updateStatus('closed')}>
              ยืนยันปิดรอบเรียน
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
