-- ========== EXTENSION ==========
create extension if not exists "pgcrypto";

-- ========== PROFILES (Admin/Teacher/Viewer) ==========
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'teacher' check (role in ('admin','teacher','viewer')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- trigger: สร้าง profile อัตโนมัติเมื่อมี user ใหม่ / คนแรก = admin
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    case when (select count(*) from profiles) = 0 then 'admin' else 'teacher' end
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ========== STUDENTS ==========
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  student_code text unique not null,
  full_name text not null,
  phone text,
  email text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_students_code on students(student_code);

-- ========== ROOMS ==========
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  capacity int default 40,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ========== CLASS SESSIONS (รอบเรียน) ==========
create table if not exists class_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid,                    -- ผูกกับรายวิชา (เพิ่ม FK หลัง courses ถูกสร้าง — ท้าย section courses)
  title text not null,
  learning_date date not null,
  start_time time not null,
  end_time time not null,
  late_after_time time not null,
  early_leave_minutes int not null default 30,  -- ออกก่อนเลิกเรียนเกิน n นาที = early_leave (ตั้งต่อรอบได้)
  status text not null default 'draft' check (status in ('draft','open','closed','cancelled')),
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_sessions_status on class_sessions(status);
create index if not exists idx_sessions_date on class_sessions(learning_date);

-- ========== SESSION ROOMS ==========
create table if not exists session_rooms (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references class_sessions(id) on delete cascade,
  room_id uuid not null references rooms(id),
  capacity_override int,
  note text,
  created_at timestamptz default now(),
  unique(session_id, room_id)
);

-- ========== ATTENDANCE RECORDS ==========
create table if not exists attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references class_sessions(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  room_id uuid references rooms(id),
  check_in_time timestamptz,
  check_out_time timestamptz,
  late_minutes int default 0,
  duration_minutes int,
  final_status text check (final_status in ('present','late','absent','early_leave','incomplete','leave')),
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(session_id, student_id)          -- กติกา 1 คน 1 รอบ เช็คได้ครั้งเดียว
);
create index if not exists idx_att_session on attendance_records(session_id);
create index if not exists idx_att_student on attendance_records(student_id);

-- ========== QR TOKENS (Dynamic QR หมุนทุก 3 นาที) ==========
create table if not exists qr_tokens (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references class_sessions(id) on delete cascade,
  token text unique not null,
  expires_at timestamptz not null,
  is_active boolean default true,
  created_at timestamptz default now()
);
create index if not exists idx_qr_token on qr_tokens(token);

-- ========== COURSES (รายวิชา) ==========
create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  course_code text,
  course_name text not null,
  teacher_id uuid references profiles(id),
  academic_year text,
  semester text,
  is_locked boolean default false,
  locked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ผูก class_sessions.course_id → courses(id) (เพิ่มหลัง courses ถูกสร้าง, guard กันรันซ้ำ error)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'fk_sessions_course') then
    alter table class_sessions
      add constraint fk_sessions_course foreign key (course_id) references courses(id) on delete set null;
  end if;
end $$;
create index if not exists idx_sessions_course on class_sessions(course_id);

-- ========== SCORE CATEGORIES (4 หมวดหลัก) ==========
create table if not exists score_categories (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  name text not null,
  max_score numeric not null,
  kind text not null default 'coursework' check (kind in ('coursework','attendance','midterm','final')),
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ========== SCORE COMPONENTS (งานย่อย) ==========
create table if not exists score_components (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  category_id uuid not null references score_categories(id) on delete cascade,
  name text not null,
  max_score numeric not null check (max_score > 0),
  sort_order int default 0,
  is_system boolean default false,   -- true = สร้างอัตโนมัติ (Attendance/Midterm/Final) ห้ามลบ
  created_at timestamptz default now()
);

-- ========== STUDENT SCORES ==========
create table if not exists student_scores (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  score_component_id uuid not null references score_components(id) on delete cascade,
  score numeric check (score >= 0),
  updated_at timestamptz default now(),
  unique(course_id, student_id, score_component_id)
);

-- ========== GRADE SCALES ==========
create table if not exists grade_scales (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  grade text not null,
  min_score numeric not null,
  max_score numeric not null,
  sort_order int default 0
);

-- ========== FINAL GRADES ==========
create table if not exists final_grades (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  coursework_score numeric,
  attendance_score numeric,
  midterm_score numeric,
  final_score numeric,
  total_score numeric,
  grade text,
  special_status text,   -- D,F,W,NC,I,S,U,IP,AC,CE หรือ null
  remark text,
  updated_at timestamptz default now(),
  unique(course_id, student_id)
);

-- ========== SEED ==========
insert into rooms (name, capacity)
select 'ห้อง 1', 40 where not exists (select 1 from rooms where name = 'ห้อง 1');
insert into rooms (name, capacity)
select 'ห้อง 2', 40 where not exists (select 1 from rooms where name = 'ห้อง 2');

-- ========== RLS ==========
-- เปิด RLS ทุกตาราง แต่ไม่สร้าง policy → client (anon key) อ่าน/เขียนตรงไม่ได้เลย
-- ทุกอย่างผ่าน API server (service role ข้าม RLS) เท่านั้น ยกเว้น profiles อ่านของตัวเองได้
alter table profiles enable row level security;
alter table students enable row level security;
alter table rooms enable row level security;
alter table class_sessions enable row level security;
alter table session_rooms enable row level security;
alter table attendance_records enable row level security;
alter table qr_tokens enable row level security;
alter table courses enable row level security;
alter table score_categories enable row level security;
alter table score_components enable row level security;
alter table student_scores enable row level security;
alter table grade_scales enable row level security;
alter table final_grades enable row level security;

drop policy if exists "read own profile" on profiles;
create policy "read own profile" on profiles for select using (auth.uid() = id);
