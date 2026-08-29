'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from '@/components/ui/Table';
import type { StudentSection } from '@/types/db';

export interface SectionWithCount extends StudentSection {
  student_count: number;
}

export function SectionManager({ sections, isViewer }: { sections: SectionWithCount[]; isViewer: boolean }) {
  const router = useRouter();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(url: string, method: string, body?: unknown) {
    setError(null);
    setLoading(true);
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? 'ทำรายการไม่สำเร็จ');
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    if (await send('/api/sections', 'POST', { name: newName })) setNewName('');
  }

  async function handleRename(id: string) {
    if (!editingName.trim()) return;
    if (await send(`/api/sections/${id}`, 'PATCH', { name: editingName })) setEditingId(null);
  }

  return (
    <Card>
      <CardHeader
        title="Section ของนักศึกษา"
        description="เพิ่ม เปลี่ยนชื่อ หรือลบ Section ที่ใช้จัดกลุ่มนักศึกษา"
      />

      {!isViewer && (
        <div className="mb-4 flex gap-3">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleAdd();
              }
            }}
            placeholder="ชื่อ Section เช่น Section 6"
          />
          <Button onClick={handleAdd} loading={loading} disabled={!newName.trim()}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            เพิ่ม
          </Button>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </div>
      )}

      {sections.length === 0 ? (
        <EmptyState
          title="ยังไม่มี Section"
          description="เพิ่ม Section อย่างน้อย 1 อันก่อน จึงจะเพิ่มนักศึกษาเข้าระบบได้"
        />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableTh>ชื่อ Section</TableTh>
              <TableTh>จำนวนนักศึกษา</TableTh>
              <TableTh>จัดการ</TableTh>
            </tr>
          </TableHead>
          <TableBody>
            {sections.map((section) => (
              <TableRow key={section.id}>
                <TableTd className="font-medium">
                  {editingId === section.id ? (
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleRename(section.id);
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    section.name
                  )}
                </TableTd>
                <TableTd>{section.student_count}</TableTd>
                <TableTd>
                  {isViewer ? (
                    <span className="text-sm text-ink-muted">—</span>
                  ) : editingId === section.id ? (
                    <div className="flex gap-2">
                      <Button onClick={() => handleRename(section.id)} loading={loading}>
                        บันทึก
                      </Button>
                      <Button variant="secondary" onClick={() => setEditingId(null)}>
                        ยกเลิก
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setEditingId(section.id);
                          setEditingName(section.name);
                          setError(null);
                        }}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        เปลี่ยนชื่อ
                      </Button>
                      <Button variant="secondary" onClick={() => send(`/api/sections/${section.id}`, 'DELETE')}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        ลบ
                      </Button>
                    </div>
                  )}
                </TableTd>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
