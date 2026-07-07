'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { DEFAULT_STUDENT_CLASS_LEVEL, STUDENT_CLASS_LEVELS, normalizeStudentClassLevel } from '@/lib/student-input';
import type { Student } from '@/types/db';

export interface StudentFormModalProps {
  open: boolean;
  onClose: () => void;
  student?: Student | null;
}

export function StudentFormModal({ open, onClose, student }: StudentFormModalProps) {
  const router = useRouter();
  const isEdit = !!student;

  const [studentCode, setStudentCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [classLevel, setClassLevel] = useState<string>(DEFAULT_STUDENT_CLASS_LEVEL);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStudentCode(student?.student_code ?? '');
      setFullName(student?.full_name ?? '');
      setClassLevel(normalizeStudentClassLevel(student?.class_level));
      setPhone(student?.phone ?? '');
      setEmail(student?.email ?? '');
      setStatus(student?.status ?? 'active');
      setError(null);
    }
  }, [open, student]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const url = isEdit ? `/api/students/${student!.id}` : '/api/students';
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_code: studentCode,
        full_name: fullName,
        class_level: classLevel,
        phone,
        email,
        status,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? 'บันทึกไม่สำเร็จ');
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'แก้ไขนักศึกษา' : 'เพิ่มนักศึกษา'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="รหัสนักศึกษา" htmlFor="student_code" required>
          <Input
            id="student_code"
            required
            value={studentCode}
            onChange={(e) => setStudentCode(e.target.value)}
            placeholder="เช่น 66123456789"
          />
        </Field>

        <Field label="ชื่อ-สกุล" htmlFor="full_name" required>
          <Input
            id="full_name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="เช่น นายสมชาย ใจดี"
          />
        </Field>

        <Field label="Section" htmlFor="class_level" required>
          <Select
            id="class_level"
            required
            value={classLevel}
            onChange={(e) => setClassLevel(e.target.value as (typeof STUDENT_CLASS_LEVELS)[number])}
          >
            {STUDENT_CLASS_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="เบอร์โทร" htmlFor="phone">
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="อีเมล" htmlFor="email">
            <Input id="email" type="text" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>

        <Field label="สถานะ" htmlFor="status">
          <Select id="status" value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}>
            <option value="active">ใช้งาน</option>
            <option value="inactive">พ้นสภาพ</option>
          </Select>
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
