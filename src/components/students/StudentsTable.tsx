'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Pencil, Trash2, ChartColumn, Users } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { StudentFormModal } from '@/components/students/StudentFormModal';
import { STUDENT_STATUS_MAP } from '@/lib/status';
import type { Student } from '@/types/db';

export interface StudentsTableProps {
  students: Student[];
  isViewer: boolean;
}

export function StudentsTable({ students, isViewer }: StudentsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Student | null | 'new'>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.student_code.toLowerCase().includes(q) || s.full_name.toLowerCase().includes(q)
    );
  }, [students, search]);

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/students/${deleting.id}`, { method: 'DELETE' });
    setDeleteLoading(false);
    if (res.ok) {
      setDeleting(null);
      router.refresh();
    }
  }

  return (
    <div>
      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหารหัสหรือชื่อ..."
            className="pl-10"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={students.length === 0 ? 'ยังไม่มีนักศึกษา' : 'ไม่พบนักศึกษาที่ค้นหา'}
          description={students.length === 0 ? 'เพิ่มนักศึกษาคนแรกหรือวางรายชื่อจากคลิปบอร์ด' : undefined}
        />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableTh>รหัส</TableTh>
              <TableTh>ชื่อ-สกุล</TableTh>
              <TableTh>เบอร์โทร</TableTh>
              <TableTh>อีเมล</TableTh>
              <TableTh>สถานะ</TableTh>
              <TableTh>จัดการ</TableTh>
            </tr>
          </TableHead>
          <TableBody>
            {filtered.map((s) => {
              const statusMeta = STUDENT_STATUS_MAP[s.status] ?? { label: s.status, tone: 'neutral' as const };
              return (
                <TableRow key={s.id}>
                  <TableTd className="font-medium">{s.student_code}</TableTd>
                  <TableTd>{s.full_name}</TableTd>
                  <TableTd>{s.phone || '-'}</TableTd>
                  <TableTd>{s.email || '-'}</TableTd>
                  <TableTd>
                    <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                  </TableTd>
                  <TableTd>
                    <div className="flex gap-1">
                      <Link
                        href={`/students/${s.id}`}
                        aria-label={`ดูสถิติของ ${s.full_name}`}
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-primary-soft hover:text-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <ChartColumn className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      {!isViewer && (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditing(s)}
                            aria-label={`แก้ไข ${s.full_name}`}
                            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-primary-soft hover:text-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(s)}
                            aria-label={`ลบ ${s.full_name}`}
                            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>
                  </TableTd>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <StudentFormModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        student={editing === 'new' ? null : editing}
      />

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="ยืนยันการลบนักศึกษา">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            ต้องการลบ <span className="font-medium text-ink">{deleting?.full_name}</span> ({deleting?.student_code}
            ) ใช่หรือไม่? ประวัติเช็คชื่อและคะแนนของนักศึกษาคนนี้จะถูกลบไปด้วย และไม่สามารถย้อนกลับได้
          </p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setDeleting(null)}>
              ยกเลิก
            </Button>
            <Button type="button" variant="danger" loading={deleteLoading} onClick={handleDelete}>
              ยืนยันลบ
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
