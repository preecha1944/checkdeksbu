'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export interface SessionFormCourse {
  id: string;
  course_name: string;
}

export interface SessionFormRoom {
  id: string;
  name: string;
}

export interface SessionFormProps {
  open: boolean;
  onClose: () => void;
  courses: SessionFormCourse[];
  rooms: SessionFormRoom[];
}

function todayStr(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const total = ((h * 60 + m + minutes) % (24 * 60) + 24 * 60) % (24 * 60);
  const hh = Math.floor(total / 60).toString().padStart(2, '0');
  const mm = (total % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export function SessionForm({ open, onClose, courses, rooms }: SessionFormProps) {
  const router = useRouter();
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [learningDate, setLearningDate] = useState(todayStr());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [lateAfterTime, setLateAfterTime] = useState('09:15');
  const [lateTouched, setLateTouched] = useState(false);
  const [earlyLeaveMinutes, setEarlyLeaveMinutes] = useState(30);
  const [roomIds, setRoomIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCourseId(courses.length === 1 ? courses[0].id : '');
      setRoomIds(rooms.map((r) => r.id));
      setError(null);
      setLateTouched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleStartTimeChange(value: string) {
    setStartTime(value);
    if (!lateTouched) {
      setLateAfterTime(addMinutes(value, 15));
    }
  }

  function toggleRoom(roomId: string) {
    setRoomIds((prev) => (prev.includes(roomId) ? prev.filter((r) => r !== roomId) : [...prev, roomId]));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (endTime <= startTime) {
      setError('เวลาเลิกต้องอยู่หลังเวลาเริ่ม');
      return;
    }
    if (lateAfterTime < startTime || lateAfterTime > endTime) {
      setError('เวลาที่ถือว่าสายต้องอยู่ระหว่างเวลาเริ่มและเวลาเลิก');
      return;
    }
    if (roomIds.length === 0) {
      setError('กรุณาเลือกห้องเรียนอย่างน้อย 1 ห้อง');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: courseId || null,
        title,
        learningDate,
        startTime,
        endTime,
        lateAfterTime,
        earlyLeaveMinutes,
        roomIds,
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data?.error ?? 'สร้างรอบเรียนไม่สำเร็จ');
      setLoading(false);
      return;
    }

    setLoading(false);
    onClose();
    router.refresh();
    if (data?.session?.id) {
      router.push(`/sessions/${data.session.id}`);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="สร้างรอบเรียนใหม่">
      {courses.length === 0 ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            ยังไม่มีรายวิชาในระบบ กรุณาสร้างรายวิชาก่อนจึงจะสร้างรอบเรียนได้
          </p>
          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              ปิด
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="รายวิชา" htmlFor="courseId" required>
            <Select id="courseId" required value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="" disabled>
                เลือกรายวิชา
              </option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.course_name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="ชื่อกิจกรรม/รอบเรียน" htmlFor="title" required>
            <Input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น การเรียนครั้งที่ 1"
            />
          </Field>

          <Field label="วันที่เรียน" htmlFor="learningDate" required>
            <Input
              id="learningDate"
              type="date"
              required
              value={learningDate}
              onChange={(e) => setLearningDate(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="เวลาเริ่มเรียน" htmlFor="startTime" required>
              <Input
                id="startTime"
                type="time"
                required
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
              />
            </Field>
            <Field label="เวลาเลิกเรียน" htmlFor="endTime" required>
              <Input
                id="endTime"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="เวลาที่ถือว่าสาย" htmlFor="lateAfterTime" required hint="ค่าเริ่มต้น = เวลาเริ่ม + 15 นาที">
              <Input
                id="lateAfterTime"
                type="time"
                required
                value={lateAfterTime}
                onChange={(e) => {
                  setLateTouched(true);
                  setLateAfterTime(e.target.value);
                }}
              />
            </Field>
            <Field label="ออกก่อนเกิน (นาที)" htmlFor="earlyLeaveMinutes" required hint="ก่อนเวลาเลิกเรียน">
              <Input
                id="earlyLeaveMinutes"
                type="number"
                min={0}
                required
                value={earlyLeaveMinutes}
                onChange={(e) => setEarlyLeaveMinutes(Number(e.target.value))}
              />
            </Field>
          </div>

          <div>
            <Label required>ห้องเรียนที่เปิดให้เลือก</Label>
            <div className="grid grid-cols-2 gap-2">
              {rooms.map((room) => {
                const checked = roomIds.includes(room.id);
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => toggleRoom(room.id)}
                    className={cn(
                      'flex h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-medium',
                      'transition-colors duration-150 ease-out',
                      checked
                        ? 'border-primary bg-primary text-white'
                        : 'border-border-soft bg-white text-ink hover:bg-primary-soft'
                    )}
                  >
                    {room.name}
                  </button>
                );
              })}
            </div>
          </div>

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
              สร้างรอบเรียน
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
