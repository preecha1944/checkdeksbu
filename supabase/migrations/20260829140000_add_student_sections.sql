-- รายการ Section ของนักศึกษา — แทนค่าตายตัวเดิมใน src/lib/student-input.ts
-- ระวัง: ตาราง rooms ที่มีแถวชื่อ 'Section 6'/'Section 7' คือห้องเรียนสำหรับเช็คชื่อ คนละเรื่องกับตารางนี้
create table if not exists student_sections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

-- กันชื่อซ้ำโดยไม่สนตัวพิมพ์เล็ก/ใหญ่ ('section a' ชนกับ 'Section A')
create unique index if not exists idx_student_sections_name_lower
  on student_sections (lower(name));

create index if not exists idx_student_sections_sort on student_sections(sort_order, name);

-- เดิม default เป็น 'Section 6' — ถ้าปล่อยไว้ แถวที่ไม่ระบุ section จะตกไปอยู่ชื่อที่อาจไม่มีในรายการ
alter table students alter column class_level drop default;

alter table student_sections enable row level security;

-- เปลี่ยนชื่อ section + ไล่อัปเดต students.class_level ให้อยู่ใน transaction เดียว
-- (supabase-js ยิงทีละ statement จึงต้องยกมาไว้ฝั่ง DB ไม่งั้นพังกลางทางแล้วข้อมูลค้างครึ่ง ๆ)
create or replace function rename_student_section(p_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_name text;
begin
  select name into v_old_name from student_sections where id = p_id for update;
  if v_old_name is null then
    raise exception 'section_not_found';
  end if;

  if exists (
    select 1 from student_sections where lower(name) = lower(p_name) and id <> p_id
  ) then
    raise exception 'duplicate_section';
  end if;

  update student_sections set name = p_name where id = p_id;
  update students set class_level = p_name, updated_at = now() where class_level = v_old_name;
end;
$$;
