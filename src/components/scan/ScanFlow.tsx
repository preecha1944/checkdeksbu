'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { GraduationCap, AlertTriangle, LogIn, LogOut } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { formatTimeOfDay, formatTime } from '@/lib/time';
import { attendanceStatusTone } from '@/lib/status';
import {
  SCAN_LANGS,
  SCAN_STRINGS,
  DEFAULT_SCAN_LANG,
  normalizeScanLang,
  scanStatusLabel,
  scanErrorMessage,
  formatScanDate,
  type ScanLang,
} from '@/lib/scan-i18n';
import type { AttendanceFinalStatus } from '@/types/db';

const LANG_STORAGE_KEY = 'scan-lang';

interface SessionInfo {
  title: string;
  courseName: string | null;
  learningDate: string;
  startTime: string;
  endTime: string;
}

interface RoomOption {
  id: string;
  name: string;
}

interface LookupResult {
  student: { code: string; fullName: string };
  mode: 'checkin' | 'checkout' | 'done';
  rooms?: RoomOption[];
  autoRoom?: RoomOption | null;
  record?: {
    roomName: string | null;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    finalStatus?: AttendanceFinalStatus | null;
  };
}

interface SuccessInfo {
  type: 'checkin' | 'checkout';
  studentName: string;
  roomName: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  status: AttendanceFinalStatus | 'present' | 'late';
  durationMinutes?: number;
}

// error จาก API — เก็บทั้ง code (ให้แปลตามภาษา) และ text (ข้อความสำรองจาก server)
interface ApiErr {
  code?: string | null;
  text?: string | null;
}

type Phase = 'loading' | 'invalid' | 'entry' | 'result' | 'success';

export function ScanFlow() {
  const searchParams = useSearchParams();
  const sid = searchParams.get('sid');
  const token = searchParams.get('t');

  const [lang, setLang] = useState<ScanLang>(DEFAULT_SCAN_LANG);
  const t = SCAN_STRINGS[lang];

  const [phase, setPhase] = useState<Phase>('loading');
  const [invalidErr, setInvalidErr] = useState<ApiErr>({ code: 'MISSING_LINK' });
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);

  const [studentCode, setStudentCode] = useState('');
  const [entryLoading, setEntryLoading] = useState(false);
  const [entryError, setEntryError] = useState<ApiErr | null>(null);

  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<ApiErr | null>(null);
  const [errorKey, setErrorKey] = useState(0);

  const [success, setSuccess] = useState<SuccessInfo | null>(null);

  // phase คือขั้นตอนจริง ส่วน displayPhase คือขั้นที่กำลังแสดงอยู่บนจอ
  // ตอนเปลี่ยนขั้น เราหน่วง displayPhase ไว้ 200ms ให้การ์ดเดิมเล่น animation ออกจนจบก่อนถูกถอด
  // (ทำเองแทนการลง framer-motion เพราะต้องการแค่จังหวะเดียวนี้ ไม่คุ้มกับ 34KB บนหน้าที่นักศึกษาโหลดผ่านเน็ตมือถือ)
  const [displayPhase, setDisplayPhase] = useState<Phase>('loading');

  // ระหว่างที่ยังไม่ตรงกัน = การ์ดเดิมกำลังเล่น animation ออก จึงคิดจากสองค่านี้ได้เลย ไม่ต้องเก็บ state เพิ่ม
  const paneClass = phase === displayPhase ? 'anim-pane-in' : 'anim-pane-out';

  useEffect(() => {
    if (phase === displayPhase) return;
    const timer = setTimeout(() => setDisplayPhase(phase), 200);
    return () => clearTimeout(timer);
  }, [phase, displayPhase]);

  // โหลดภาษาที่เคยเลือกไว้ (localStorage) — ทำใน effect เพื่อไม่ให้ hydration ไม่ตรง
  useEffect(() => {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored) setLang(normalizeScanLang(stored));
  }, []);

  function changeLang(next: ScanLang) {
    setLang(next);
    window.localStorage.setItem(LANG_STORAGE_KEY, next);
  }

  const loadSessionInfo = useCallback(async () => {
    if (!sid || !token) {
      setInvalidErr({ code: 'MISSING_LINK' });
      setPhase('invalid');
      return;
    }

    const res = await fetch(`/api/attendance/session-info?sid=${sid}&t=${token}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setInvalidErr({ code: data?.code, text: data?.error });
      setPhase('invalid');
      return;
    }

    setSessionInfo(data);
    setPhase((current) => (current === 'loading' || current === 'invalid' ? 'entry' : current));
  }, [sid, token]);

  useEffect(() => {
    loadSessionInfo();
    const interval = setInterval(loadSessionInfo, 5000);
    return () => clearInterval(interval);
  }, [loadSessionInfo]);

  function resetToEntry() {
    setStudentCode('');
    setLookup(null);
    setSelectedRoomId(null);
    setEntryError(null);
    setActionError(null);
    setSuccess(null);
    setPhase('entry');
  }

  async function handleLookup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEntryError(null);
    setEntryLoading(true);

    const res = await fetch('/api/attendance/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, token, studentCode }),
    });
    const data = await res.json().catch(() => ({}));
    setEntryLoading(false);

    if (!res.ok) {
      setEntryError({ code: data?.code, text: data?.error });
      setErrorKey((n) => n + 1);
      return;
    }

    const result = data as LookupResult;
    setLookup(result);
    // preselect ห้องตาม section ประจำตัว (class_level) — นักศึกษาไม่ต้องกดเลือกเอง
    setSelectedRoomId(result.autoRoom?.id ?? null);
    setPhase('result');
  }

  async function handleCheckIn() {
    if (!lookup || !selectedRoomId) return;
    setActionError(null);
    setActionLoading(true);

    const res = await fetch('/api/attendance/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, token, studentCode, roomId: selectedRoomId }),
    });
    const data = await res.json().catch(() => ({}));
    setActionLoading(false);

    if (!res.ok) {
      setActionError({ code: data?.code, text: data?.error });
      setErrorKey((n) => n + 1);
      return;
    }

    setSuccess({
      type: 'checkin',
      studentName: lookup.student.fullName,
      roomName: data.roomName ?? null,
      checkInTime: data.checkInTime,
      status: data.status,
    });
    setPhase('success');
  }

  async function handleCheckOut() {
    if (!lookup) return;
    setActionError(null);
    setActionLoading(true);

    const res = await fetch('/api/attendance/check-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, token, studentCode }),
    });
    const data = await res.json().catch(() => ({}));
    setActionLoading(false);

    if (!res.ok) {
      setActionError({ code: data?.code, text: data?.error });
      setErrorKey((n) => n + 1);
      return;
    }

    setSuccess({
      type: 'checkout',
      studentName: lookup.student.fullName,
      roomName: lookup.record?.roomName ?? null,
      checkInTime: lookup.record?.checkInTime,
      checkOutTime: data.checkOutTime,
      status: data.finalStatus,
      durationMinutes: data.durationMinutes,
    });
    setPhase('success');
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-6">
      <div className="flex justify-end">
        <div className="inline-flex rounded-full border border-border-soft bg-white p-1">
          {SCAN_LANGS.map((option) => (
            <button
              key={option.code}
              type="button"
              onClick={() => changeLang(option.code)}
              aria-pressed={lang === option.code}
              className={cn(
                'cursor-pointer rounded-full px-3 py-1 text-sm font-medium transition-colors duration-150',
                lang === option.code
                  ? 'bg-primary text-white'
                  : 'text-ink-muted hover:bg-primary-soft'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 rounded-2xl bg-primary p-5 text-center text-white">
        <GraduationCap className="h-8 w-8" aria-hidden="true" />
        {sessionInfo ? (
          <>
            <p className="font-[family-name:var(--font-heading)] text-lg font-semibold">{sessionInfo.title}</p>
            {sessionInfo.courseName && <p className="text-sm text-white/80">{sessionInfo.courseName}</p>}
            <p className="text-sm text-white/80">
              {formatScanDate(sessionInfo.learningDate, lang)} · {formatTimeOfDay(sessionInfo.startTime)} -{' '}
              {formatTimeOfDay(sessionInfo.endTime)}
            </p>
          </>
        ) : (
          <p className="text-sm text-white/80">{t.headerFallback}</p>
        )}
      </div>

      {displayPhase === 'loading' && (
        <div className={paneClass}>
          <Card className="text-center text-sm text-ink-muted">{t.loading}</Card>
        </div>
      )}

      {displayPhase === 'invalid' && (
        <div className={paneClass}>
          <Card className="flex flex-col items-center gap-3 text-center">
            <AlertTriangle className="h-10 w-10 text-danger" aria-hidden="true" />
            <p className="text-sm text-ink">{scanErrorMessage(invalidErr.code, invalidErr.text, lang)}</p>
          </Card>
        </div>
      )}

      {displayPhase === 'entry' && (
        <div className={paneClass}>
        <Card>
          <form onSubmit={handleLookup} className="flex flex-col gap-4">
            <Field label={t.entryLabel} htmlFor="studentCode" required hint={t.entryHint}>
              <Input
                id="studentCode"
                inputMode="numeric"
                autoFocus
                required
                className="h-14 text-center text-lg tracking-wider"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
              />
            </Field>

            {entryError && (
              <div key={errorKey} className="anim-shake rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
                {scanErrorMessage(entryError.code, entryError.text, lang)}
              </div>
            )}

            <Button type="submit" size="lg" loading={entryLoading} className="w-full">
              {t.entrySubmit}
            </Button>
          </form>
        </Card>
        </div>
      )}

      {displayPhase === 'result' && lookup && (
        <div className={paneClass}>
        <Card className="flex flex-col gap-4">
          <div className="rounded-xl bg-primary-soft p-4 text-center">
            <p className="text-xs text-ink-muted">{t.studentFound}</p>
            <p className="mt-1 text-sm text-ink-muted">{t.studentIdLabel} {lookup.student.code}</p>
            <p className="font-[family-name:var(--font-heading)] text-lg font-semibold text-ink">
              {lookup.student.fullName}
            </p>
          </div>

          {lookup.mode === 'checkin' && (
            <>
              {lookup.autoRoom ? (
                // section ประจำตัว (class_level) — ระบบเลือกให้อัตโนมัติ ไม่ต้องกดเลือกเอง
                <div className="rounded-xl bg-primary-soft p-4 text-center">
                  <p className="text-xs text-ink-muted">{t.yourSection}</p>
                  <p className="mt-1 font-[family-name:var(--font-heading)] text-lg font-semibold text-primary-deep">
                    {lookup.autoRoom.name}
                  </p>
                </div>
              ) : (
                // fallback: section ประจำตัวไม่มีในรอบนี้ → ให้เลือกห้องเอง
                <div>
                  <p className="mb-2 text-sm font-medium text-ink">{t.chooseRoom}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(lookup.rooms ?? []).map((room) => {
                      const selected = selectedRoomId === room.id;
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => setSelectedRoomId(room.id)}
                          className={cn(
                            'flex h-14 cursor-pointer items-center justify-center rounded-xl border text-base font-semibold',
                            // บนมือถือไม่มี hover สถานะกดจึงเป็น feedback อย่างเดียวที่นักศึกษาได้
                            'transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.955]',
                            selected
                              ? 'border-primary bg-primary text-white'
                              : 'border-border-soft bg-white text-ink hover:bg-primary-soft'
                          )}
                        >
                          {room.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {actionError && (
                <div key={errorKey} className="anim-shake rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
                  {scanErrorMessage(actionError.code, actionError.text, lang)}
                </div>
              )}

              <Button
                size="lg"
                className="w-full bg-success hover:bg-green-700"
                disabled={!selectedRoomId}
                loading={actionLoading}
                onClick={handleCheckIn}
              >
                <LogIn className="h-5 w-5" aria-hidden="true" />
                {t.checkIn}
              </Button>

              <button
                type="button"
                onClick={resetToEntry}
                className="cursor-pointer text-center text-sm text-ink-muted underline-offset-2 hover:underline"
              >
                {t.notMe}
              </button>
            </>
          )}

          {lookup.mode === 'checkout' && (
            <>
              <div className="rounded-xl border border-border-soft p-4 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">{t.roomLabel}</span>
                  <span className="font-medium text-ink">{lookup.record?.roomName ?? '-'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">{t.checkInTimeLabel}</span>
                  <span className="font-medium text-ink">{formatTime(lookup.record?.checkInTime)}</span>
                </div>
              </div>

              {actionError && (
                <div key={errorKey} className="anim-shake rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
                  {scanErrorMessage(actionError.code, actionError.text, lang)}
                </div>
              )}

              <Button
                size="lg"
                variant="danger"
                className="w-full"
                loading={actionLoading}
                onClick={handleCheckOut}
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                {t.checkOut}
              </Button>
            </>
          )}

          {lookup.mode === 'done' && (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-border-soft p-4 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">{t.roomLabel}</span>
                  <span className="font-medium text-ink">{lookup.record?.roomName ?? '-'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">{t.checkInTimeLabel}</span>
                  <span className="font-medium text-ink">{formatTime(lookup.record?.checkInTime)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">{t.checkOutTimeLabel}</span>
                  <span className="font-medium text-ink">{formatTime(lookup.record?.checkOutTime)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">{t.statusLabel}</span>
                  <Badge tone={attendanceStatusTone(lookup.record?.finalStatus)}>
                    {scanStatusLabel(lookup.record?.finalStatus, lang)}
                  </Badge>
                </div>
              </div>
              <p className="text-center text-sm text-ink-muted">{t.doneMessage}</p>
            </div>
          )}
        </Card>
        </div>
      )}

      {displayPhase === 'success' && success && (
        <div className={paneClass}>
        <Card className="flex flex-col items-center gap-3 text-center">
          {/* วาดเส้นถูกจากซ้ายไปขวาเหมือนคนเซ็นชื่อ — สื่อว่า "ระบบบันทึกให้แล้ว" ไม่ใช่แค่ "แสดงผลสำเร็จ" */}
          <svg viewBox="0 0 52 52" className="anim-ring-pop h-16 w-16" role="img" aria-label={t.checkinSuccess}>
            <circle cx="26" cy="26" r="23" fill="none" stroke="currentColor" strokeWidth="5" className="text-success opacity-20" />
            <path
              d="M15 27 L23 34 L38 19"
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="anim-check-draw text-success"
            />
          </svg>
          <p
            className="anim-fade-up font-[family-name:var(--font-heading)] text-lg font-semibold text-ink"
            style={{ animationDelay: '300ms' }}
          >
            {success.type === 'checkin' ? t.checkinSuccess : t.checkoutSuccess}
          </p>
          <div className="anim-stagger w-full rounded-xl border border-border-soft p-4 text-left text-sm">
            <div className="anim-fade-up flex justify-between py-1">
              <span className="text-ink-muted">{t.nameLabel}</span>
              <span className="font-medium text-ink">{success.studentName}</span>
            </div>
            <div className="anim-fade-up flex justify-between py-1">
              <span className="text-ink-muted">{t.roomLabel}</span>
              <span className="font-medium text-ink">{success.roomName ?? '-'}</span>
            </div>
            {success.type === 'checkin' && (
              <div className="anim-fade-up flex justify-between py-1">
                <span className="text-ink-muted">{t.checkInTimeLabel}</span>
                <span className="font-medium text-ink">{formatTime(success.checkInTime)}</span>
              </div>
            )}
            {success.type === 'checkout' && (
              <>
                <div className="anim-fade-up flex justify-between py-1">
                  <span className="text-ink-muted">{t.checkOutTimeLabel}</span>
                  <span className="font-medium text-ink">{formatTime(success.checkOutTime)}</span>
                </div>
                <div className="anim-fade-up flex justify-between py-1">
                  <span className="text-ink-muted">{t.durationLabel}</span>
                  <span className="font-medium text-ink">
                    {success.durationMinutes ?? 0} {t.minutesUnit}
                  </span>
                </div>
              </>
            )}
            <div className="anim-fade-up flex justify-between py-1">
              <span className="text-ink-muted">{t.statusLabel}</span>
              <Badge tone={attendanceStatusTone(success.status as AttendanceFinalStatus)}>
                {scanStatusLabel(success.status, lang)}
              </Badge>
            </div>
          </div>

          <button
            type="button"
            onClick={resetToEntry}
            className="cursor-pointer text-sm text-primary underline-offset-2 hover:underline"
          >
            {t.finish}
          </button>
        </Card>
        </div>
      )}
    </div>
  );
}
