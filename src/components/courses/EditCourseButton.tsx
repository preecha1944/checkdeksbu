'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import type { Course } from '@/types/db';

export function EditCourseButton({ course }: { course: Course }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    course_code: course.course_code ?? '',
    course_name: course.course_name,
    academic_year: course.academic_year ?? '',
    semester: course.semester ?? '',
  });

  function openModal() {
    setForm({
      course_code: course.course_code ?? '',
      course_name: course.course_name,
      academic_year: course.academic_year ?? '',
      semester: course.semester ?? '',
    });
    setError(null);
    setOpen(true);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/courses/${course.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? 'บันทึกรายวิชาไม่สำเร็จ');
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={openModal}>
        <Pencil className="h-4 w-4" aria-hidden="true" />
        แก้ไข
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="แก้ไขรายวิชา">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="รหัสวิชา" htmlFor={`course_code_${course.id}`}>
            <Input
              id={`course_code_${course.id}`}
              value={form.course_code}
              onChange={(e) => setForm((current) => ({ ...current, course_code: e.target.value }))}
              placeholder="เช่น CS101"
            />
          </Field>

          <Field label="ชื่อวิชา" htmlFor={`course_name_${course.id}`} required>
            <Input
              id={`course_name_${course.id}`}
              required
              value={form.course_name}
              onChange={(e) => setForm((current) => ({ ...current, course_name: e.target.value }))}
              placeholder="เช่น Data Structures"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="ปีการศึกษา" htmlFor={`academic_year_${course.id}`}>
              <Input
                id={`academic_year_${course.id}`}
                value={form.academic_year}
                onChange={(e) => setForm((current) => ({ ...current, academic_year: e.target.value }))}
              />
            </Field>
            <Field label="เทอม" htmlFor={`semester_${course.id}`}>
              <Input
                id={`semester_${course.id}`}
                value={form.semester}
                onChange={(e) => setForm((current) => ({ ...current, semester: e.target.value }))}
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
              บันทึก
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
