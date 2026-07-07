import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';
import { createWorkbook, autosizeColumns, styleHeader, todayStamp, workbookResponse } from '@/lib/excel';
import { buildGradeSummary, componentsByKind } from '@/lib/grades';
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
  const grouped = componentsByKind(categories, components);
  const courseworkComponents = grouped.coursework;
  const attendanceComponent = grouped.attendance[0] ?? null;
  const midtermComponent = grouped.midterm[0] ?? null;
  const finalComponent = grouped.final[0] ?? null;
  const scoreMap = new Map(scores.map((score) => [`${score.student_id}:${score.score_component_id}`, score.score]));
  const meta = new Map(finalGrades.map((row) => [row.student_id, { special_status: row.special_status, remark: row.remark }]));
  const summary = buildGradeSummary({
    students,
    categories,
    components,
    scores,
    scales,
    finalGradeMeta: meta,
  });

  const workbook = createWorkbook();
  const sheet = workbook.addWorksheet('Grades');
  const title = `${course.course_code ? `${course.course_code} - ` : ''}${course.course_name}`;
  const headers = [
    'ลำดับ',
    'รหัส',
    'ชื่อ-สกุล',
    'Section',
    ...courseworkComponents.map((component) => `${component.name} /${component.max_score}`),
    attendanceComponent ? `${attendanceComponent.name} /${attendanceComponent.max_score}` : 'Attendance',
    midtermComponent ? `${midtermComponent.name} /${midtermComponent.max_score}` : 'Midterm',
    finalComponent ? `${finalComponent.name} /${finalComponent.max_score}` : 'Final',
    'Total',
    'Grade',
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
      ...courseworkComponents.map((component) => scoreMap.get(`${row.student.id}:${component.id}`) ?? ''),
      attendanceComponent ? scoreMap.get(`${row.student.id}:${attendanceComponent.id}`) ?? '' : '',
      midtermComponent ? scoreMap.get(`${row.student.id}:${midtermComponent.id}`) ?? '' : '',
      finalComponent ? scoreMap.get(`${row.student.id}:${finalComponent.id}`) ?? '' : '',
      row.total,
      row.grade,
      row.special_status ?? '',
      row.remark ?? '',
    ]);
  });

  autosizeColumns(sheet);
  return workbookResponse(workbook, `course-${todayStamp()}.xlsx`);
}
