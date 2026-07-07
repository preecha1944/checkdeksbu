// TypeScript types สำหรับทุกตารางใน supabase/schema.sql
// อ้างอิงโครงสร้างจาก IMPLEMENTATION-PLAN.md §3

export type UserRole = 'admin' | 'teacher' | 'viewer';

export type StudentStatus = 'active' | 'inactive';

export type RoomStatus = 'active' | 'inactive';

export type SessionStatus = 'draft' | 'open' | 'closed' | 'cancelled';

export type AttendanceFinalStatus =
  | 'present'
  | 'late'
  | 'absent'
  | 'early_leave'
  | 'incomplete'
  | 'leave';

export type ScoreCategoryKind = 'coursework' | 'attendance' | 'midterm' | 'final';

export type SpecialStatus =
  | 'D'
  | 'F'
  | 'W'
  | 'NC'
  | 'I'
  | 'S'
  | 'U'
  | 'IP'
  | 'AC'
  | 'AF'
  | 'CE';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  student_code: string;
  full_name: string;
  class_level: string;
  phone: string | null;
  email: string | null;
  status: StudentStatus;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  status: RoomStatus;
  created_at: string;
  updated_at: string;
}

export interface ClassSession {
  id: string;
  course_id: string | null;
  title: string;
  learning_date: string; // date (YYYY-MM-DD)
  start_time: string; // time (HH:mm:ss)
  end_time: string;
  late_after_time: string;
  early_leave_minutes: number;
  status: SessionStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionRoom {
  id: string;
  session_id: string;
  room_id: string;
  capacity_override: number | null;
  note: string | null;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  room_id: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  late_minutes: number;
  duration_minutes: number | null;
  final_status: AttendanceFinalStatus | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface QrToken {
  id: string;
  session_id: string;
  token: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

export interface Course {
  id: string;
  course_code: string | null;
  course_name: string;
  teacher_id: string | null;
  academic_year: string | null;
  semester: string | null;
  is_locked: boolean;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScoreCategory {
  id: string;
  course_id: string;
  name: string;
  max_score: number;
  kind: ScoreCategoryKind;
  sort_order: number;
  created_at: string;
}

export interface ScoreComponent {
  id: string;
  course_id: string;
  category_id: string;
  name: string;
  max_score: number;
  sort_order: number;
  is_system: boolean;
  created_at: string;
}

export interface StudentScore {
  id: string;
  course_id: string;
  student_id: string;
  score_component_id: string;
  score: number | null;
  updated_at: string;
}

export interface GradeScale {
  id: string;
  course_id: string;
  grade: string;
  min_score: number;
  max_score: number;
  sort_order: number;
}

export interface FinalGrade {
  id: string;
  course_id: string;
  student_id: string;
  coursework_score: number | null;
  attendance_score: number | null;
  midterm_score: number | null;
  final_score: number | null;
  total_score: number | null;
  grade: string | null;
  special_status: SpecialStatus | null;
  remark: string | null;
  updated_at: string;
}

// โครงสร้างฐานข้อมูลสำหรับ SupabaseClient<Database>
// Insert/Update ตั้งใจให้หลวม (Partial<Row>) เพราะ validation จริงทำที่ชั้น API route ทั้งหมดอยู่แล้ว
// การกำหนด field แบบเข้มงวดต่อ table ที่นี่ไม่คุ้มกับเวลาพัฒนา ไม่ใช่จุดที่ป้องกัน bug จริง
//
// หมายเหตุสำคัญ: @supabase/postgrest-js เวอร์ชันใหม่ (select-query-parser) ต้องการให้ทุก table
// มี field `Relationships: GenericRelationship[]` เสมอ — ถ้าไม่มี แม้แต่ .select('col').maybeSingle()
// แบบไม่มี embed เลยก็จะ infer type เป็น never (ไม่ใช่แค่ตอน embed join เท่านั้น)
// ตั้งใจใส่เป็น [] (ไม่ระบุ FK จริง) แทนการระบุ FK ครบทุกตาราง เพราะทดลองแล้วพบว่า tuple ของ
// relationship ที่ซับซ้อน (หลาย FK ต่อ table) ทำให้ TS infer พัง .insert() กลายเป็น never ไปด้วย —
// [] ก็เพียงพอแก้ปัญหา select แบบไม่ embed แล้ว ส่วน query ที่ embed join (เช่น .select('*, rooms(...)'))
// ให้ใช้ .returns<T>() ระบุ shape เอง (มีใช้อยู่แล้วหลายจุดในโค้ด)
type Writable<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };

export interface Database {
  public: {
    Tables: {
      profiles: Writable<Profile>;
      students: Writable<Student>;
      rooms: Writable<Room>;
      class_sessions: Writable<ClassSession>;
      session_rooms: Writable<SessionRoom>;
      attendance_records: Writable<AttendanceRecord>;
      qr_tokens: Writable<QrToken>;
      courses: Writable<Course>;
      score_categories: Writable<ScoreCategory>;
      score_components: Writable<ScoreComponent>;
      student_scores: Writable<StudentScore>;
      grade_scales: Writable<GradeScale>;
      final_grades: Writable<FinalGrade>;
    };
  };
}
