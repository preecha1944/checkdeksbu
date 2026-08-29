# Manageable Student Sections Design

## Goal

Replace the hardcoded two-value section list (`Section 6`, `Section 7`) with a
section list the teacher manages from the UI. A term may run one section, three,
or none of the previous names.

## Problem

`src/lib/student-input.ts` hardcodes the section list and a parser that maps a
handful of literals onto those two values. Anything unrecognized is silently
coerced to `Section 6`. Two consequences:

- A student typed or pasted with an unlisted section name is filed under
  `Section 6` without warning.
- `src/app/api/students/bulk/route.ts` uses `isStudentClassLevel` to decide
  *whether column 3 is a section column at all*. With an unlisted name and a
  3-or-4 column paste, the section text is stored as the phone number and every
  later column shifts.

Sections are also not a database concept, so there is nowhere to add one.

## Scope

Section membership stays `students.class_level`. The `rooms` table (rows named
`Section 6` / `Section 7`, used by `session_rooms` and attendance `room_id`) is
a separate physical-room concept and is not touched.

## Data Model

New table holding the list of valid section names:

```sql
create table if not exists student_sections (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  sort_order int not null default 0,
  created_at timestamptz default now()
);
```

`students.class_level` keeps storing the section **name** as text. Only its
source of truth changes: from a TypeScript constant to this table.

```sql
alter table students alter column class_level drop default;
```

The table ships empty. No seed rows.

Denormalization is deliberate. Every existing reader of `class_level` (three
export routes, ScanFlow, dashboard, score entry, grade summary) keeps working
unchanged and no query gains a join. The cost is that a rename must cascade,
which the PATCH endpoint handles.

## API — `/api/sections`

| Method | Behavior |
|---|---|
| `GET` | Sections ordered by `sort_order`, then `name`. Each row carries `student_count`. |
| `POST` | Creates a section. Name is trimmed; empty is rejected. Case-insensitive duplicate returns 409. |
| `PATCH` | Renames a section and updates `students.class_level` for every student in it, both in one transaction. Same duplicate rule as POST. |
| `DELETE` | Refuses with 409 when the section has students, and the message states the count. Deletes otherwise. |

Rename and its cascade must not partially apply — a failure leaves both the
section name and every student row unchanged.

## UI

A section-management card on the Settings page: each section with its student
count, plus add, rename, and delete controls. Delete surfaces the 409 message
rather than a generic error.

The four existing dropdowns (`GradeSummaryTable`, `ScoreEntryTable`,
`StudentFormModal`, `StudentsTable`) read the list from the API instead of the
constant.

## Validation

`STUDENT_CLASS_LEVELS`, `DEFAULT_STUDENT_CLASS_LEVEL`, `isStudentClassLevel`,
`normalizeStudentClassLevel`, and `parseStudentClassLevel` are removed.
`normalizeOptionalStudentField` stays as is.

Student create, edit, and bulk import validate the submitted section against
`student_sections`. An unknown name is **rejected**, never coerced. Bulk import
reports the offending line number and leaves the whole paste unapplied.

Bulk paste stops guessing which column is the section. The paste modal carries a
section selector that applies to the whole batch, and column layout is decided by
column count alone:

- 4 columns — `code, name, phone, email`; every row takes the selected section
- 5 columns — `code, name, section, phone, email`; the per-row name wins and must
  match an existing section

This removes the ambiguity that caused the column shift: column 3 is a section
only in the 5-column form, never by name-matching.

## Empty State

`class_level` is `not null`, so a student cannot be created before a section
exists. With zero sections, the student create form is disabled and points the
user at Settings.

## Verification

- Add, rename, delete a section from Settings.
- Rename a section holding students; confirm every student follows and the
  grade summary filter still matches them.
- Delete a section holding students; confirm 409 with the count and no deletion.
- Bulk paste a 5-column roster with an unknown section name; confirm the whole
  paste is rejected and names the line.
- Bulk paste a 5-column roster with a valid section; confirm phone and email
  land in the right columns.
- Bulk paste a 4-column roster; confirm every row takes the section chosen in the
  modal.
- Confirm the four dropdowns list exactly the sections in the table.
