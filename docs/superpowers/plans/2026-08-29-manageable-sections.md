# Manageable Student Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the teacher create, rename, and delete student sections from the Settings page instead of the two names hardcoded in `src/lib/student-input.ts`.

**Architecture:** A new `student_sections` table becomes the list of valid section names. `students.class_level` keeps storing the section **name** as text, so every existing reader of `class_level` (three export routes, ScanFlow, dashboard, score entry, grade summary) is untouched and no query gains a join. Renaming cascades to students through a Postgres function so the rename and the cascade share one transaction. Server components fetch the section list and pass it to client components as props, matching how this codebase already feeds `students` to `StudentsTable`.

**Tech Stack:** Next.js 16 (App Router, server components), Supabase (Postgres + service-role client), TypeScript, Tailwind v4.

**On automated tests:** this repo has no test runner — `package.json` has `dev`, `build`, `start`, `lint` only, and no test dependencies. Standing up vitest is a separate decision the user has not asked for, so verification here is `next build` (which typechecks) plus the explicit manual checks in each task and Task 8. Do not silently skip those checks; they are the safety net that replaces the missing suite.

**Build command (important):** the project path contains Thai characters and `&`, which breaks the `npm`/`npx` shims. Always build from PowerShell in `attendance-app/` with:

```
node ".\node_modules\next\dist\bin\next" build
```

**Branch:** `manageable-sections` (already created; the spec commits live there). Do not push to `main` — `main` auto-deploys production on push.

---

### Task 1: Database — sections table, rename function, types

**Files:**
- Create: `supabase/migrations/20260829140000_add_student_sections.sql`
- Modify: `supabase/schema.sql` (line 37, the `STUDENTS` block, and the RLS block near line 213)
- Modify: `src/types/db.ts` (add `StudentSection` after the `Student` interface, line 54)

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260829140000_add_student_sections.sql`:

```sql
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
```

- [ ] **Step 2: Mirror it into `supabase/schema.sql`**

`schema.sql` is the from-scratch installer, so it must produce the same result:

1. Change line 37 from `class_level text not null default 'Section 6',` to `class_level text not null,`.
2. After the `STUDENTS` block, add the `create table if not exists student_sections (...)` statement, both indexes, and the `rename_student_section` function exactly as written in Step 1.
3. Add `alter table student_sections enable row level security;` to the RLS block near line 213, alongside the other tables.

Seed nothing — the section list ships empty by design.

- [ ] **Step 3: Add the type**

In `src/types/db.ts`, after the `Student` interface:

```ts
export interface StudentSection {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}
```

- [ ] **Step 4: Apply the migration to Supabase**

Paste the contents of `supabase/migrations/20260829140000_add_student_sections.sql` into the Supabase SQL Editor and run it.

- [ ] **Step 5: Verify the table exists**

From `attendance-app/` in Git Bash:

```bash
set -a && . ./.env.local && set +a
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/student_sections?select=id,name,sort_order" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Expected: `[]` — the table exists and is empty. A `42P01` error means the migration did not run.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260829140000_add_student_sections.sql supabase/schema.sql src/types/db.ts
git commit -m "Add student_sections table and rename cascade function"
```

---

### Task 2: Section helper and `/api/sections` endpoints

**Files:**
- Create: `src/lib/sections.ts`
- Create: `src/app/api/sections/route.ts`
- Create: `src/app/api/sections/[id]/route.ts`

- [ ] **Step 1: Write the server-side helper**

Create `src/lib/sections.ts`:

```ts
import { createServiceClient } from '@/lib/supabase/server';
import type { StudentSection } from '@/types/db';

/** รายการ section ทั้งหมด เรียงตาม sort_order แล้วค่อยชื่อ — ใช้ได้ทั้งใน server component และ API route */
export async function listSections(): Promise<StudentSection[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('student_sections')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  return (data ?? []) as unknown as StudentSection[];
}

/**
 * หา section ตามชื่อแบบไม่สนตัวพิมพ์เล็ก/ใหญ่
 * คืน "ชื่อตามที่บันทึกไว้จริง" เพื่อให้ students.class_level สะกดตรงกับ student_sections.name เสมอ
 * (ถ้าเก็บตามที่ผู้ใช้พิมพ์ ตัวกรองและการเปลี่ยนชื่อจะ match ไม่เจอ)
 */
export function matchSectionName(sections: StudentSection[], value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const needle = value.trim().toLowerCase();
  if (!needle) return null;
  return sections.find((s) => s.name.toLowerCase() === needle)?.name ?? null;
}
```

- [ ] **Step 2: Write GET and POST**

Create `src/app/api/sections/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';
import { listSections } from '@/lib/sections';

// GET /api/sections — รายการ section พร้อมจำนวนนักศึกษาในแต่ละอัน
export async function GET() {
  try {
    await requireAuth();
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const sections = await listSections();
  const supabase = createServiceClient();
  const { data: studentsRaw } = await supabase.from('students').select('class_level');
  const rows = (studentsRaw ?? []) as unknown as { class_level: string }[];

  // นับในหน่วยความจำ — รายชื่อนักศึกษาของระบบนี้อยู่ระดับหลักสิบ ไม่คุ้มที่จะทำ view หรือ RPC เพิ่ม
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.class_level, (counts.get(row.class_level) ?? 0) + 1);
  }

  return NextResponse.json({
    sections: sections.map((section) => ({ ...section, student_count: counts.get(section.name) ?? 0 })),
  });
}

// POST /api/sections — เพิ่ม section ใหม่
export async function POST(request: Request) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) return jsonError('กรุณากรอกชื่อ Section');

  const supabase = createServiceClient();
  const { data: last } = await supabase
    .from('student_sections')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = ((last as { sort_order: number } | null)?.sort_order ?? 0) + 1;

  const { data: section, error } = await supabase
    .from('student_sections')
    .insert([{ name, sort_order: sortOrder }])
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') return jsonError(`มี Section ชื่อ "${name}" อยู่แล้ว`, 409);
    return jsonError('เพิ่ม Section ไม่สำเร็จ กรุณาลองใหม่', 500);
  }

  return NextResponse.json({ section }, { status: 201 });
}
```

- [ ] **Step 3: Write PATCH and DELETE**

Create `src/app/api/sections/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';

// PATCH /api/sections/[id] — เปลี่ยนชื่อ section แล้วให้ students.class_level ตามไปด้วย
// เรียกผ่าน RPC เพราะสองคำสั่งนี้ต้องอยู่ใน transaction เดียว
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) return jsonError('กรุณากรอกชื่อ Section');

  const supabase = createServiceClient();
  const { error } = await supabase.rpc('rename_student_section', { p_id: id, p_name: name });

  if (error) {
    if (error.message.includes('duplicate_section')) return jsonError(`มี Section ชื่อ "${name}" อยู่แล้ว`, 409);
    if (error.message.includes('section_not_found')) return jsonError('ไม่พบ Section นี้', 404);
    return jsonError('เปลี่ยนชื่อ Section ไม่สำเร็จ กรุณาลองใหม่', 500);
  }

  return NextResponse.json({ ok: true, name });
}

// DELETE /api/sections/[id] — ลบได้เฉพาะ section ที่ไม่มีนักศึกษาอยู่
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: sectionRaw } = await supabase
    .from('student_sections')
    .select('name')
    .eq('id', id)
    .maybeSingle();
  const section = sectionRaw as { name: string } | null;
  if (!section) return jsonError('ไม่พบ Section นี้', 404);

  const { count } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('class_level', section.name);

  if ((count ?? 0) > 0) {
    return jsonError(`มีนักศึกษา ${count} คนอยู่ใน Section นี้ ย้ายออกก่อนจึงจะลบได้`, 409);
  }

  const { error } = await supabase.from('student_sections').delete().eq('id', id);
  if (error) return jsonError('ลบ Section ไม่สำเร็จ กรุณาลองใหม่', 500);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Build**

Run `node ".\node_modules\next\dist\bin\next" build`.
Expected: build succeeds and the printed route list includes `/api/sections` and `/api/sections/[id]`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sections.ts src/app/api/sections
git commit -m "Add sections API with rename cascade and delete guard"
```

---

### Task 3: Section management UI on the Settings page

**Files:**
- Create: `src/components/settings/SectionManager.tsx`
- Modify: `src/app/(admin)/settings/page.tsx`

- [ ] **Step 1: Write the manager component**

Create `src/components/settings/SectionManager.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from '@/components/ui/Table';
import type { StudentSection } from '@/types/db';

export interface SectionWithCount extends StudentSection {
  student_count: number;
}

export function SectionManager({ sections, isViewer }: { sections: SectionWithCount[]; isViewer: boolean }) {
  const router = useRouter();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(url: string, method: string, body?: unknown) {
    setError(null);
    setLoading(true);
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? 'ทำรายการไม่สำเร็จ');
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    if (await send('/api/sections', 'POST', { name: newName })) setNewName('');
  }

  async function handleRename(id: string) {
    if (!editingName.trim()) return;
    if (await send(`/api/sections/${id}`, 'PATCH', { name: editingName })) setEditingId(null);
  }

  return (
    <Card>
      <CardHeader
        title="Section ของนักศึกษา"
        description="เพิ่ม เปลี่ยนชื่อ หรือลบ Section ที่ใช้จัดกลุ่มนักศึกษา"
      />

      {!isViewer && (
        <div className="mb-4 flex gap-3">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleAdd();
              }
            }}
            placeholder="ชื่อ Section เช่น Section 6"
          />
          <Button onClick={handleAdd} loading={loading} disabled={!newName.trim()}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            เพิ่ม
          </Button>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </div>
      )}

      {sections.length === 0 ? (
        <EmptyState
          title="ยังไม่มี Section"
          description="เพิ่ม Section อย่างน้อย 1 อันก่อน จึงจะเพิ่มนักศึกษาเข้าระบบได้"
        />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableTh>ชื่อ Section</TableTh>
              <TableTh>จำนวนนักศึกษา</TableTh>
              <TableTh>จัดการ</TableTh>
            </tr>
          </TableHead>
          <TableBody>
            {sections.map((section) => (
              <TableRow key={section.id}>
                <TableTd className="font-medium">
                  {editingId === section.id ? (
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleRename(section.id);
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    section.name
                  )}
                </TableTd>
                <TableTd>{section.student_count}</TableTd>
                <TableTd>
                  {isViewer ? (
                    <span className="text-sm text-ink-muted">—</span>
                  ) : editingId === section.id ? (
                    <div className="flex gap-2">
                      <Button onClick={() => handleRename(section.id)} loading={loading}>
                        บันทึก
                      </Button>
                      <Button variant="secondary" onClick={() => setEditingId(null)}>
                        ยกเลิก
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setEditingId(section.id);
                          setEditingName(section.name);
                          setError(null);
                        }}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        เปลี่ยนชื่อ
                      </Button>
                      <Button variant="secondary" onClick={() => send(`/api/sections/${section.id}`, 'DELETE')}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        ลบ
                      </Button>
                    </div>
                  )}
                </TableTd>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Render it on the Settings page**

In `src/app/(admin)/settings/page.tsx`, add these imports next to the existing ones:

```tsx
import { SectionManager, type SectionWithCount } from '@/components/settings/SectionManager';
import { createServiceClient } from '@/lib/supabase/server';
import { listSections } from '@/lib/sections';
```

Inside `SettingsPage`, after the existing `role` and `fullName` lines, build the list:

```tsx
  const sections = await listSections();
  const supabase = createServiceClient();
  const { data: studentsRaw } = await supabase.from('students').select('class_level');
  const counts = new Map<string, number>();
  for (const row of (studentsRaw ?? []) as unknown as { class_level: string }[]) {
    counts.set(row.class_level, (counts.get(row.class_level) ?? 0) + 1);
  }
  const sectionsWithCount: SectionWithCount[] = sections.map((section) => ({
    ...section,
    student_count: counts.get(section.name) ?? 0,
  }));
```

Then render the card directly after the closing `</div>` of the existing three-card grid:

```tsx
      <div className="mb-6">
        <SectionManager sections={sectionsWithCount} isViewer={role === 'viewer'} />
      </div>
```

- [ ] **Step 3: Build**

`node ".\node_modules\next\dist\bin\next" build` — expected: succeeds.

- [ ] **Step 4: Verify against the dev server**

Run `node ".\node_modules\next\dist\bin\next" dev`, log in, open `/settings`. Add a section, rename it, delete it. Confirm the empty state appears when the list is empty and the count column reads 0 for a fresh section.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/SectionManager.tsx "src/app/(admin)/settings/page.tsx"
git commit -m "Add section management card to Settings"
```

---

### Task 4: Feed the section list to the four dropdowns

Each consumer currently imports `STUDENT_CLASS_LEVELS`. Switch them to a `sections: string[]` prop supplied by the server component that already renders them. This must land before Task 5 removes the constant, so the build stays green at every commit.

**Files:**
- Modify: `src/app/(admin)/students/page.tsx`
- Modify: `src/components/students/StudentsTable.tsx`
- Modify: `src/components/students/StudentsPageActions.tsx`
- Modify: `src/components/students/StudentFormModal.tsx`
- Modify: `src/app/(admin)/courses/[id]/grades/page.tsx`
- Modify: `src/components/scores/GradeSummaryTable.tsx`
- Modify: `src/app/(admin)/courses/[id]/entry/page.tsx`
- Modify: `src/components/scores/ScoreEntryTable.tsx`

- [ ] **Step 1: Students page passes sections down**

In `src/app/(admin)/students/page.tsx`, add `import { listSections } from '@/lib/sections';`, then inside the component:

```tsx
  const sectionNames = (await listSections()).map((s) => s.name);
```

and change the two render calls:

```tsx
        action={!isViewer && <StudentsPageActions sections={sectionNames} />}
      />
      <StudentsTable students={students} isViewer={isViewer} sections={sectionNames} />
```

- [ ] **Step 2: `StudentsTable` takes the prop**

Delete the `student-input` import (line 16). Change the props interface and signature:

```tsx
export interface StudentsTableProps {
  students: Student[];
  isViewer: boolean;
  sections: string[];
}

export function StudentsTable({ students, isViewer, sections }: StudentsTableProps) {
```

Change the filter (line 36) to:

```tsx
        (classFilter === 'all' || s.class_level === classFilter) &&
```

and the dropdown body (lines 66-70) to:

```tsx
          {sections.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
```

`StudentsTable` also renders `<StudentFormModal ...>`; add `sections={sections}` to that call.

- [ ] **Step 3: `StudentsPageActions` forwards the prop**

```tsx
export function StudentsPageActions({ sections }: { sections: string[] }) {
```

and pass `sections={sections}` to `<StudentFormModal ... />` only. `BulkPasteModal` does not accept the prop until Task 6 adds it — passing it here would fail the build.

- [ ] **Step 4: `StudentFormModal` takes the prop**

Delete the `student-input` import. Then:

```tsx
export interface StudentFormModalProps {
  open: boolean;
  onClose: () => void;
  student?: Student | null;
  sections: string[];
}

export function StudentFormModal({ open, onClose, student, sections }: StudentFormModalProps) {
```

State init becomes `const [classLevel, setClassLevel] = useState<string>('');`, and inside the `useEffect` the line becomes:

```tsx
      setClassLevel(student?.class_level ?? sections[0] ?? '');
```

Add `sections` to that `useEffect` dependency array. The `Select` loses its cast and maps the prop:

```tsx
          <Select id="class_level" required value={classLevel} onChange={(e) => setClassLevel(e.target.value)}>
            {sections.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
```

- [ ] **Step 5: Grade summary**

In `src/app/(admin)/courses/[id]/grades/page.tsx` add `import { listSections } from '@/lib/sections';`, compute `const sectionNames = (await listSections()).map((s) => s.name);`, and pass `sections={sectionNames}` to `<GradeSummaryTable ... />`.

In `src/components/scores/GradeSummaryTable.tsx`, delete the `student-input` import, add `sections: string[]` to the props and signature, change the filter to `row.student.class_level === classFilter`, and map `sections` in the dropdown exactly as in Step 2.

- [ ] **Step 6: Score entry**

In `src/app/(admin)/courses/[id]/entry/page.tsx` do the same and pass `sections={sectionNames}` to `<ScoreEntryTable ... />`.

In `src/components/scores/ScoreEntryTable.tsx`, delete the `student-input` import, add `sections: string[]` to the props and signature, change line 57 to:

```tsx
      students.filter((student) => classFilter === 'all' || student.class_level === classFilter),
```

and map `sections` in the dropdown at lines 166-170.

- [ ] **Step 7: Build**

`node ".\node_modules\next\dist\bin\next" build` — expected: succeeds. Any file still importing `STUDENT_CLASS_LEVELS` is now a compile error naming the file you missed.

- [ ] **Step 8: Commit**

```bash
git add -A src
git commit -m "Read the section list from the database in every dropdown"
```

---

### Task 5: Remove the hardcoded list and validate on write

**Files:**
- Modify: `src/lib/student-input.ts`
- Modify: `src/app/api/students/route.ts`
- Modify: `src/app/api/students/[id]/route.ts`
- Modify: `src/app/api/export/students/route.ts`
- Modify: `src/app/api/export/sessions/[id]/route.ts`
- Modify: `src/app/api/export/courses/[id]/route.ts`

- [ ] **Step 1: Strip `student-input.ts` down**

Replace the whole file with:

```ts
/** ช่องที่ปล่อยว่างได้ (เบอร์โทร/อีเมล) — "-" ถือว่าไม่กรอก */
export function normalizeOptionalStudentField(value: unknown) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return trimmed && trimmed !== '-' ? trimmed : null;
}
```

The section list now lives in `student_sections`; name matching moved to `matchSectionName` in `src/lib/sections.ts`.

- [ ] **Step 2: Validate in student create**

In `src/app/api/students/route.ts`, replace the `student-input` import with:

```ts
import { normalizeOptionalStudentField } from '@/lib/student-input';
import { listSections, matchSectionName } from '@/lib/sections';
```

Delete the line `const classLevel = normalizeStudentClassLevel(body.class_level);`, and after the `if (!fullName) return jsonError('กรุณากรอกชื่อ-สกุล');` guard add:

```ts
  const sections = await listSections();
  if (sections.length === 0) return jsonError('ยังไม่มี Section ในระบบ กรุณาเพิ่ม Section ที่หน้า Settings ก่อน');

  const classLevel = matchSectionName(sections, body.class_level);
  if (!classLevel) return jsonError('กรุณาเลือก Section ที่มีอยู่ในระบบ');
```

- [ ] **Step 3: Validate in student edit**

In `src/app/api/students/[id]/route.ts`, use the same two imports, and replace the `class_level` line with:

```ts
  if (body.class_level !== undefined) {
    const sections = await listSections();
    const matched = matchSectionName(sections, body.class_level);
    if (!matched) return jsonError('กรุณาเลือก Section ที่มีอยู่ในระบบ');
    patch.class_level = matched;
  }
```

- [ ] **Step 4: Fix the three export routes**

Each imports `DEFAULT_STUDENT_CLASS_LEVEL` purely as a null fallback, and `class_level` is `not null`, so the fallback is dead code. In all three files delete the `import { DEFAULT_STUDENT_CLASS_LEVEL } from '@/lib/student-input';` line and change the usage:

- `src/app/api/export/students/route.ts:33` → `student.class_level,`
- `src/app/api/export/sessions/[id]/route.ts:65` → `student.class_level,`
- `src/app/api/export/courses/[id]/route.ts:81` → `row.student.class_level,`

- [ ] **Step 5: Build**

`node ".\node_modules\next\dist\bin\next" build` — expected: succeeds with no unresolved imports.

- [ ] **Step 6: Verify rejection in the browser**

The API requires a session cookie, so check this through the UI rather than curl. With the dev server running and one section named `Section A`:

1. Open `/students`, add a student — confirm the Section dropdown offers only `Section A`.
2. Open DevTools → Network, edit that student, and replay the PATCH with `"class_level":"ไม่มีจริง"` — expected: 400 with `กรุณาเลือก Section ที่มีอยู่ในระบบ`, and the student keeps `Section A`.

- [ ] **Step 7: Commit**

```bash
git add -A src
git commit -m "Validate sections against the database instead of a constant"
```

---

### Task 6: Bulk paste — batch section selector and all-or-nothing import

**Files:**
- Modify: `src/app/api/students/bulk/route.ts`
- Modify: `src/components/students/BulkPasteModal.tsx`
- Modify: `src/components/students/StudentsPageActions.tsx` (pass the new prop through)

- [ ] **Step 1: Rewrite the parser**

In `src/app/api/students/bulk/route.ts`, replace the imports, the `ParsedRow` interface, and `parseLine` with:

```ts
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';
import { normalizeOptionalStudentField } from '@/lib/student-input';
import { listSections, matchSectionName } from '@/lib/sections';
import type { StudentSection } from '@/types/db';

interface ParsedRow {
  lineNumber: number;
  studentCode: string;
  fullName: string;
  classLevel: string;
  phone: string | null;
  email: string | null;
}

/**
 * รูปแบบคอลัมน์ตัดสินจาก "จำนวนคอลัมน์" อย่างเดียว
 *   4 คอลัมน์ = รหัส, ชื่อ, เบอร์, อีเมล           → ใช้ section ที่เลือกไว้ทั้งชุด
 *   5 คอลัมน์ = รหัส, ชื่อ, section, เบอร์, อีเมล → ใช้ section ในแถว
 * เดิมใช้การเดาว่าคอลัมน์ที่ 3 "หน้าตาเหมือน section มั้ย" ทำให้ชื่อ section ที่ไม่รู้จัก
 * ถูกเลื่อนไปเก็บเป็นเบอร์โทรทั้งแถวโดยไม่มีการเตือน
 */
function parseLine(
  line: string,
  lineNumber: number,
  sections: StudentSection[],
  fallbackSection: string
): ParsedRow | { lineNumber: number; error: string } {
  let cols = line.split('\t').map((c) => c.trim());
  if (cols.length < 2) {
    cols = line.split(/\s{2,}/).map((c) => c.trim());
  }

  const [studentCode, fullName] = cols;

  if (!studentCode || !fullName) {
    return { lineNumber, error: `บรรทัดที่ ${lineNumber}: ต้องมีรหัสนักศึกษาและชื่อ-สกุลอย่างน้อย` };
  }

  const hasSectionColumn = cols.length >= 5;
  let classLevel = fallbackSection;

  if (hasSectionColumn) {
    const matched = matchSectionName(sections, cols[2]);
    if (!matched) {
      return { lineNumber, error: `บรรทัดที่ ${lineNumber}: ไม่มี Section ชื่อ "${cols[2]}" ในระบบ` };
    }
    classLevel = matched;
  }

  return {
    lineNumber,
    studentCode,
    fullName,
    classLevel,
    phone: normalizeOptionalStudentField(hasSectionColumn ? cols[3] : cols[2]),
    email: normalizeOptionalStudentField(hasSectionColumn ? cols[4] : cols[3]),
  };
}
```

- [ ] **Step 2: Make the import all-or-nothing**

Replace the `POST` body from its start down to (but not including) the existing `for (const row of rows)` loop with:

```ts
export async function POST(request: Request) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const body = await request.json().catch(() => null);
  const text: string = typeof body?.text === 'string' ? body.text : '';
  if (!text.trim()) return jsonError('กรุณาวางรายชื่อนักศึกษา');

  const sections = await listSections();
  if (sections.length === 0) return jsonError('ยังไม่มี Section ในระบบ กรุณาเพิ่ม Section ที่หน้า Settings ก่อน');

  const fallbackSection = matchSectionName(sections, body?.section);
  if (!fallbackSection) return jsonError('กรุณาเลือก Section สำหรับรายชื่อชุดนี้');

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const parseErrors: string[] = [];
  const rows: ParsedRow[] = [];

  lines.forEach((line, idx) => {
    const result = parseLine(line, idx + 1, sections, fallbackSection);
    if ('error' in result) {
      parseErrors.push(result.error);
    } else {
      rows.push(result);
    }
  });

  // ตรวจให้ผ่านครบทุกบรรทัดก่อน ค่อยเขียนลง DB — ไม่งั้นวางผิดทีเดียวได้ข้อมูลเข้าครึ่ง ๆ กลาง ๆ
  if (parseErrors.length > 0) {
    return NextResponse.json(
      { error: 'รายชื่อมีบรรทัดที่ไม่ถูกต้อง ยังไม่ได้นำเข้าข้อมูลใด ๆ', errors: parseErrors },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  let added = 0;
  let updated = 0;
  const errors: string[] = [];
```

Leave the existing `for (const row of rows)` loop and the final `return NextResponse.json({ added, updated, errors });` exactly as they are.

- [ ] **Step 3: Add the section selector to the modal**

In `src/components/students/BulkPasteModal.tsx`, change the react import to `import { useEffect, useState } from 'react';`, add `import { Select } from '@/components/ui/Select';`, and change the props and state:

```tsx
export interface BulkPasteModalProps {
  open: boolean;
  onClose: () => void;
  sections: string[];
}

export function BulkPasteModal({ open, onClose, sections }: BulkPasteModalProps) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [section, setSection] = useState('');
```

Default it when the modal opens:

```tsx
  useEffect(() => {
    if (open) setSection((current) => current || sections[0] || '');
  }, [open, sections]);
```

In `src/components/students/StudentsPageActions.tsx`, now add `sections={sections}` to the `<BulkPasteModal ... />` call as well.

Send the section with the request — `body: JSON.stringify({ text, section }),` — and surface the rejected lines in `handleSubmit`:

```tsx
    if (!res.ok) {
      const lines: string[] = Array.isArray(data?.errors) ? data.errors : [];
      setError([data?.error ?? 'นำเข้าไม่สำเร็จ', ...lines].join('\n'));
      return;
    }
```

Add `whitespace-pre-line` to the className of the error `<div>` so those lines render separately.

Render the selector above the textarea block:

```tsx
        <div>
          <Label htmlFor="bulkSection">Section ของรายชื่อชุดนี้</Label>
          <Select id="bulkSection" value={section} onChange={(e) => setSection(e.target.value)}>
            {sections.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </div>
```

And replace the help text under the existing label with:

```tsx
            คอลัมน์: รหัส [Tab] ชื่อ-สกุล [Tab] Section [Tab] เบอร์โทร [Tab] อีเมล — ถ้าไม่ใส่คอลัมน์ Section จะใช้ Section ที่เลือกไว้ด้านบน
```

- [ ] **Step 4: Build**

`node ".\node_modules\next\dist\bin\next" build` — expected: succeeds.

- [ ] **Step 5: Verify all three paste shapes in the browser**

With two sections created (`Section A`, `Section B`):

1. Paste 4 columns `66001 [Tab] ทดสอบ ก [Tab] 0812345678 [Tab] a@example.com` with `Section B` selected → 1 added, student lands in `Section B`, phone reads `0812345678`.
2. Paste 5 columns with `Section A` in column 3 → 1 added into `Section A`, phone and email in the right columns.
3. Paste 5 columns with `Section Z` in column 3 → nothing imported, error names the line number and the bad name.

Check 3 is the regression that motivated this task — confirm no student row was created.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/students/bulk/route.ts src/components/students/BulkPasteModal.tsx src/components/students/StudentsPageActions.tsx
git commit -m "Make bulk paste section-aware and all-or-nothing"
```

---

### Task 7: Block student creation when no section exists

**Files:**
- Modify: `src/components/students/StudentsPageActions.tsx`

- [ ] **Step 1: Replace the actions with a pointer to Settings**

`class_level` is `not null`, so with zero sections both flows fail server-side. Say so before the user types. Add to the top of the component body, before the existing `return`:

```tsx
  if (sections.length === 0) {
    return (
      <div className="flex items-center gap-3">
        <p className="text-sm text-ink-muted">ยังไม่มี Section — เพิ่มที่หน้า Settings ก่อนจึงจะเพิ่มนักศึกษาได้</p>
        <Link href="/settings">
          <Button variant="secondary">ไปที่ Settings</Button>
        </Link>
      </div>
    );
  }
```

`Link` and `Button` are already imported in this file.

- [ ] **Step 2: Build**

`node ".\node_modules\next\dist\bin\next" build` — expected: succeeds.

- [ ] **Step 3: Verify**

Delete every section, open `/students`, confirm the notice and the Settings link replace the action buttons. Re-add a section and confirm the buttons come back.

- [ ] **Step 4: Commit**

```bash
git add src/components/students/StudentsPageActions.tsx
git commit -m "Point users at Settings when no section exists"
```

---

### Task 8: Full verification, then ship

- [ ] **Step 1: Confirm no hardcoded section names remain**

```bash
grep -rn "Section 6\|Section 7\|STUDENT_CLASS_LEVELS\|DEFAULT_STUDENT_CLASS_LEVEL" src supabase \
  --include=*.ts --include=*.tsx --include=*.sql
```

Expected hits, and only these: `supabase/migrations/20260708103000_rename_class_levels_to_sections.sql` (history, must not be edited) and the `rooms` seed in `supabase/schema.sql` (physical rooms for attendance, a different concept). Any hit under `src/` is a miss — fix it.

- [ ] **Step 2: Walk the spec's verification list**

Every item under "Verification" in `docs/superpowers/specs/2026-08-29-manageable-sections-design.md`. The rename-with-students check is the important one: create a section, add two students to it, rename it, then confirm both students still appear under the new name in the students table filter and in the grade summary filter. If either shows them missing, the cascade did not run.

- [ ] **Step 3: Final build**

`node ".\node_modules\next\dist\bin\next" build` — expected: succeeds.

- [ ] **Step 4: Push the branch**

```bash
git push -u origin manageable-sections
```

This produces a Preview deployment, not Production.

- [ ] **Step 5: Confirm with the user before merging to `main`**

Merging to `main` deploys production immediately. Do not merge without the user saying so. After any production deploy, re-run the region check:

```bash
npx --no-install vercel inspect <new-prod-url> | grep -c iad1   # must be 0
```

Also confirm the `student_sections` migration has been applied to the production Supabase project before production serves this code — the app queries a table that must already exist.
