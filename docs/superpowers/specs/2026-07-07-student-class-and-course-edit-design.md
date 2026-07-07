# Student Class and Course Edit Design

## Goal

Add a permanent student class label so grading and reporting can be separated by `ชั้น 1` and `ชั้น 2`, and allow admins/teachers to correct course metadata after creation.

## Student Class

Students get a new `class_level` field with a default of `ชั้น 1`.

The field appears in:
- Single student create/edit form
- Bulk paste import
- Students table with a class filter
- Score Entry with a class filter and class column
- Grade Summary with a class filter and class column

Bulk paste supports both formats:
- Existing: `รหัส [Tab] ชื่อ [Tab] เบอร์ [Tab] อีเมล`
- New: `รหัส [Tab] ชื่อ [Tab] ชั้น [Tab] เบอร์ [Tab] อีเมล`

If the class is blank or unrecognized, the API stores `ชั้น 1`.

## Course Edit

Courses can be edited from the Courses page. Editable fields:
- Course code
- Course name
- Academic year
- Semester

This does not change score setup, score components, existing scores, attendance, or grade locks.

## Database

Add `students.class_level text not null default 'ชั้น 1'`.

Existing students automatically receive `ชั้น 1` after migration.

## Verification

Run TypeScript and production build. Push and deploy after the Supabase migration is applied.
