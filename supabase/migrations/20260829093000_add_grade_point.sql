-- เพิ่มคอลัมน์ "ค่าคะแนน" (grade point) ตามไฟล์ คิดเกรด_MEd_Section6-7.xlsx
-- A=4, B+=3.5, B=3, C+=2.5, C=2  (เกรดพิเศษเช่น I/W/F ไม่มีค่าคะแนน = null)

alter table grade_scales add column if not exists grade_point numeric;
alter table final_grades add column if not exists grade_point numeric;

-- backfill รายวิชาเดิมที่ยังไม่มีค่าคะแนน โดยเทียบจากชื่อเกรดมาตรฐาน
update grade_scales
set grade_point = case upper(trim(grade))
  when 'A'  then 4
  when 'B+' then 3.5
  when 'B'  then 3
  when 'C+' then 2.5
  when 'C'  then 2
  when 'D+' then 1.5
  when 'D'  then 1
  when 'F'  then 0
  else null
end
where grade_point is null;
