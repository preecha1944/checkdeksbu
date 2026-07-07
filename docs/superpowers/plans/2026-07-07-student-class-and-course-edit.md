# Student Class and Course Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add student class separation and course metadata editing.

**Architecture:** Store class as `students.class_level` with a small whitelist helper. Add PATCH support for course metadata without touching score/grade tables.

**Tech Stack:** Next.js App Router, TypeScript, Supabase, Vercel.

---

### Task 1: Database and Types

**Files:**
- Modify: `supabase/schema.sql`
- Create: `supabase/migrations/20260707164000_add_student_class_level.sql`
- Modify: `src/types/db.ts`
- Modify: `src/lib/student-input.ts`

- [ ] Add `class_level text not null default 'ชั้น 1'` to students.
- [ ] Add `STUDENT_CLASS_LEVELS`, `normalizeStudentClassLevel`, and `isStudentClassLevel`.
- [ ] Add `class_level: string` to `Student`.

### Task 2: Student UI and APIs

**Files:**
- Modify: `src/components/students/StudentFormModal.tsx`
- Modify: `src/components/students/BulkPasteModal.tsx`
- Modify: `src/components/students/StudentsTable.tsx`
- Modify: `src/app/api/students/route.ts`
- Modify: `src/app/api/students/[id]/route.ts`
- Modify: `src/app/api/students/bulk/route.ts`

- [ ] Add class select to single create/edit.
- [ ] Add class column/filter to Students table.
- [ ] Support both old and new bulk paste formats.
- [ ] Store default `ชั้น 1` for missing/invalid class.

### Task 3: Score and Grade Filters

**Files:**
- Modify: `src/components/scores/ScoreEntryTable.tsx`
- Modify: `src/components/scores/GradeSummaryTable.tsx`

- [ ] Add class filter and class column to score entry.
- [ ] Add class filter and class column to grade summary.

### Task 4: Course Editing

**Files:**
- Create: `src/app/api/courses/[id]/route.ts`
- Create: `src/components/courses/EditCourseButton.tsx`
- Modify: `src/app/(admin)/courses/page.tsx`

- [ ] Add PATCH endpoint for course metadata.
- [ ] Add edit modal on course cards for non-viewers.

### Task 5: Verify and Release

- [ ] Run `supabase db push`.
- [ ] Run `node node_modules/typescript/bin/tsc --noEmit`.
- [ ] Run `node node_modules/next/dist/bin/next build`.
- [ ] Commit, push, and deploy production.
