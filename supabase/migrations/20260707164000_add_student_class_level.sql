alter table students
  add column if not exists class_level text not null default 'ชั้น 1';

create index if not exists idx_students_class_level on students(class_level);
