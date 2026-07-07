import { TZ_OFFSET } from '@/lib/constants';

/**
 * สร้าง Date object จากวันที่ + เวลา โดยตรึง timezone เป็น Asia/Bangkok (+07:00) เสมอ
 * ห้ามใช้ date/time string ตรง ๆ เทียบกันเด็ดขาด (เซิร์ฟเวอร์ Vercel รันที่ UTC)
 *
 * @param dateStr วันที่รูปแบบ YYYY-MM-DD
 * @param timeStr เวลารูปแบบ HH:mm หรือ HH:mm:ss
 */
export function atBangkok(dateStr: string, timeStr: string): Date {
  const time = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return new Date(`${dateStr}T${time}${TZ_OFFSET}`);
}

const THAI_DATE_FORMATTER = new Intl.DateTimeFormat('th-TH', {
  timeZone: 'Asia/Bangkok',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const THAI_TIME_FORMATTER = new Intl.DateTimeFormat('th-TH', {
  timeZone: 'Asia/Bangkok',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/**
 * แปลงวันที่เป็นรูปแบบไทย เช่น "7 ก.ค. 2569" (พ.ศ., เขตเวลา Asia/Bangkok)
 */
export function formatThaiDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '-';
  return THAI_DATE_FORMATTER.format(d);
}

/**
 * แปลงเวลาเป็นรูปแบบ HH:mm เขตเวลา Asia/Bangkok
 */
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '-';
  return THAI_TIME_FORMATTER.format(d);
}
