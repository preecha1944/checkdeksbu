'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, ClipboardPaste, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StudentFormModal } from '@/components/students/StudentFormModal';
import { BulkPasteModal } from '@/components/students/BulkPasteModal';

export function StudentsPageActions() {
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

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

      <StudentFormModal open={addOpen} onClose={() => setAddOpen(false)} student={null} />
      <BulkPasteModal open={bulkOpen} onClose={() => setBulkOpen(false)} />
    </div>
  );
}
