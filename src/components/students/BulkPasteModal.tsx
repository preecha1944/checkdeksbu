'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';

export interface BulkPasteModalProps {
  open: boolean;
  onClose: () => void;
}

interface BulkResult {
  added: number;
  updated: number;
  errors: string[];
}

export function BulkPasteModal({ open, onClose }: BulkPasteModalProps) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);

  function handleClose() {
    setText('');
    setResult(null);
    setError(null);
    onClose();
  }

  async function handleSubmit() {
    setError(null);
    setLoading(true);

    const res = await fetch('/api/students/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? 'นำเข้าไม่สำเร็จ');
      return;
    }

    setResult(data as BulkResult);
    router.refresh();
  }

  return (
    <Modal open={open} onClose={handleClose} title="วางรายชื่อนักศึกษา">
      <div className="flex flex-col gap-4">
        <div>
          <Label htmlFor="bulkText">วางข้อมูลจาก Excel</Label>
          <p className="mb-2 text-xs text-ink-muted">
            คอลัมน์: รหัส [Tab] ชื่อ-สกุล [Tab] เบอร์โทร [Tab] อีเมล — บรรทัดละ 1 คน (คัดลอกจาก Excel มาวางได้เลย)
          </p>
          <textarea
            id="bulkText"
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-xl border border-border-soft bg-white p-3 font-mono text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder={'66123456789\tนายสมชาย ใจดี\t0812345678\tsomchai@example.com'}
          />
        </div>

        {error && (
          <div className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-xl bg-primary-soft p-4 text-sm text-ink">
            <p>
              เพิ่ม {result.added} คน, อัปเดต {result.updated} คน
              {result.errors.length > 0 && `, ผิดพลาด ${result.errors.length} บรรทัด`}
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-danger">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={handleClose}>
            ปิด
          </Button>
          <Button type="button" loading={loading} onClick={handleSubmit} disabled={!text.trim()}>
            นำเข้ารายชื่อ
          </Button>
        </div>
      </div>
    </Modal>
  );
}
