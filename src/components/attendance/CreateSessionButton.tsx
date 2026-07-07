'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SessionForm, SessionFormCourse, SessionFormRoom } from '@/components/attendance/SessionForm';

export interface CreateSessionButtonProps {
  courses: SessionFormCourse[];
  rooms: SessionFormRoom[];
}

export function CreateSessionButton({ courses, rooms }: CreateSessionButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        สร้างรอบเรียน
      </Button>
      <SessionForm open={open} onClose={() => setOpen(false)} courses={courses} rooms={rooms} />
    </>
  );
}
