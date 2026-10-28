export const DURATIONS = [30, 60, 90, 120] as const;
export type DurationMin = (typeof DURATIONS)[number];

export const AD_DISCOUNT = 0.02;
export const MIN_HOURLY_CENTS = 1500;
export const MAX_HOURLY_CENTS = 40000;

export function isDuration(value: number): value is DurationMin {
  return (DURATIONS as readonly number[]).includes(value);
}

export function sessionPriceCents(hourlyCents: number, durationMin: number, ads: boolean): number {
  const raw = Math.round((hourlyCents * durationMin) / 60);
  if (!ads) return raw;
  return Math.round(raw * (1 - AD_DISCOUNT));
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function hoursLabel(durationMin: number): string {
  const hours = durationMin / 60;
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);
}
