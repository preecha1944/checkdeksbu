-- ให้ rooms มีชื่อชุดเดียวกับ student_sections เสมอ
--
-- เดิมสองตารางนี้แยกกัน: หน้า Settings แก้ได้เฉพาะ student_sections ส่วน rooms มีแต่แถว seed
-- 'Section 6'/'Section 7' และไม่มี API เขียนเลย ผลคือ section ที่สร้างใหม่ไม่โผล่ในฟอร์มสร้างรอบเรียน
-- (อ่านจาก rooms) และ autoRoom ตอน check-in จับคู่ rooms.name = students.class_level ไม่เจอ
--
-- หมายเหตุ: rooms ไม่มี unique index บน name (ต่างจาก student_sections) การ match ด้วย lower(name)
-- ด้านล่างจึงอาจโดนหลายแถวถ้ามีชื่อซ้ำ — ข้อมูลจริงมาจาก seed อย่างเดียวจึงไม่เกิดในทางปฏิบัติ

-- ========== เพิ่ม section: สร้างห้องคู่กันใน transaction เดียว ==========
create or replace function create_student_section(p_name text)
returns student_sections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_section student_sections;
  v_sort int;
begin
  if exists (select 1 from student_sections where lower(name) = lower(p_name)) then
    raise exception 'duplicate_section';
  end if;

  select coalesce(max(sort_order), 0) + 1 into v_sort from student_sections;
  insert into student_sections (name, sort_order) values (p_name, v_sort) returning * into v_section;

  -- เคยมีห้องชื่อนี้ (ลบ section ไปแล้วสร้างใหม่) → เปิดใช้ห้องเดิม เพื่อให้ประวัติเช็คชื่อเก่าไม่ขาดตอน
  if exists (select 1 from rooms where lower(name) = lower(p_name)) then
    update rooms set name = p_name, status = 'active', updated_at = now()
    where lower(name) = lower(p_name);
  else
    insert into rooms (name) values (p_name);
  end if;

  return v_section;
end;
$$;

-- ========== เปลี่ยนชื่อ section: ให้ห้องเปลี่ยนตามด้วย ==========
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
  update rooms set name = p_name, updated_at = now() where lower(name) = lower(v_old_name);
end;
$$;

-- ========== ลบ section: เก็บกวาดห้องคู่กัน ==========
-- (การเช็คว่ายังมีนักศึกษาอยู่ใน section หรือไม่ ทำที่ฝั่ง API route เพราะต้องเอาจำนวนไปขึ้นข้อความ)
create or replace function delete_student_section(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  select name into v_name from student_sections where id = p_id for update;
  if v_name is null then
    raise exception 'section_not_found';
  end if;

  delete from student_sections where id = p_id;

  -- ห้องที่เคยถูกใช้ลบไม่ได้ (session_rooms/attendance_records อ้าง room_id อยู่) → ปิดการใช้งานแทน
  delete from rooms r
  where lower(r.name) = lower(v_name)
    and not exists (select 1 from session_rooms sr where sr.room_id = r.id)
    and not exists (select 1 from attendance_records ar where ar.room_id = r.id);

  update rooms set status = 'inactive', updated_at = now() where lower(name) = lower(v_name);
end;
$$;

-- ========== ปรับข้อมูลเดิมให้ตรงกัน ==========
-- section ที่ยังไม่มีห้องคู่กัน → สร้างให้
insert into rooms (name)
select s.name
from student_sections s
where not exists (select 1 from rooms r where lower(r.name) = lower(s.name));

-- ห้องที่ไม่ตรงกับ section ไหนเลย = แถว seed เก่า ('Section 6'/'Section 7') → ปิดไม่ให้โผล่ในฟอร์ม
-- สร้างรอบเรียน แต่ไม่ลบทิ้ง เพราะ attendance_records เก่ายังอ้าง room_id อยู่ และรอบเรียนที่สร้างไป
-- แล้วยังต้องเช็คชื่อได้ (lookup เลือกห้องจาก session_rooms ของรอบนั้น ไม่ได้กรองด้วย status)
update rooms set status = 'inactive', updated_at = now()
where status = 'active'
  and not exists (select 1 from student_sections s where lower(s.name) = lower(rooms.name));
