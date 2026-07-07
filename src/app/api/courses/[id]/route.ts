import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, requireAuth } from '@/lib/api-helpers';
import type { Course } from '@/types/db';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(request);
  } catch (e) {
    if (e instanceof NextResponse) return e;
    throw e;
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return jsonError('ข้อมูลไม่ถูกต้อง');

  const courseName = typeof body.course_name === 'string' ? body.course_name.trim() : '';
  const courseCode = typeof body.course_code === 'string' ? body.course_code.trim() : '';
  const academicYear = typeof body.academic_year === 'string' ? body.academic_year.trim() : '';
  const semester = typeof body.semester === 'string' ? body.semester.trim() : '';

  if (!courseName) return jsonError('กรุณากรอกชื่อรายวิชา');

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('courses')
    .update({
      course_code: courseCode || null,
      course_name: courseName,
      academic_year: academicYear || null,
      semester: semester || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ course: data as unknown as Course });
}
