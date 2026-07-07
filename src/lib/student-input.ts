export const STUDENT_CLASS_LEVELS = ['Section 6', 'Section 7'] as const;
export const DEFAULT_STUDENT_CLASS_LEVEL = STUDENT_CLASS_LEVELS[0];
type StudentClassLevel = (typeof STUDENT_CLASS_LEVELS)[number];

export function normalizeOptionalStudentField(value: unknown) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return trimmed && trimmed !== '-' ? trimmed : null;
}

export function isStudentClassLevel(value: unknown) {
  return parseStudentClassLevel(value) !== null;
}

export function normalizeStudentClassLevel(value: unknown) {
  return parseStudentClassLevel(value) ?? DEFAULT_STUDENT_CLASS_LEVEL;
}

function parseStudentClassLevel(value: unknown): StudentClassLevel | null {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase();
  if (normalized === 'section 6' || normalized === '6' || normalized === 'ชั้น 1') return 'Section 6';
  if (normalized === 'section 7' || normalized === '7' || normalized === 'ชั้น 2') return 'Section 7';

  return null;
}
