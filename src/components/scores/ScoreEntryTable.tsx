'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { calculateTotalsForStudent } from '@/lib/grades';
import { DEFAULT_STUDENT_CLASS_LEVEL, STUDENT_CLASS_LEVELS } from '@/lib/student-input';
import type { Course, GradeScale, ScoreCategory, ScoreComponent, Student, StudentScore } from '@/types/db';

function keyOf(studentId: string, componentId: string) {
  return `${studentId}:${componentId}`;
}

export function ScoreEntryTable({
  course,
  students,
  categories,
  components,
  scores,
  scales,
}: {
  course: Course;
  students: Student[];
  categories: ScoreCategory[];
  components: ScoreComponent[];
  scores: StudentScore[];
  scales: GradeScale[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const score of scores) {
      initial[keyOf(score.student_id, score.score_component_id)] = score.score === null ? '' : String(score.score);
    }
    return initial;
  });
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState('all');

  const orderedComponents = useMemo(() => {
    const categoryOrder = new Map(categories.map((category) => [category.id, category.sort_order]));
    return components.slice().sort((a, b) => {
      const order = (categoryOrder.get(a.category_id) ?? 0) - (categoryOrder.get(b.category_id) ?? 0);
      return order || a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at);
    });
  }, [categories, components]);

  const filteredStudents = useMemo(
    () =>
      students.filter((student) => classFilter === 'all' || (student.class_level ?? DEFAULT_STUDENT_CLASS_LEVEL) === classFilter),
    [students, classFilter]
  );

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  function scoreRowsForStudent(studentId: string): StudentScore[] {
    return orderedComponents.map((component) => {
      const raw = values[keyOf(studentId, component.id)] ?? '';
      const score = raw === '' ? null : Number(raw);
      return {
        id: keyOf(studentId, component.id),
        course_id: course.id,
        student_id: studentId,
        score_component_id: component.id,
        score: Number.isFinite(score) ? score : null,
        updated_at: new Date().toISOString(),
      };
    });
  }

  function isInvalid(studentId: string, component: ScoreComponent) {
    const raw = values[keyOf(studentId, component.id)] ?? '';
    if (raw === '') return false;
    const value = Number(raw);
    return !Number.isFinite(value) || value < 0 || value > Number(component.max_score);
  }

  async function saveScores() {
    const payload = [];
    for (const student of filteredStudents) {
      for (const component of orderedComponents) {
        if (isInvalid(student.id, component)) {
          setMessage(`คะแนน ${component.name} ต้องอยู่ระหว่าง 0 ถึง ${component.max_score}`);
          return;
        }
        const raw = values[keyOf(student.id, component.id)] ?? '';
        payload.push({
          studentId: student.id,
          componentId: component.id,
          score: raw === '' ? null : Number(raw),
        });
      }
    }

    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/courses/${course.id}/scores`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores: payload }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMessage(data?.error ?? 'บันทึกคะแนนไม่สำเร็จ');
      return;
    }
    setDirty(false);
    setMessage(`บันทึกแล้ว ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`);
    router.refresh();
  }

  async function pullAttendance() {
    if (!window.confirm('คะแนน Attendance ที่แก้เองจะถูกแทนที่ ต้องการดึงคะแนนต่อหรือไม่?')) return;
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/courses/${course.id}/pull-attendance`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMessage(data?.error ?? 'ดึงคะแนน Attendance ไม่สำเร็จ');
      return;
    }
    setDirty(false);
    setMessage(`ดึงคะแนน Attendance แล้ว ${data.updated} คน`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        title="Score Entry"
        description={course.is_locked ? 'รายวิชานี้ถูก Lock แล้ว แก้ไขคะแนนไม่ได้' : 'กรอกคะแนนแล้วกดบันทึก คะแนนรวมและเกรดคำนวณสด'}
        action={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={course.is_locked} loading={loading} onClick={pullAttendance}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              ดึง Attendance
            </Button>
            <Button type="button" disabled={course.is_locked || !dirty} loading={loading} onClick={saveScores}>
              <Save className="h-4 w-4" aria-hidden="true" />
              บันทึกคะแนน
            </Button>
          </div>
        }
      />

      <div className="mb-4 max-w-48">
        <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="all">ทุกชั้นเรียน</option>
          {STUDENT_CLASS_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </Select>
      </div>

      {message && <div className="mb-4 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-deep">{message}</div>}

      {filteredStudents.length === 0 ? (
        <EmptyState title="ยังไม่มีนักศึกษา" description="เพิ่มนักศึกษา active ก่อนเริ่มกรอกคะแนน หรือเลือกชั้นเรียนอื่น" />
      ) : orderedComponents.length === 0 ? (
        <EmptyState title="ยังไม่มีช่องคะแนน" description="สร้างรายวิชาใหม่หรือไปตั้งค่างานย่อยก่อน" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-soft">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-neutral-soft text-xs uppercase text-ink-muted">
              <tr>
                <th className="sticky left-0 z-10 bg-neutral-soft px-3 py-3 text-left font-medium">รหัส</th>
                <th className="sticky left-[96px] z-10 bg-neutral-soft px-3 py-3 text-left font-medium">ชื่อ-สกุล</th>
                <th className="min-w-24 px-3 py-3 text-left font-medium">ชั้นเรียน</th>
                {orderedComponents.map((component) => (
                  <th key={component.id} className="min-w-32 px-3 py-3 text-right font-medium">
                    {component.name} /{component.max_score}
                  </th>
                ))}
                <th className="sticky right-20 z-10 bg-neutral-soft px-3 py-3 text-right font-medium">Total</th>
                <th className="sticky right-0 z-10 bg-neutral-soft px-3 py-3 text-center font-medium">Grade</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const totals = calculateTotalsForStudent({
                  studentId: student.id,
                  categories,
                  components: orderedComponents,
                  scores: scoreRowsForStudent(student.id),
                  scales,
                });
                return (
                  <tr key={student.id} className="border-b border-border-soft last:border-0 hover:bg-primary-soft/30">
                    <td className="sticky left-0 z-10 bg-card px-3 py-2 font-medium text-ink">{student.student_code}</td>
                    <td className="sticky left-[96px] z-10 min-w-56 bg-card px-3 py-2 text-ink">{student.full_name}</td>
                    <td className="px-3 py-2">
                      <Badge tone="primary">{student.class_level ?? DEFAULT_STUDENT_CLASS_LEVEL}</Badge>
                    </td>
                    {orderedComponents.map((component) => {
                      const key = keyOf(student.id, component.id);
                      const invalid = isInvalid(student.id, component);
                      return (
                        <td key={component.id} className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            max={component.max_score}
                            step="0.5"
                            disabled={course.is_locked}
                            title={invalid ? `คะแนนเต็ม ${component.max_score}` : undefined}
                            value={values[key] ?? ''}
                            onChange={(event) => {
                              setValues((current) => ({ ...current, [key]: event.target.value }));
                              setDirty(true);
                            }}
                            className={`h-9 w-24 rounded-lg border bg-white px-2 text-right text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                              invalid ? 'border-danger' : 'border-border-soft'
                            }`}
                          />
                        </td>
                      );
                    })}
                    <td className="sticky right-20 z-10 bg-card px-3 py-2 text-right font-semibold text-ink">{totals.total}</td>
                    <td className="sticky right-0 z-10 bg-card px-3 py-2 text-center">
                      <Badge tone={totals.grade === '-' ? 'neutral' : 'primary'}>{totals.grade}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
