'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, UnlockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Course, UserRole } from '@/types/db';

export function LockGradeActions({ course, role }: { course: Course; role: UserRole }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function lock() {
    if (!window.confirm('Lock Grade จะ snapshot คะแนนและเกรดปัจจุบัน และปิดการแก้ไขคะแนน ต้องการดำเนินการต่อหรือไม่?')) return;
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/courses/${course.id}/lock`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMessage(data?.error ?? 'Lock Grade ไม่สำเร็จ');
      return;
    }
    router.refresh();
  }

  async function unlock() {
    if (!window.confirm('ต้องการปลดล็อกรายวิชานี้ใช่หรือไม่?')) return;
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/courses/${course.id}/lock`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMessage(data?.error ?? 'ปลดล็อกไม่สำเร็จ');
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader title="Lock Grade" description="ล็อกผลคะแนนเมื่อสรุปเกรดเรียบร้อยแล้ว" />
      {message && <div className="mb-3 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{message}</div>}
      <div className="mb-4">
        <Badge tone={course.is_locked ? 'primary' : 'neutral'}>
          {course.is_locked ? `Lock แล้ว${course.locked_at ? ` (${new Date(course.locked_at).toLocaleString('th-TH')})` : ''}` : 'ยังไม่ Lock'}
        </Badge>
      </div>
      {course.is_locked ? (
        role === 'admin' && (
          <Button type="button" variant="secondary" loading={loading} onClick={unlock}>
            <UnlockKeyhole className="h-4 w-4" aria-hidden="true" />
            ปลดล็อก
          </Button>
        )
      ) : (
        <Button type="button" loading={loading} onClick={lock}>
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          Lock Grade
        </Button>
      )}
    </Card>
  );
}
