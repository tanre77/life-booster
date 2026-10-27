export type Block = { weekday: number; startMin: number; endMin: number };
export type Busy = { startsAt: string; durationMin: number };

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function partsOf(date: Date, timeZone: string): Parts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const bag: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour,
    minute: Number(bag.minute),
    second: Number(bag.second),
  };
}

function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = partsOf(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = tzOffsetMs(guess, timeZone);
  let utc = new Date(guess.getTime() - offset);
  const offset2 = tzOffsetMs(utc, timeZone);
  if (offset2 !== offset) utc = new Date(guess.getTime() - offset2);
  return utc;
}

export function localYMD(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return localYMD(dt);
}

export function weekdayOf(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function labelDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function labelTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function hhmmToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59 || m % 30 !== 0) return null;
  return h * 60 + m;
}

export type DaySlots = { date: string; slots: string[] };

export function buildSlots(opts: {
  blocks: Block[];
  busy: Busy[];
  durationMin: number;
  timeZone: string;
  now?: Date;
  days?: number;
}): DaySlots[] {
  const now = opts.now ?? new Date();
  const days = opts.days ?? 12;
  const start = localYMDInZone(now, opts.timeZone);
  const out: DaySlots[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = shiftYmd(start, i);
    const weekday = utcWeekday(date);
    const slots: string[] = [];
    for (const block of opts.blocks) {
      if (block.weekday !== weekday) continue;
      for (let min = block.startMin; min + opts.durationMin <= block.endMin; min += 30) {
        const [y, m, d] = date.split("-").map(Number);
        const startUtc = zonedTimeToUtc(y, m, d, Math.floor(min / 60), min % 60, opts.timeZone);
        if (startUtc.getTime() < now.getTime() + 60 * 60 * 1000) continue;
        const endMs = startUtc.getTime() + opts.durationMin * 60 * 1000;
        const hit = opts.busy.some((item) => {
          const bs = new Date(item.startsAt).getTime();
          const be = bs + item.durationMin * 60 * 1000;
          return startUtc.getTime() < be && endMs > bs;
        });
        if (hit) continue;
        slots.push(startUtc.toISOString());
      }
    }
    if (slots.length) out.push({ date, slots });
  }
  return out;
}

function localYMDInZone(date: Date, timeZone: string): string {
  const parts = partsOf(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function shiftYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function utcWeekday(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function asIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString();
}

export const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
