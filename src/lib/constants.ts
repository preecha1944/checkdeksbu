// ค่า default ของระบบ — อ้างอิง IMPLEMENTATION-PLAN.md §3

export const DEFAULT_CATEGORIES = [
  { name: 'Case Study Analysis, Group, Individual and Term Paper', max_score: 50, kind: 'coursework', sort_order: 1 },
  { name: 'Group Participation and Attendance', max_score: 10, kind: 'attendance', sort_order: 2 },
  { name: 'Midterm Examination', max_score: 20, kind: 'midterm', sort_order: 3 },
  { name: 'Final Examination', max_score: 20, kind: 'final', sort_order: 4 },
] as const;

// หมวด attendance/midterm/final แต่ละหมวดสร้าง component ระบบ 1 ตัวอัตโนมัติ (is_system=true)
// ชื่อเดียวกับหมวด, max_score เท่าหมวด → ทำให้ทุกคะแนนเก็บใน student_scores แบบเดียวกันหมด

export const DEFAULT_GRADE_SCALE = [
  { grade: 'A', min_score: 85, max_score: 100, sort_order: 1 },
  { grade: 'B+', min_score: 75, max_score: 84.99, sort_order: 2 },
  { grade: 'B', min_score: 65, max_score: 74.99, sort_order: 3 },
  { grade: 'C+', min_score: 50, max_score: 64.99, sort_order: 4 },
  { grade: 'C', min_score: 0, max_score: 49.99, sort_order: 5 },
];

export const SPECIAL_STATUSES = ['D', 'F', 'W', 'NC', 'I', 'S', 'U', 'IP', 'AC', 'AF', 'CE'] as const;

export const QR_ROTATE_SECONDS = 180; // QR เปลี่ยนทุก 3 นาที (requirement จากผู้ใช้)
export const QR_GRACE_SECONDS = 30; // ผ่อนผันสแกนตอน QR กำลังเปลี่ยน
export const EARLY_LEAVE_MINUTES = 30; // ออกก่อนเวลาเลิกเรียนเกิน 30 นาที = early_leave
export const TZ_OFFSET = '+07:00'; // Asia/Bangkok
