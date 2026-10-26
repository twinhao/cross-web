import type { BusinessHours } from "./types/clinic.ts";

/** 公開頁統一使用臺北星期，避免 SSR 與手機時區不同而標錯今天。 */
export function taipeiWeekday(now = new Date()): string {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Taipei", weekday: "short" }).format(now);
  return ({ Sun: "週日", Mon: "週一", Tue: "週二", Wed: "週三", Thu: "週四", Fri: "週五", Sat: "週六" } as Record<string, string>)[day] ?? day;
}

function minutes(value: string): number | null {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) && value !== "24:00") return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

const clock = (value: number) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

/** 扣除休息區間；重疊、無順序或超出營業範圍的休息不會製造重複時段。 */
export function openingPeriods(hours: BusinessHours): { start: string; end: string }[] {
  if (hours.is_closed || !hours.open || !hours.close) return [];
  const start = minutes(hours.open), end = minutes(hours.close);
  // 跨日資料保留原始區間，避免改寫院所的既有跨日設定。
  if (start === null || end === null || end <= start) return [{ start: hours.open, end: hours.close }];
  let periods = [{ start, end }];
  for (const rest of hours.breaks ?? []) {
    const restStart = minutes(rest.start), restEnd = minutes(rest.end);
    if (restStart === null || restEnd === null || restEnd <= restStart) continue;
    periods = periods.flatMap((period) => {
      if (restEnd <= period.start || restStart >= period.end) return [period];
      return [
        ...(restStart > period.start ? [{ start: period.start, end: restStart }] : []),
        ...(restEnd < period.end ? [{ start: restEnd, end: period.end }] : []),
      ];
    });
  }
  return periods.map((period) => ({ start: clock(period.start), end: clock(period.end) }));
}

export function formatBusinessHours(hours: BusinessHours): string {
  const periods = openingPeriods(hours);
  return periods.length ? periods.map((period) => `${period.start}–${period.end}`).join("、") : "休息";
}
