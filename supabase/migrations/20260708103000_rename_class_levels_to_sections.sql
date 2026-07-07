alter table students
  alter column class_level set default 'Section 6';

update students
set class_level = case
  when class_level = 'ชั้น 1' then 'Section 6'
  when class_level = 'ชั้น 2' then 'Section 7'
  else class_level
end
where class_level in ('ชั้น 1', 'ชั้น 2');
