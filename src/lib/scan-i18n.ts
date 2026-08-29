// คำแปลเฉพาะหน้าสแกนของนักศึกษา (/scan) — รองรับ English / 中文 / ไทย
// ค่าเริ่มต้น = English ตามที่ต้องการให้หน้าสแกนเป็นภาษาอังกฤษ
// ครอบคลุม 3 แหล่งข้อความ: UI static, label สถานะ, และ error code ที่ API ส่งกลับมา

import type { AttendanceFinalStatus } from '@/types/db';

export type ScanLang = 'en' | 'zh' | 'th';

export const SCAN_LANGS: { code: ScanLang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中文' },
  { code: 'th', label: 'ไทย' },
];

export const DEFAULT_SCAN_LANG: ScanLang = 'en';

export function normalizeScanLang(value: string | null | undefined): ScanLang {
  return value === 'en' || value === 'zh' || value === 'th' ? value : DEFAULT_SCAN_LANG;
}

interface ScanStrings {
  headerFallback: string;
  loading: string;
  entryLabel: string;
  entryHint: string;
  entrySubmit: string;
  entryErrorFallback: string;
  studentFound: string;
  studentIdLabel: string;
  chooseRoom: string;
  yourSection: string;
  roomLabel: string;
  checkInTimeLabel: string;
  checkOutTimeLabel: string;
  statusLabel: string;
  nameLabel: string;
  durationLabel: string;
  minutesUnit: string;
  checkIn: string;
  checkOut: string;
  notMe: string;
  doneMessage: string;
  checkinSuccess: string;
  checkoutSuccess: string;
  finish: string;
  actionErrorFallback: string;
}

export const SCAN_STRINGS: Record<ScanLang, ScanStrings> = {
  en: {
    headerFallback: 'Scan the QR code to check in / out of class',
    loading: 'Loading...',
    entryLabel: 'Enter your student ID',
    entryHint: 'e.g. 66123456789',
    entrySubmit: 'Verify',
    entryErrorFallback: 'No data found. Please try again.',
    studentFound: 'Student found',
    studentIdLabel: 'Student ID',
    chooseRoom: 'Select the room you are attending',
    yourSection: 'Your section',
    roomLabel: 'Room',
    checkInTimeLabel: 'Check-in time',
    checkOutTimeLabel: 'Check-out time',
    statusLabel: 'Status',
    nameLabel: 'Name',
    durationLabel: 'Class duration',
    minutesUnit: 'min',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    notMe: 'Not you? Enter a different ID',
    doneMessage: 'You have completed attendance for this session',
    checkinSuccess: 'Check-in successful',
    checkoutSuccess: 'Check-out successful',
    finish: 'Done (let the next person check in)',
    actionErrorFallback: 'Something went wrong. Please try again.',
  },
  zh: {
    headerFallback: '扫描二维码进行上课签到 / 签退',
    loading: '加载中...',
    entryLabel: '请输入学号',
    entryHint: '例如 66123456789',
    entrySubmit: '查询',
    entryErrorFallback: '未找到数据，请重试。',
    studentFound: '已找到学生信息',
    studentIdLabel: '学号',
    chooseRoom: '请选择上课的教室',
    yourSection: '你的班级 (Section)',
    roomLabel: '教室',
    checkInTimeLabel: '签到时间',
    checkOutTimeLabel: '签退时间',
    statusLabel: '状态',
    nameLabel: '姓名',
    durationLabel: '上课时长',
    minutesUnit: '分钟',
    checkIn: '签到',
    checkOut: '签退',
    notMe: '不是你？重新输入学号',
    doneMessage: '你已完成本节课的签到签退',
    checkinSuccess: '签到成功',
    checkoutSuccess: '签退成功',
    finish: '完成（让下一位签到）',
    actionErrorFallback: '出现错误，请重试。',
  },
  th: {
    headerFallback: 'สแกน QR เพื่อเข้า/ออกชั่วโมงเรียน',
    loading: 'กำลังโหลดข้อมูล...',
    entryLabel: 'กรอกรหัสนักศึกษา',
    entryHint: 'เช่น 66123456789',
    entrySubmit: 'ตรวจสอบข้อมูล',
    entryErrorFallback: 'ไม่พบข้อมูล กรุณาลองใหม่',
    studentFound: 'ระบบพบข้อมูลนักศึกษา',
    studentIdLabel: 'รหัสนักศึกษา',
    chooseRoom: 'กรุณาเลือกห้องที่เข้าเรียน',
    yourSection: 'Section ของคุณ',
    roomLabel: 'ห้องเรียน',
    checkInTimeLabel: 'เวลา Check-in',
    checkOutTimeLabel: 'เวลา Check-out',
    statusLabel: 'สถานะ',
    nameLabel: 'ชื่อ-สกุล',
    durationLabel: 'ระยะเวลาเรียน',
    minutesUnit: 'นาที',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    notMe: 'ไม่ใช่ฉัน? กรอกรหัสใหม่',
    doneMessage: 'คุณเช็คชื่อรอบเรียนนี้ครบแล้ว',
    checkinSuccess: 'Check-in สำเร็จ',
    checkoutSuccess: 'Check-out สำเร็จ',
    finish: 'เสร็จสิ้น (ให้คนถัดไปเช็คชื่อ)',
    actionErrorFallback: 'เกิดข้อผิดพลาด กรุณาลองใหม่',
  },
};

// label สถานะการเข้าเรียนแยกตามภาษา (tone ใช้ตัวเดิมจาก lib/status.ts เพราะไม่ขึ้นกับภาษา)
const STATUS_LABELS: Record<ScanLang, Record<AttendanceFinalStatus, string>> = {
  en: {
    present: 'Present',
    late: 'Late',
    absent: 'Absent',
    early_leave: 'Left early',
    incomplete: 'Incomplete',
    leave: 'On leave',
  },
  zh: {
    present: '出勤',
    late: '迟到',
    absent: '缺勤',
    early_leave: '早退',
    incomplete: '未完成',
    leave: '请假',
  },
  th: {
    present: 'มาเรียน',
    late: 'มาสาย',
    absent: 'ขาดเรียน',
    early_leave: 'ออกก่อนเวลา',
    incomplete: 'เช็คชื่อไม่สมบูรณ์',
    leave: 'ลา',
  },
};

export function scanStatusLabel(
  status: AttendanceFinalStatus | 'present' | 'late' | null | undefined,
  lang: ScanLang
): string {
  if (!status) return '-';
  return STATUS_LABELS[lang][status as AttendanceFinalStatus] ?? status;
}

// ข้อความ error ตาม code ที่ API ส่งกลับมา (ดู jsonError / QrValidationError)
const ERROR_MESSAGES: Record<string, Record<ScanLang, string>> = {
  MISSING_LINK: {
    en: 'Invalid link. Please scan the QR code again from the classroom screen.',
    zh: '链接无效，请重新扫描教室屏幕上的二维码。',
    th: 'ลิงก์ไม่ถูกต้อง กรุณาสแกน QR ใหม่จากหน้าจอในห้องเรียน',
  },
  BAD_REQUEST: {
    en: 'Invalid data.',
    zh: '数据无效。',
    th: 'ข้อมูลไม่ถูกต้อง',
  },
  INVALID_QR: {
    en: 'Invalid QR code.',
    zh: '二维码无效。',
    th: 'QR Code ไม่ถูกต้อง',
  },
  QR_EXPIRED: {
    en: 'QR code expired. Please scan the new QR code on the screen.',
    zh: '二维码已过期，请扫描屏幕上的新二维码。',
    th: 'QR Code หมดอายุ กรุณาสแกน QR ใหม่จากหน้าจอ',
  },
  SESSION_CLOSED: {
    en: 'This session is closed. Attendance is no longer available.',
    zh: '本节课已关闭，无法签到。',
    th: 'รอบเรียนปิดแล้ว ไม่สามารถเช็คชื่อได้',
  },
  MISSING_STUDENT_CODE: {
    en: 'Please enter your student ID.',
    zh: '请输入学号。',
    th: 'กรุณากรอกรหัสนักศึกษา',
  },
  MISSING_ROOM: {
    en: 'Please select a room.',
    zh: '请选择教室。',
    th: 'กรุณาเลือกห้องเรียน',
  },
  STUDENT_NOT_FOUND: {
    en: 'Student ID not found. Please check again.',
    zh: '未找到该学号，请重新检查。',
    th: 'ไม่พบรหัสนักศึกษา กรุณาตรวจสอบอีกครั้ง',
  },
  INVALID_ROOM: {
    en: 'Invalid room.',
    zh: '教室无效。',
    th: 'ห้องเรียนไม่ถูกต้อง',
  },
  ALREADY_CHECKED_IN: {
    en: 'You have already checked in.',
    zh: '你已经签到过了。',
    th: 'คุณได้ Check-in ไปแล้ว',
  },
  CHECKIN_FAILED: {
    en: 'Check-in failed. Please try again.',
    zh: '签到失败，请重试。',
    th: 'บันทึกการเช็คชื่อไม่สำเร็จ กรุณาลองใหม่',
  },
  CHECKIN_REQUIRED: {
    en: 'Please check in first.',
    zh: '请先签到。',
    th: 'กรุณา Check-in ก่อน',
  },
  ALREADY_CHECKED_OUT: {
    en: 'You have already checked out.',
    zh: '你已经签退过了。',
    th: 'คุณได้ Check-out ไปแล้ว',
  },
  CHECKOUT_FAILED: {
    en: 'Check-out failed. Please try again.',
    zh: '签退失败，请重试。',
    th: 'บันทึกการเช็คออกไม่สำเร็จ กรุณาลองใหม่',
  },
};

/**
 * แปลง error จาก API เป็นข้อความตามภาษา
 * - มี code ที่รู้จัก → ใช้คำแปลตามภาษา
 * - ไม่มี code → ใช้ fallback (ข้อความจาก server) หรือข้อความสำรอง
 */
export function scanErrorMessage(
  code: string | null | undefined,
  fallback: string | null | undefined,
  lang: ScanLang
): string {
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code][lang];
  return fallback ?? SCAN_STRINGS[lang].actionErrorFallback;
}

const DATE_LOCALE: Record<ScanLang, string> = {
  en: 'en-GB',
  zh: 'zh-CN',
  th: 'th-TH',
};

/**
 * ฟอร์แมตวันที่เรียน (YYYY-MM-DD) ตามภาษา ตรึงเขตเวลา Asia/Bangkok
 * en → "7 Jul 2026", zh → "2026年7月7日", th → "7 ก.ค. 2569"
 */
export function formatScanDate(dateStr: string | null | undefined, lang: ScanLang): string {
  if (!dateStr) return '-';
  const d = new Date(`${dateStr}T00:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat(DATE_LOCALE[lang], {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}
