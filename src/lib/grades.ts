import { GRADE_INCOMPLETE, GRADE_NOT_ENTERED } from '@/lib/constants';
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
  grade_point: number | null;
  entered_count: number; // จำนวนช่องคะแนนที่กรอกแล้ว
  expected_count: number; // จำนวนช่องคะแนนทั้งหมดของรายวิชา
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
  grade_point?: number | null;
  sort_order?: number;
}

export function roundScore(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function gradeOf(totalScore: number, scales: Pick<GradeScale, 'grade' | 'min_score' | 'max_score'>[]) {
  const rounded = roundScore(totalScore, 2);
  const scale = scales.find((item) => rounded >= Number(item.min_score) && rounded <= Number(item.max_score));
  return scale?.grade ?? GRADE_NOT_ENTERED;
}

// ค่าคะแนนของเกรด (คอลัมน์ "ค่าคะแนน" ในไฟล์ Excel) — เกรดที่ไม่อยู่ในเกณฑ์ เช่น I/W/F ได้ null
export function gradePointOf(grade: string, scales: Pick<GradeScale, 'grade' | 'grade_point'>[]) {
  if (!grade || grade === GRADE_NOT_ENTERED || grade === GRADE_INCOMPLETE) return null;
  const scale = scales.find((item) => item.grade === grade);
  if (!scale || scale.grade_point === null || scale.grade_point === undefined) return null;
  const point = Number(scale.grade_point);
  return Number.isFinite(point) ? point : null;
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
    if (row.grade_point !== null && row.grade_point !== undefined) {
      const point = Number(row.grade_point);
      if (!Number.isFinite(point) || point < 0 || point > 4) {
        return 'ค่าคะแนนต้องอยู่ระหว่าง 0 ถึง 4 (เว้นว่างได้ถ้าเกรดนั้นไม่คิดค่าคะแนน)';
      }
    }
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

// เรียงช่องคะแนนตามลำดับหมวด แล้วตามลำดับในหมวด (ใช้ร่วมกันทั้งหน้ากรอกคะแนนและไฟล์ export)
export function orderComponents(categories: ScoreCategory[], components: ScoreComponent[]) {
  const grouped = componentsByKind(categories, components);
  const sorted = categories.slice().sort((a, b) => a.sort_order - b.sort_order);
  const kinds = sorted.map((category) => category.kind).filter((kind, index, all) => all.indexOf(kind) === index);
  const order: ScoreCategoryKind[] = kinds.length > 0 ? kinds : ['coursework', 'attendance', 'midterm', 'final'];
  return order.flatMap((kind) => grouped[kind] ?? []);
}

export function calculateTotalsForStudent({
  categories,
  components,
  scores,
  scales,
  specialStatus = null,
}: {
  studentId?: string;
  categories: ScoreCategory[];
  components: ScoreComponent[];
  scores: StudentScore[];
  scales: GradeScale[];
  specialStatus?: SpecialStatus | null;
}): GradeTotals {
  const grouped = componentsByKind(categories, components);

  // เก็บ null ไว้ตามจริง (ไม่แปลงเป็น 0) เพราะต้องแยก "ยังไม่กรอก" ออกจาก "กรอก 0" เพื่อคิดเกรด I
  const scoreByComponent = new Map<string, number | null>();
  for (const score of scores) {
    const raw = score.score === null || score.score === undefined ? null : Number(score.score);
    scoreByComponent.set(score.score_component_id, raw !== null && Number.isFinite(raw) ? raw : null);
  }

  const valueOf = (component: ScoreComponent) => scoreByComponent.get(component.id) ?? null;

  // คิดคะแนนแต่ละหมวดแบบเทียบสัดส่วน: (ผลรวมดิบ / ผลรวมคะแนนเต็มของช่องในหมวด) x เพดานหมวด
  // ตรงกับสูตรในไฟล์ Excel ทั้ง เฉลี่ย = Total/70x50 และ Midterm = ดิบ/30x10
  // ถ้าผลรวมช่องเท่ากับเพดานหมวดพอดี (attendance 10, final 30) ผลลัพธ์เท่าคะแนนดิบ ไม่มีการย่อ
  const scaledScoreOf = (kind: ScoreCategoryKind) => {
    const list = grouped[kind];
    const category = categories.find((item) => item.kind === kind) ?? null;
    const earned = list.reduce((sum, component) => {
      const value = valueOf(component);
      if (value === null) return sum;
      return sum + Math.min(Number(component.max_score), Math.max(0, value));
    }, 0);
    const rawMax = list.reduce((sum, component) => sum + Number(component.max_score), 0);
    if (!category || rawMax <= 0) return roundScore(earned, 2);
    return roundScore((earned / rawMax) * Number(category.max_score), 2);
  };

  const coursework = scaledScoreOf('coursework');
  const attendance = scaledScoreOf('attendance');
  const midterm = scaledScoreOf('midterm');
  const final = scaledScoreOf('final');
  const total = roundScore(coursework + attendance + midterm + final, 2);

  const expectedCount = components.length;
  const enteredCount = components.filter((component) => valueOf(component) !== null).length;

  // ลำดับความสำคัญ: สถานะพิเศษที่อาจารย์ตั้งเอง > ยังไม่กรอกเลย > กรอกไม่ครบ (I) > เกรดตามเกณฑ์
  let grade: string;
  if (specialStatus) grade = specialStatus;
  else if (expectedCount === 0 || enteredCount === 0) grade = GRADE_NOT_ENTERED;
  else if (enteredCount < expectedCount) grade = GRADE_INCOMPLETE;
  else grade = gradeOf(total, scales);

  return {
    coursework,
    attendance,
    midterm,
    final,
    total,
    grade,
    grade_point: gradePointOf(grade, scales),
    entered_count: enteredCount,
    expected_count: expectedCount,
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

// สถิติระดับห้อง: การกระจายเกรด + GPA เฉลี่ย (ตรงกับบล็อก "สรุป" ท้ายชีต MED6/MED7)
export function buildGradeStats(rows: GradeSummaryRow[], scales: Pick<GradeScale, 'grade' | 'sort_order'>[]) {
  const order = scales
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((scale) => scale.grade);

  const counts = new Map<string, number>();
  for (const grade of order) counts.set(grade, 0);
  for (const row of rows) counts.set(row.grade, (counts.get(row.grade) ?? 0) + 1);

  // เกรดในเกณฑ์แสดงเสมอแม้ยังไม่มีใครได้ (เหมือนแถว "การกระจายเกรด" ในไฟล์ Excel) ส่วน I / - / สถานะพิเศษ ต่อท้าย
  const distribution = [...counts.entries()].map(([grade, count]) => ({ grade, count }));

  const points = rows.map((row) => row.grade_point).filter((point): point is number => point !== null);
  const totals = rows.filter((row) => row.entered_count > 0).map((row) => row.total);
  const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);

  return {
    studentCount: rows.length,
    gradedCount: points.length,
    distribution,
    gpa: points.length > 0 ? roundScore(sum(points) / points.length, 2) : null,
    averageTotal: totals.length > 0 ? roundScore(sum(totals) / totals.length, 2) : null,
  };
}
