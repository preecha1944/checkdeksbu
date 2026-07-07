import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export function CoursePageNav({ courseId }: { courseId: string }) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      <Link href={`/courses/${courseId}/setup`}>
        <Button variant="secondary" size="sm">ตั้งค่าคะแนน</Button>
      </Link>
      <Link href={`/courses/${courseId}/entry`}>
        <Button variant="secondary" size="sm">กรอกคะแนน</Button>
      </Link>
      <Link href={`/courses/${courseId}/grades`}>
        <Button variant="secondary" size="sm">สรุปเกรด</Button>
      </Link>
    </div>
  );
}
