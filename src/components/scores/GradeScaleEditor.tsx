'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import type { Course, GradeScale } from '@/types/db';

export function GradeScaleEditor({ course, scales }: { course: Course; scales: GradeScale[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(() =>
    scales.map((scale) => ({
      grade: scale.grade,
      min_score: String(scale.min_score),
      max_score: String(scale.max_score),
      grade_point: scale.grade_point === null || scale.grade_point === undefined ? '' : String(scale.grade_point),
    }))
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function updateRow(index: number, patch: Partial<(typeof rows)[number]>) {
    setRows((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function save() {
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/courses/${course.id}/grade-scale`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scales: rows.map((row, index) => ({
          grade: row.grade,
          min_score: Number(row.min_score),
          max_score: Number(row.max_score),
          grade_point: row.grade_point.trim() === '' ? null : Number(row.grade_point),
          sort_order: index + 1,
        })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMessage(data?.error ?? 'บันทึกเกณฑ์เกรดไม่สำเร็จ');
      return;
    }
    setMessage('บันทึกเกณฑ์เกรดแล้ว');
    router.refresh();
  }

  return (
    <Card>
      <CardHeader title="Grade Scale" description="กำหนดช่วงคะแนน เกรด และค่าคะแนน" />
      {message && <div className="mb-3 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-deep">{message}</div>}
      <div className="mb-2 grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-ink-muted">
        <span>เกรด</span>
        <span>ต่ำสุด</span>
        <span>สูงสุด</span>
        <span>ค่าคะแนน</span>
        <span className="w-9" />
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2">
            <Input value={row.grade} disabled={course.is_locked} onChange={(event) => updateRow(index, { grade: event.target.value })} />
            <Input
              type="number"
              step="0.01"
              value={row.min_score}
              disabled={course.is_locked}
              onChange={(event) => updateRow(index, { min_score: event.target.value })}
            />
            <Input
              type="number"
              step="0.01"
              value={row.max_score}
              disabled={course.is_locked}
              onChange={(event) => updateRow(index, { max_score: event.target.value })}
            />
            <Input
              type="number"
              step="0.5"
              min="0"
              max="4"
              placeholder="-"
              value={row.grade_point}
              disabled={course.is_locked}
              onChange={(event) => updateRow(index, { grade_point: event.target.value })}
            />
            <Button
              type="button"
              size="sm"
              variant="danger"
              disabled={course.is_locked || rows.length <= 1}
              onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-muted">เว้นช่องค่าคะแนนว่างไว้ได้ ถ้าเกรดนั้นไม่คิดค่าคะแนน (เช่น I, W)</p>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={course.is_locked}
          onClick={() => setRows((current) => [...current, { grade: '', min_score: '0', max_score: '0', grade_point: '' }])}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          เพิ่มแถว
        </Button>
        <Button type="button" disabled={course.is_locked} loading={loading} onClick={save}>
          <Save className="h-4 w-4" aria-hidden="true" />
          บันทึกเกณฑ์
        </Button>
      </div>
    </Card>
  );
}
