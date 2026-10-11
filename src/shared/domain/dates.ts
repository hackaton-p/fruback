import { ensure } from './domain-error';
export function isoWeek(date: string): { year: number; week: number } {
  const value = new Date(`${date}T00:00:00Z`);
  ensure(
    Number.isFinite(value.getTime()) &&
      value.toISOString().slice(0, 10) === date,
    'Invalid calendar date',
  );
  value.setUTCDate(value.getUTCDate() + 4 - (value.getUTCDay() || 7));
  const year = value.getUTCFullYear();
  return {
    year,
    week: Math.ceil(
      ((value.getTime() - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7,
    ),
  };
}
export function weekDates(year: number, week: number): string[] {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(
    jan4.getTime() + ((week - 1) * 7 - (jan4.getUTCDay() || 7) + 1) * 86400000,
  );
  const dates = Array.from({ length: 7 }, (_, i) =>
    new Date(monday.getTime() + i * 86400000).toISOString().slice(0, 10),
  );
  ensure(
    isoWeek(dates[0]).year === year && isoWeek(dates[0]).week === week,
    'Invalid ISO week',
  );
  return dates;
}
export function decimal(value: number): string {
  ensure(
    Number.isFinite(value) && Math.abs(value) < 1e10,
    'Numeric value exceeds storage limits',
  );
  return value.toFixed(4);
}
export function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

export function nextPlanningMonday(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)!.value);
  const today = new Date(
    Date.UTC(value('year'), value('month') - 1, value('day')),
  );
  return new Date(today.getTime() + (8 - (today.getUTCDay() || 7)) * 86400000)
    .toISOString()
    .slice(0, 10);
}
