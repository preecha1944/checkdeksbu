# Student Optional Dash Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins type `-` for optional student fields and store those fields as empty values.

**Architecture:** Keep required student identity fields unchanged. Normalize optional student contact fields at the API boundary so single-create, edit, and bulk paste behave the same way.

**Tech Stack:** Next.js App Router, TypeScript, Supabase route handlers.

---

### Task 1: Shared Optional Field Normalization

**Files:**
- Create: `src/lib/student-input.ts`

- [ ] **Step 1: Add helper**

```ts
export function normalizeOptionalStudentField(value: unknown) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return trimmed && trimmed !== '-' ? trimmed : null;
}
```

- [ ] **Step 2: Verify helper use through TypeScript**

Run: `node node_modules/typescript/bin/tsc --noEmit`

Expected: exits successfully.

### Task 2: Apply Normalization to Student APIs

**Files:**
- Modify: `src/app/api/students/route.ts`
- Modify: `src/app/api/students/[id]/route.ts`
- Modify: `src/app/api/students/bulk/route.ts`

- [ ] **Step 1: Import helper in each route**

```ts
import { normalizeOptionalStudentField } from '@/lib/student-input';
```

- [ ] **Step 2: Normalize only `phone` and `email`**

Use `normalizeOptionalStudentField(body.phone)` and `normalizeOptionalStudentField(body.email)` for single create/edit.

For bulk rows, use the helper for parsed `phone` and `email` values.

- [ ] **Step 3: Keep required fields strict**

Do not allow blank student code or blank full name. Do not special-case `-` for student code.

### Task 3: Browser Form Compatibility

**Files:**
- Modify: `src/components/students/StudentFormModal.tsx`

- [ ] **Step 1: Let email input accept dash**

Change email input from `type="email"` to a text input with `inputMode="email"` so `-` can be submitted.

### Task 4: Verification and Release

- [ ] **Step 1: Run type check**

Run: `node node_modules/typescript/bin/tsc --noEmit`

Expected: exits successfully.

- [ ] **Step 2: Run production build**

Run: `node node_modules/next/dist/bin/next build`

Expected: exits successfully.

- [ ] **Step 3: Commit and push**

```bash
git add docs/superpowers/plans/2026-07-07-student-optional-dash.md src/lib/student-input.ts src/app/api/students src/components/students/StudentFormModal.tsx
git commit -m "Allow dash for optional student fields"
git push
```
