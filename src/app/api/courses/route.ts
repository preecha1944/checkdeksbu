import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAuth, jsonError } from '@/lib/api-helpers';
import { DEFAULT_CATEGORIES, DEFAULT_COMPONENTS, DEFAULT_GRADE_SCALE } from '@/lib/constants';
import type { Course, ScoreCategory } from '@/types/db';

export async function GET() {
  try {
    await requireAuth();
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ courses: (data ?? []) as unknown as Course[] });
}

export async function POST(request: Request) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const body = await request.json().catch(() => null);
  const courseName = typeof body?.course_name === 'string' ? body.course_name.trim() : '';
  const courseCode = typeof body?.course_code === 'string' ? body.course_code.trim() : null;
  const academicYear = typeof body?.academic_year === 'string' ? body.academic_year.trim() : null;
  const semester = typeof body?.semester === 'string' ? body.semester.trim() : null;

  if (!courseName) {
    return jsonError('กรุณากรอกชื่อรายวิชา');
  }

  const supabase = createServiceClient();

  // สร้างรายวิชาแล้ว seed หมวดคะแนน/component ระบบ/เกณฑ์เกรดเริ่มต้นตามลำดับ (§9.1)
  // หมายเหตุ: เป็นการ insert ต่อเนื่อง ไม่ใช่ DB transaction จริง — ถ้าขั้นตอนกลางล้มเหลว
  // รายวิชาที่สร้างแล้วอาจ setup ไม่ครบ (เคสหายากเพราะเป็นข้อมูล static ที่เราควบคุมเอง)
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .insert([
      {
        course_name: courseName,
        course_code: courseCode,
        academic_year: academicYear || '2569',
        semester: semester || '1',
        teacher_id: auth.user.id,
      },
    ])
    .select('*')
    .single();

  if (courseError || !course) {
    return jsonError(courseError?.message ?? 'สร้างรายวิชาไม่สำเร็จ', 500);
  }

  const typedCourse = course as unknown as Course;

  const { data: categories, error: catError } = await supabase
    .from('score_categories')
    .insert(
      DEFAULT_CATEGORIES.map((c) => ({
        course_id: typedCourse.id,
        name: c.name,
        max_score: c.max_score,
        kind: c.kind,
        sort_order: c.sort_order,
      }))
    )
    .select('*');

  if (catError || !categories) {
    return jsonError(catError?.message ?? 'สร้างหมวดคะแนนไม่สำเร็จ', 500);
  }

  // seed ช่องกรอกคะแนนทุกหมวดตามโครงในไฟล์ คิดเกรด_MEd_Section6-7.xlsx (รวม 12 ช่อง)
  const seedComponents = (categories as unknown as ScoreCategory[]).flatMap((c) =>
    (DEFAULT_COMPONENTS[c.kind] ?? []).map((component, index) => ({
      course_id: typedCourse.id,
      category_id: c.id,
      name: component.name,
      max_score: component.max_score,
      sort_order: index + 1,
      is_system: component.is_system,
    }))
  );

  const { error: compError } = await supabase.from('score_components').insert(seedComponents);
  if (compError) {
    return jsonError(compError.message, 500);
  }

  const { error: scaleError } = await supabase.from('grade_scales').insert(
    DEFAULT_GRADE_SCALE.map((g) => ({
      course_id: typedCourse.id,
      grade: g.grade,
      min_score: g.min_score,
      max_score: g.max_score,
      grade_point: g.grade_point,
      sort_order: g.sort_order,
    }))
  );
  if (scaleError) {
    return jsonError(scaleError.message, 500);
  }

  return NextResponse.json({ course: typedCourse }, { status: 201 });
}
