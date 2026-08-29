/** ช่องที่ปล่อยว่างได้ (เบอร์โทร/อีเมล) — "-" ถือว่าไม่กรอก */
export function normalizeOptionalStudentField(value: unknown) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return trimmed && trimmed !== '-' ? trimmed : null;
}
