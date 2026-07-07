'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

export interface DeleteSessionButtonProps {
  sessionId: string;
  sessionTitle: string;
  redirectTo?: string;
  size?: 'sm' | 'md';
}

export function DeleteSessionButton({ sessionId, sessionTitle, redirectTo, size = 'sm' }: DeleteSessionButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? 'ลบรอบเรียนไม่สำเร็จ');
      return;
    }

    setOpen(false);
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  return (
    <>
      <Button type="button" variant="danger" size={size} onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        ลบ
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="ยืนยันการลบรอบเรียน">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            ต้องการลบ <span className="font-medium text-ink">{sessionTitle}</span> ใช่หรือไม่?
            ข้อมูลเช็คชื่อ, QR token และห้องที่ผูกกับรอบเรียนนี้จะถูกลบไปด้วย และไม่สามารถย้อนกลับได้
          </p>

          {error && (
            <div className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <Button type="button" variant="danger" loading={loading} onClick={handleDelete}>
              ยืนยันลบ
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
