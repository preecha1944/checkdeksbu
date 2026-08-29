// ค่า default ของระบบ — อ้างอิง IMPLEMENTATION-PLAN.md §3
// โครงคะแนน/เกณฑ์เกรดยึดตามไฟล์ คิดเกรด_MEd_Section6-7.xlsx (ชีต "เกณฑ์เกรด")

import type { ScoreCategoryKind } from '@/types/db';

export const DEFAULT_CATEGORIES = [
  { name: 'Case Study Analysis, Group, Individual and Term Paper', max_score: 50, kind: 'coursework', sort_order: 1 },
  { name: 'Group Participation and Attendance', max_score: 10, kind: 'attendance', sort_order: 2 },
  { name: 'Midterm Examination', max_score: 10, kind: 'midterm', sort_order: 3 },
  { name: 'Final Examination', max_score: 30, kind: 'final', sort_order: 4 },
] as const;

// ช่องกรอกคะแนนที่ seed ให้แต่ละหมวดตอนสร้างรายวิชา — โครงเดียวกับ Excel ต้นฉบับ รวม 13 ช่อง
//   coursework : A1-A8 ข้อละ 10 (ดิบ 80) → เทียบสัดส่วนเป็น 50
//                (ไฟล์ Excel ต้นฉบับมี A1-A7 ดิบ 70 — เพิ่มมาอีก 1 กิจกรรมตามที่ผู้ใช้ขอ
//                 โลจิคคิดคะแนนไม่เปลี่ยน เพราะเทียบสัดส่วนกลับเป็น 50 เท่าเดิม)
//   attendance : ช่องเดียวเต็ม 10 (ดึงอัตโนมัติจากระบบเช็คชื่อได้)
//   midterm    : กรอกคะแนนดิบเต็ม 30 → เทียบสัดส่วนเป็น 10
//   final      : 3 ข้อ 10/5/15 รวมดิบ 30 = เพดานหมวดพอดี จึงไม่ถูกย่อ
// is_system = true → ห้ามแก้/ลบผ่าน API (กันโครงข้อสอบเพี้ยน) ส่วน A1-A8 ปล่อยให้อาจารย์เพิ่ม/ลบ/แก้คะแนนเต็มได้อิสระ
export const DEFAULT_COMPONENTS: Record<ScoreCategoryKind, { name: string; max_score: number; is_system: boolean }[]> = {
  coursework: Array.from({ length: 8 }, (_, i) => ({ name: `A${i + 1}`, max_score: 10, is_system: false })),
  attendance: [{ name: 'Group Participation and Attendance', max_score: 10, is_system: true }],
  midterm: [{ name: 'Midterm (คะแนนดิบ เต็ม 30)', max_score: 30, is_system: true }],
  final: [
    { name: 'Final ข้อที่ 1', max_score: 10, is_system: true },
    { name: 'Final ข้อที่ 2', max_score: 5, is_system: true },
    { name: 'Final ข้อที่ 3', max_score: 15, is_system: true },
  ],
};

export const DEFAULT_GRADE_SCALE = [
  { grade: 'A', min_score: 85, max_score: 100, grade_point: 4, sort_order: 1 },
  { grade: 'B+', min_score: 75, max_score: 84.99, grade_point: 3.5, sort_order: 2 },
  { grade: 'B', min_score: 65, max_score: 74.99, grade_point: 3, sort_order: 3 },
  { grade: 'C+', min_score: 50, max_score: 64.99, grade_point: 2.5, sort_order: 4 },
  { grade: 'C', min_score: 0, max_score: 49.99, grade_point: 2, sort_order: 5 },
];

export const SPECIAL_STATUSES = ['D', 'F', 'W', 'NC', 'I', 'S', 'U', 'IP', 'AC', 'AF', 'CE'] as const;

// เกรดที่ระบบคำนวณเองเมื่อคะแนนยังไม่ครบ (ตรงกับสูตร IF(...<12,"I",...) ในไฟล์ Excel)
export const GRADE_INCOMPLETE = 'I';
export const GRADE_NOT_ENTERED = '-';

export const QR_ROTATE_SECONDS = 180; // QR เปลี่ยนทุก 3 นาที (requirement จากผู้ใช้)
export const QR_GRACE_SECONDS = 30; // ผ่อนผันสแกนตอน QR กำลังเปลี่ยน
export const EARLY_LEAVE_MINUTES = 30; // ค่า default เท่านั้น — ค่าจริงอ่านจาก class_sessions.early_leave_minutes ต่อรอบ (ใช้ค่านี้เป็น default ตอนสร้างรอบ)
export const TZ_OFFSET = '+07:00'; // Asia/Bangkok
