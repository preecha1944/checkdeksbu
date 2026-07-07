export type ClassValue = string | number | null | boolean | undefined;

/**
 * รวม className หลายค่าเข้าด้วยกัน ตัดค่า falsy ทิ้ง (ไม่ใช้ clsx เพื่อไม่เพิ่ม dependency)
 */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}
