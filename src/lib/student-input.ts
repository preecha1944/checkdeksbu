export function normalizeOptionalStudentField(value: unknown) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return trimmed && trimmed !== '-' ? trimmed : null;
}
