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

/**
 * แปลงวันที่แบบ date-only (YYYY-MM-DD จากคอลัมน์ learning_date) เป็นรูปแบบไทย เช่น "7 ก.ค. 2569"
 * ตรึง timezone +07:00 เสมอเพื่อไม่ให้วันที่คลาดเคลื่อนตอน format
 */
export function formatThaiDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return formatThaiDate(atBangkok(dateStr, '00:00'));
}

/**
 * แปลงคอลัมน์ time (เช่น "09:00:00") เป็น "09:00" สำหรับแสดงผล — ไม่เกี่ยวกับ timezone เพราะเป็น wall-clock time อยู่แล้ว
 */
export function formatTimeOfDay(timeStr: string | null | undefined): string {
  if (!timeStr) return '-';
  return timeStr.slice(0, 5);
}

/**
 * แปลง timestamptz (ISO) เป็นค่าสำหรับ <input type="datetime-local"> โดยแสดงเป็นเวลาไทย (Asia/Bangkok)
 */
export function toBangkokDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
}

/**
 * แปลงค่าจาก <input type="datetime-local"> (สมมติว่าเป็นเวลาไทยเสมอ) กลับเป็น ISO string (UTC) สำหรับส่งเข้า API
 */
export function fromBangkokDateTimeLocal(value: string | null | undefined): string | null {
  if (!value || value.length < 16) return null;
  return atBangkok(value.slice(0, 10), value.slice(11, 16)).toISOString();
}
