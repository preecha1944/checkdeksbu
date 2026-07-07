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
  title: string;
  learning_date: string; // date (YYYY-MM-DD)
  start_time: string; // time (HH:mm:ss)
  end_time: string;
  late_after_time: string;
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

// โครงสร้างฐานข้อมูลรวม (สำหรับใช้กับ SupabaseClient<Database> ในอนาคตถ้าต้องการ)
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile };
      students: { Row: Student };
      rooms: { Row: Room };
      class_sessions: { Row: ClassSession };
      session_rooms: { Row: SessionRoom };
      attendance_records: { Row: AttendanceRecord };
      qr_tokens: { Row: QrToken };
      courses: { Row: Course };
      score_categories: { Row: ScoreCategory };
      score_components: { Row: ScoreComponent };
      student_scores: { Row: StudentScore };
      grade_scales: { Row: GradeScale };
      final_grades: { Row: FinalGrade };
    };
  };
}
