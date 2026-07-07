'use client';

import { useState } from 'react';
import { Download, FileBarChart, GraduationCap, Users } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { formatThaiDateOnly } from '@/lib/time';

export interface ReportSessionOption {
  id: string;
  title: string;
  learning_date: string;
}

export interface ReportCourseOption {
  id: string;
  course_code: string | null;
  course_name: string;
}

export function ReportsExportCards({
  sessions,
  courses,
}: {
  sessions: ReportSessionOption[];
  courses: ReportCourseOption[];
}) {
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? '');
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');

  function download(path: string) {
    window.location.href = path;
  }

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="flex flex-col gap-4">
        <CardHeader title="รายชื่อนักศึกษา" description="ส่งออกรหัส ชื่อ เบอร์ อีเมล และสถานะ" />
        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Users className="h-5 w-5" aria-hidden="true" />
          </div>
          <Button type="button" variant="secondary" onClick={() => download('/api/export/students')}>
            <Download className="h-4 w-4" aria-hidden="true" />
            ดาวน์โหลด
          </Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <CardHeader title="รายงานรอบเรียน" description="เลือกหนึ่งรอบเรียนเพื่อส่งออกข้อมูลเช็คชื่อ" />
        <Select value={sessionId} onChange={(event) => setSessionId(event.target.value)} disabled={sessions.length === 0}>
          {sessions.length === 0 ? (
            <option value="">ยังไม่มีรอบเรียน</option>
          ) : (
            sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.title} - {formatThaiDateOnly(session.learning_date)}
              </option>
            ))
          )}
        </Select>
        <div className="mt-auto flex justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={!sessionId}
            onClick={() => download(`/api/export/sessions/${sessionId}`)}
          >
            <FileBarChart className="h-4 w-4" aria-hidden="true" />
            ดาวน์โหลด
          </Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <CardHeader title="คะแนนและเกรดรายวิชา" description="เลือกวิชาเพื่อส่งออกคะแนนและผลการตัดเกรด" />
        <Select value={courseId} onChange={(event) => setCourseId(event.target.value)} disabled={courses.length === 0}>
          {courses.length === 0 ? (
            <option value="">ยังไม่มีรายวิชา</option>
          ) : (
            courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.course_code ? `${course.course_code} - ` : ''}
                {course.course_name}
              </option>
            ))
          )}
        </Select>
        <div className="mt-auto flex justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={!courseId}
            onClick={() => download(`/api/export/courses/${courseId}`)}
          >
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            ดาวน์โหลด
          </Button>
        </div>
      </Card>
    </div>
  );
}
