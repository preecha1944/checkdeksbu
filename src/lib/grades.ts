import type {
  GradeScale,
  ScoreCategory,
  ScoreCategoryKind,
  ScoreComponent,
  SpecialStatus,
  Student,
  StudentScore,
} from '@/types/db';

export interface GradeTotals {
  coursework: number;
  attendance: number;
  midterm: number;
  final: number;
  total: number;
  grade: string;
}

export interface GradeSummaryRow extends GradeTotals {
  student: Student;
  special_status: SpecialStatus | null;
  remark: string | null;
}

export interface GradeScaleInput {
  grade: string;
  min_score: number;
  max_score: number;
  sort_order?: number;
}

export function roundScore(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function gradeOf(totalScore: number, scales: Pick<GradeScale, 'grade' | 'min_score' | 'max_score'>[]) {
  const rounded = roundScore(totalScore, 2);
  const scale = scales.find((item) => rounded >= Number(item.min_score) && rounded <= Number(item.max_score));
  return scale?.grade ?? '-';
}

export function validateGradeScaleRows(rows: GradeScaleInput[]): string | null {
  if (rows.length === 0) return 'ต้องมีเกณฑ์เกรดอย่างน้อย 1 แถว';

  const normalized = rows
    .map((row) => ({
      ...row,
      grade: row.grade.trim(),
      min_score: Number(row.min_score),
      max_score: Number(row.max_score),
    }))
    .sort((a, b) => a.min_score - b.min_score);

  for (const row of normalized) {
    if (!row.grade) return 'กรุณากรอกชื่อเกรดให้ครบ';
    if (!Number.isFinite(row.min_score) || !Number.isFinite(row.max_score)) return 'ช่วงคะแนนต้องเป็นตัวเลข';
    if (row.min_score < 0 || row.max_score > 100) return 'ช่วงคะแนนต้องอยู่ระหว่าง 0 ถึง 100';
    if (row.min_score > row.max_score) return 'คะแนนต่ำสุดต้องไม่มากกว่าคะแนนสูงสุด';
  }

  for (let i = 1; i < normalized.length; i += 1) {
    if (normalized[i].min_score <= normalized[i - 1].max_score) {
      return 'ช่วงคะแนนของเกรดทับซ้อนกัน';
    }
  }

  return null;
}

export function componentsByKind(categories: ScoreCategory[], components: ScoreComponent[]) {
  const categoryKind = new Map<string, ScoreCategoryKind>();
  for (const category of categories) categoryKind.set(category.id, category.kind);

  const result: Record<ScoreCategoryKind, ScoreComponent[]> = {
    coursework: [],
    attendance: [],
    midterm: [],
    final: [],
  };

  for (const component of components) {
    const kind = categoryKind.get(component.category_id);
    if (kind) result[kind].push(component);
  }

  for (const list of Object.values(result)) {
    list.sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
  }

  return result;
}

export function calculateTotalsForStudent({
  studentId,
  categories,
  components,
  scores,
  scales,
  specialStatus = null,
}: {
  studentId: string;
  categories: ScoreCategory[];
  components: ScoreComponent[];
  scores: StudentScore[];
  scales: GradeScale[];
  specialStatus?: SpecialStatus | null;
}): GradeTotals {
  const grouped = componentsByKind(categories, components);
  const scoreByComponent = new Map(scores.map((score) => [score.score_component_id, Number(score.score ?? 0)]));

  const sum = (items: ScoreComponent[]) =>
    roundScore(
      items.reduce((total, component) => total + Math.min(Number(component.max_score), Math.max(0, scoreByComponent.get(component.id) ?? 0)), 0),
      2
    );

  const coursework = sum(grouped.coursework);
  const attendance = sum(grouped.attendance);
  const midterm = sum(grouped.midterm);
  const final = sum(grouped.final);
  const total = roundScore(coursework + attendance + midterm + final, 2);

  return {
    coursework,
    attendance,
    midterm,
    final,
    total,
    grade: specialStatus ?? gradeOf(total, scales),
  };
}

export function buildGradeSummary({
  students,
  categories,
  components,
  scores,
  scales,
  finalGradeMeta,
}: {
  students: Student[];
  categories: ScoreCategory[];
  components: ScoreComponent[];
  scores: StudentScore[];
  scales: GradeScale[];
  finalGradeMeta?: Map<string, { special_status: SpecialStatus | null; remark: string | null }>;
}): GradeSummaryRow[] {
  return students.map((student) => {
    const studentScores = scores.filter((score) => score.student_id === student.id);
    const meta = finalGradeMeta?.get(student.id) ?? { special_status: null, remark: null };
    const totals = calculateTotalsForStudent({
      studentId: student.id,
      categories,
      components,
      scores: studentScores,
      scales,
      specialStatus: meta.special_status,
    });

    return {
      student,
      ...totals,
      special_status: meta.special_status,
      remark: meta.remark,
    };
  });
}
