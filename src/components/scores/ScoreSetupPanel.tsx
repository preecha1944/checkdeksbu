'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { componentsByKind } from '@/lib/grades';
import type { Course, ScoreCategory, ScoreComponent } from '@/types/db';

export function ScoreSetupPanel({
  course,
  categories,
  components,
}: {
  course: Course;
  categories: ScoreCategory[];
  components: ScoreComponent[];
}) {
  const router = useRouter();
  const coursework = categories.find((category) => category.kind === 'coursework') ?? categories[0] ?? null;
  const [selectedId, setSelectedId] = useState(coursework?.id ?? categories[0]?.id ?? '');
  const [newName, setNewName] = useState('');
  const [newMax, setNewMax] = useState('');
  const [editing, setEditing] = useState<Record<string, { name: string; max_score: string }>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const selected = categories.find((category) => category.id === selectedId) ?? null;
  const grouped = useMemo(() => componentsByKind(categories, components), [categories, components]);
  const selectedComponents = selected ? components.filter((component) => component.category_id === selected.id) : [];
  const courseworkTotal = grouped.coursework.reduce((sum, component) => sum + Number(component.max_score), 0);
  const courseworkMax = coursework ? Number(coursework.max_score) : 50;

  async function addComponent() {
    if (!coursework) return;
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/courses/${course.id}/components`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_id: coursework.id, name: newName, max_score: Number(newMax) }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMessage(data?.error ?? 'เพิ่มงานย่อยไม่สำเร็จ');
      return;
    }
    setNewName('');
    setNewMax('');
    router.refresh();
  }

  async function saveComponent(componentId: string) {
    const item = editing[componentId];
    if (!item) return;
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/components/${componentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: item.name, max_score: Number(item.max_score) }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMessage(data?.error ?? 'บันทึกงานย่อยไม่สำเร็จ');
      return;
    }
    setEditing((current) => {
      const next = { ...current };
      delete next[componentId];
      return next;
    });
    router.refresh();
  }

  async function deleteComponent(componentId: string) {
    if (!window.confirm('ต้องการลบงานย่อยนี้ใช่หรือไม่?')) return;
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/components/${componentId}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMessage(data?.error ?? 'ลบงานย่อยไม่สำเร็จ');
      return;
    }
    router.refresh();
  }

  async function pullAttendance() {
    if (!window.confirm('คะแนน Attendance ที่แก้เองจะถูกแทนที่ด้วยคะแนนจากระบบเช็คชื่อ ต้องการดึงคะแนนต่อหรือไม่?')) return;
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/courses/${course.id}/pull-attendance`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMessage(data?.error ?? 'ดึงคะแนน Attendance ไม่สำเร็จ');
      return;
    }
    setMessage(`ดึงคะแนน Attendance แล้ว ${data.updated} คน จาก ${data.totalSessions} รอบเรียน`);
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="flex flex-col gap-3">
        <CardHeader title="หมวดคะแนน" description="คะแนนรวม 100 คะแนน" />
        {categories.map((category) => {
          const total = components
            .filter((component) => component.category_id === category.id)
            .reduce((sum, component) => sum + Number(component.max_score), 0);
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedId(category.id)}
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                selectedId === category.id ? 'border-primary bg-primary-soft' : 'border-border-soft hover:bg-neutral-soft'
              }`}
            >
              <p className="font-medium text-ink">{category.name}</p>
              <p className="mt-1 text-sm text-ink-muted">
                {category.kind === 'coursework' ? total : category.max_score} / {category.max_score} คะแนน
              </p>
            </button>
          );
        })}
      </Card>

      <Card>
        <CardHeader
          title={selected?.name ?? 'ตั้งค่าคะแนน'}
          description={course.is_locked ? 'รายวิชานี้ถูก Lock แล้ว แก้ไขไม่ได้' : undefined}
          action={
            coursework && (
              <Badge tone={courseworkTotal === courseworkMax ? 'success' : 'warning'}>
                รวม {courseworkTotal} / {courseworkMax}
              </Badge>
            )
          }
        />

        {message && <div className="mb-4 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-deep">{message}</div>}

        {selected?.kind === 'coursework' ? (
          <div className="flex flex-col gap-4">
            {selectedComponents.length === 0 ? (
              <EmptyState title="ยังไม่มีงานย่อย" description="เพิ่มงานย่อยให้ครบ 50 คะแนนก่อนกรอกคะแนน" />
            ) : (
              <div className="flex flex-col gap-2">
                {selectedComponents.map((component) => {
                  const draft = editing[component.id];
                  return (
                    <div key={component.id} className="grid grid-cols-1 gap-2 rounded-xl border border-border-soft p-3 md:grid-cols-[1fr_120px_auto]">
                      <Input
                        value={draft?.name ?? component.name}
                        disabled={course.is_locked}
                        onChange={(event) =>
                          setEditing((current) => ({
                            ...current,
                            [component.id]: { name: event.target.value, max_score: draft?.max_score ?? String(component.max_score) },
                          }))
                        }
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={draft?.max_score ?? component.max_score}
                        disabled={course.is_locked}
                        onChange={(event) =>
                          setEditing((current) => ({
                            ...current,
                            [component.id]: { name: draft?.name ?? component.name, max_score: event.target.value },
                          }))
                        }
                      />
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="secondary" disabled={!draft || course.is_locked} onClick={() => saveComponent(component.id)}>
                          <Save className="h-4 w-4" aria-hidden="true" />
                          บันทึก
                        </Button>
                        <Button type="button" size="sm" variant="danger" disabled={course.is_locked} onClick={() => deleteComponent(component.id)}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 rounded-xl border border-dashed border-border-soft p-3 md:grid-cols-[1fr_120px_auto]">
              <Input placeholder="ชื่องานย่อย" value={newName} disabled={course.is_locked} onChange={(event) => setNewName(event.target.value)} />
              <Input type="number" min="0" step="0.5" placeholder="คะแนน" value={newMax} disabled={course.is_locked} onChange={(event) => setNewMax(event.target.value)} />
              <Button type="button" disabled={course.is_locked} loading={loading} onClick={addComponent}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                เพิ่ม
              </Button>
            </div>
          </div>
        ) : selected?.kind === 'attendance' ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-muted">ดึงคะแนน Attendance จากรอบเรียนที่ปิดแล้วของรายวิชานี้ แล้วเขียนทับช่อง Attendance ของนักศึกษาทุกคน</p>
            <Button type="button" className="w-fit" disabled={course.is_locked} loading={loading} onClick={pullAttendance}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              ดึงคะแนนจากระบบเช็คชื่อ
            </Button>
          </div>
        ) : (
          <EmptyState title="กรอกคะแนนที่หน้า Score Entry" description="Midterm และ Final ใช้ช่องกรอกคะแนนในตารางคะแนน" />
        )}
      </Card>
    </div>
  );
}
