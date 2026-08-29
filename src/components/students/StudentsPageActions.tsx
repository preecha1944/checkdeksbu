'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, ClipboardPaste, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StudentFormModal } from '@/components/students/StudentFormModal';
import { BulkPasteModal } from '@/components/students/BulkPasteModal';

export function StudentsPageActions({ sections }: { sections: string[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  // class_level เป็น not null — ถ้ายังไม่มี section ทั้งสองปุ่มจะพังที่ฝั่ง server อยู่ดี บอกไว้ก่อนดีกว่า
  if (sections.length === 0) {
    return (
      <div className="flex items-center gap-3">
        <p className="text-sm text-ink-muted">ยังไม่มี Section — เพิ่มที่หน้า Settings ก่อนจึงจะเพิ่มนักศึกษาได้</p>
        <Link href="/settings">
          <Button variant="secondary">ไปที่ Settings</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <Link href="/api/export/students">
        <Button variant="secondary">
          <Download className="h-4 w-4" aria-hidden="true" />
          Export Excel
        </Button>
      </Link>
      <Button variant="secondary" onClick={() => setBulkOpen(true)}>
        <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
        วางรายชื่อ
      </Button>
      <Button onClick={() => setAddOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        เพิ่มนักศึกษา
      </Button>

      <StudentFormModal open={addOpen} onClose={() => setAddOpen(false)} student={null} sections={sections} />
      <BulkPasteModal open={bulkOpen} onClose={() => setBulkOpen(false)} sections={sections} />
    </div>
  );
}
