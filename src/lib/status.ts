import type { AttendanceFinalStatus } from '@/types/db';

export type BadgeTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'orange'
  | 'primary'
  | 'info'
  | 'neutral';

export interface StatusMeta {
  label: string;
  tone: BadgeTone;
}

// สีสถานะการเข้าเรียน — อ้างอิง IMPLEMENTATION-PLAN.md §4.3 (ต้องใช้ตรงกันทุกหน้า)
export const ATTENDANCE_STATUS_MAP: Record<AttendanceFinalStatus, StatusMeta> = {
  present: { label: 'มาเรียน', tone: 'success' },
  late: { label: 'มาสาย', tone: 'warning' },
  absent: { label: 'ขาดเรียน', tone: 'danger' },
  early_leave: { label: 'ออกก่อนเวลา', tone: 'orange' },
  incomplete: { label: 'เช็คชื่อไม่สมบูรณ์', tone: 'primary' },
  leave: { label: 'ลา', tone: 'info' },
};

// สถานะเสริมระหว่าง flow เช็คชื่อ (ยังไม่ใช่ final_status)
export const CHECK_STAGE_MAP = {
  'checked-in': { label: 'Check-in แล้ว', tone: 'success' as BadgeTone },
  'checked-out': { label: 'Check-out แล้ว', tone: 'info' as BadgeTone },
};

export function attendanceStatusLabel(status: AttendanceFinalStatus | null | undefined): string {
  if (!status) return '-';
  return ATTENDANCE_STATUS_MAP[status]?.label ?? status;
}

export function attendanceStatusTone(status: AttendanceFinalStatus | null | undefined): BadgeTone {
  if (!status) return 'neutral';
  return ATTENDANCE_STATUS_MAP[status]?.tone ?? 'neutral';
}

// map สถานะรอบเรียน (session) → Thai label + tone (ใช้ในหน้า /sessions)
export const SESSION_STATUS_MAP: Record<string, StatusMeta> = {
  draft: { label: 'ร่าง', tone: 'neutral' },
  open: { label: 'เปิดเช็คชื่อ', tone: 'success' },
  closed: { label: 'ปิดแล้ว', tone: 'primary' },
  cancelled: { label: 'ยกเลิก', tone: 'danger' },
};

// map สถานะนักศึกษา (students.status)
export const STUDENT_STATUS_MAP: Record<string, StatusMeta> = {
  active: { label: 'ใช้งาน', tone: 'success' },
  inactive: { label: 'พ้นสภาพ', tone: 'neutral' },
};
