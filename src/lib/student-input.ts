export const STUDENT_CLASS_LEVELS = ['ชั้น 1', 'ชั้น 2'] as const;
export const DEFAULT_STUDENT_CLASS_LEVEL = STUDENT_CLASS_LEVELS[0];

export function normalizeOptionalStudentField(value: unknown) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return trimmed && trimmed !== '-' ? trimmed : null;
}

export function isStudentClassLevel(value: unknown) {
  return typeof value === 'string' && STUDENT_CLASS_LEVELS.includes(value.trim() as (typeof STUDENT_CLASS_LEVELS)[number]);
}

export function normalizeStudentClassLevel(value: unknown) {
  return isStudentClassLevel(value) ? String(value).trim() : DEFAULT_STUDENT_CLASS_LEVEL;
}
