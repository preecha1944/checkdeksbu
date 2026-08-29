import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';
import { createWorkbook, autosizeColumns, styleHeader, todayStamp, workbookResponse } from '@/lib/excel';
import { buildGradeStats, buildGradeSummary, componentsByKind, orderComponents } from '@/lib/grades';
import { DEFAULT_STUDENT_CLASS_LEVEL } from '@/lib/student-input';
import type { Course, FinalGrade, GradeScale, ScoreCategory, ScoreComponent, Student, StudentScore } from '@/types/db';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: courseRaw, error: courseError } = await supabase.from('courses').select('*').eq('id', id).maybeSingle();
  if (courseError) return jsonError(courseError.message, 500);
  const course = courseRaw as unknown as Course | null;
  if (!course) return jsonError('ไม่พบรายวิชา', 404);

  const { data: studentsRaw } = await supabase.from('students').select('*').eq('status', 'active').order('student_code');
  const { data: categoriesRaw } = await supabase.from('score_categories').select('*').eq('course_id', id).order('sort_order');
  const { data: componentsRaw } = await supabase.from('score_components').select('*').eq('course_id', id).order('sort_order');
  const { data: scoresRaw } = await supabase.from('student_scores').select('*').eq('course_id', id);
  const { data: scalesRaw } = await supabase.from('grade_scales').select('*').eq('course_id', id).order('min_score', { ascending: false });
  const { data: finalRaw } = await supabase.from('final_grades').select('*').eq('course_id', id);

  const students = (studentsRaw ?? []) as unknown as Student[];
  const categories = (categoriesRaw ?? []) as unknown as ScoreCategory[];
  const components = (componentsRaw ?? []) as unknown as ScoreComponent[];
  const scores = (scoresRaw ?? []) as unknown as StudentScore[];
  const scales = (scalesRaw ?? []) as unknown as GradeScale[];
  const finalGrades = (finalRaw ?? []) as unknown as FinalGrade[];

  // ออกทุกช่องกรอกคะแนนตามลำดับหมวด (A1-A8, เข้าเรียน, ดิบ Midterm, Final ข้อ 1-3) ตามไฟล์ต้นฉบับ
  const ordered = orderComponents(categories, components);
  const grouped = componentsByKind(categories, components);
  const maxOf = (kind: ScoreCategory['kind']) => Number(categories.find((category) => category.kind === kind)?.max_score ?? 0);
  const rawMaxOf = (kind: ScoreCategory['kind']) => grouped[kind].reduce((sum, component) => sum + Number(component.max_score), 0);

  const scoreMap = new Map(scores.map((score) => [`${score.student_id}:${score.score_component_id}`, score.score]));
  const meta = new Map(finalGrades.map((row) => [row.student_id, { special_status: row.special_status, remark: row.remark }]));
  const summary = buildGradeSummary({ students, categories, components, scores, scales, finalGradeMeta: meta });
  const stats = buildGradeStats(summary, scales);

  const workbook = createWorkbook();
  const sheet = workbook.addWorksheet('Grades');
  const title = `${course.course_code ? `${course.course_code} - ` : ''}${course.course_name}`;
  const headers = [
    'ลำดับ',
    'รหัส',
    'ชื่อ-สกุล',
    'Section',
    ...ordered.map((component) => `${component.name} /${component.max_score}`),
    `Coursework /${maxOf('coursework')}`,
    `Attendance /${maxOf('attendance')}`,
    `Midterm /${maxOf('midterm')}`,
    `Final /${maxOf('final')}`,
    'Grand Total /100',
    'Grade',
    'ค่าคะแนน',
    'Special Status',
    'Remark',
  ];

  sheet.addRow([title]);
  sheet.mergeCells(1, 1, 1, headers.length);
  sheet.getRow(1).font = { bold: true, size: 14 };
  sheet.addRow(headers);
  styleHeader(sheet.getRow(2));

  summary.forEach((row, index) => {
    sheet.addRow([
      index + 1,
      row.student.student_code,
      row.student.full_name,
      row.student.class_level ?? DEFAULT_STUDENT_CLASS_LEVEL,
      ...ordered.map((component) => scoreMap.get(`${row.student.id}:${component.id}`) ?? ''),
      row.coursework,
      row.attendance,
      row.midterm,
      row.final,
      row.total,
      row.grade,
      row.grade_point ?? '',
      row.special_status ?? '',
      row.remark ?? '',
    ]);
  });

  sheet.addRow([]);
  sheet.addRow(['สรุป : จำนวนนักศึกษา', stats.studentCount]);
  sheet.addRow(['คะแนนเฉลี่ยของห้อง (Grand Total)', stats.averageTotal ?? '-']);
  sheet.addRow(['GPA เฉลี่ยของห้อง', stats.gpa ?? '-']);
  sheet.addRow(['การกระจายเกรด', ...stats.distribution.flatMap((item) => [item.grade, item.count])]);
  autosizeColumns(sheet);

  // ชีตเกณฑ์ — เทียบได้กับชีต "เกณฑ์เกรด" ในไฟล์ คิดเกรด_MEd_Section6-7.xlsx
  const scaleSheet = workbook.addWorksheet('เกณฑ์เกรด');
  scaleSheet.addRow(['ตารางที่ 1 : เกณฑ์การตัดเกรด']);
  scaleSheet.getRow(1).font = { bold: true, size: 12 };
  scaleSheet.addRow(['เกรด', 'คะแนนต่ำสุด', 'คะแนนสูงสุด', 'ค่าคะแนน']);
  styleHeader(scaleSheet.getRow(2));
  for (const scale of scales) {
    scaleSheet.addRow([scale.grade, Number(scale.min_score), Number(scale.max_score), scale.grade_point ?? '-']);
  }

  scaleSheet.addRow([]);
  const structureTitleRow = scaleSheet.addRow(['ตารางที่ 2 : โครงสร้างคะแนนเต็ม 100']);
  structureTitleRow.font = { bold: true, size: 12 };
  scaleSheet.addRow(['องค์ประกอบ', 'คะแนนดิบเต็ม', 'น้ำหนักใน 100', 'จำนวนช่องกรอก']);
  styleHeader(scaleSheet.getRow(scaleSheet.rowCount));
  for (const category of categories) {
    scaleSheet.addRow([category.name, rawMaxOf(category.kind), Number(category.max_score), grouped[category.kind].length]);
  }
  scaleSheet.addRow(['Grand Total', '-', categories.reduce((sum, category) => sum + Number(category.max_score), 0), components.length]);
  scaleSheet.addRow([]);
  scaleSheet.addRow(['หมายเหตุ : คะแนนแต่ละหมวดคิดแบบเทียบสัดส่วน (ผลรวมดิบ ÷ คะแนนดิบเต็ม × น้ำหนักใน 100)']);
  scaleSheet.addRow(['ถ้ากรอกคะแนนไม่ครบทุกช่อง ระบบจะขึ้นเกรด I อัตโนมัติ ถ้ายังไม่กรอกเลยจะขึ้น -']);
  autosizeColumns(scaleSheet);

  return workbookResponse(workbook, `course-${todayStamp()}.xlsx`);
}
