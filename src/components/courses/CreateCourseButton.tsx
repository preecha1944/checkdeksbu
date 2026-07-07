'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';

export function CreateCourseButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    course_code: '',
    course_name: '',
    academic_year: '2569',
    semester: '1',
  });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data?.error ?? 'สร้างรายวิชาไม่สำเร็จ');
      setLoading(false);
      return;
    }

    setLoading(false);
    setOpen(false);
    setForm({ course_code: '', course_name: '', academic_year: '2569', semester: '1' });
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        สร้างรายวิชา
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="สร้างรายวิชาใหม่">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="รหัสวิชา" htmlFor="course_code">
            <Input
              id="course_code"
              value={form.course_code}
              onChange={(e) => setForm((f) => ({ ...f, course_code: e.target.value }))}
              placeholder="เช่น CS101"
            />
          </Field>

          <Field label="ชื่อวิชา" htmlFor="course_name" required>
            <Input
              id="course_name"
              required
              value={form.course_name}
              onChange={(e) => setForm((f) => ({ ...f, course_name: e.target.value }))}
              placeholder="เช่น Data Structures"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="ปีการศึกษา" htmlFor="academic_year">
              <Input
                id="academic_year"
                value={form.academic_year}
                onChange={(e) => setForm((f) => ({ ...f, academic_year: e.target.value }))}
              />
            </Field>
            <Field label="ภาคเรียน" htmlFor="semester">
              <Input
                id="semester"
                value={form.semester}
                onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value }))}
              />
            </Field>
          </div>

          {error && (
            <div className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
              {error}
            </div>
          )}

          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" loading={loading}>
              สร้างรายวิชา
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
