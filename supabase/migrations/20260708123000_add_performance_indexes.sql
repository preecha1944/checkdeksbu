create index if not exists idx_class_sessions_learning_start_desc
  on class_sessions(learning_date desc, start_time desc);

create index if not exists idx_class_sessions_status_learning_start_desc
  on class_sessions(status, learning_date desc, start_time desc);

create index if not exists idx_attendance_records_updated_at_desc
  on attendance_records(updated_at desc);

create index if not exists idx_attendance_records_session_updated_at_desc
  on attendance_records(session_id, updated_at desc);

create index if not exists idx_attendance_records_session_check_in_time
  on attendance_records(session_id, check_in_time);
