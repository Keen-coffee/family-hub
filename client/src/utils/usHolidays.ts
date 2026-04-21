/**
 * US Federal & widely-observed public holidays.
 * Returns holiday objects for a given year (or array of years).
 */

export interface Holiday {
  date: string;   // YYYY-MM-DD
  name: string;
}

/** nth weekday of month: e.g. nthWeekday(2026, 1, 1, 3) = 3rd Monday in January 2026 */
function nthWeekday(year: number, month: number, dow: number, n: number): string {
  // month is 1-based; dow: 0=Sun…6=Sat
  let count = 0;
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(year, month - 1, d);
    if (dt.getMonth() !== month - 1) break;
    if (dt.getDay() === dow) {
      count++;
      if (count === n) return fmt(dt);
    }
  }
  return '';
}

/** Last weekday of month */
function lastWeekday(year: number, month: number, dow: number): string {
  const last = new Date(year, month, 0); // last day of month
  while (last.getDay() !== dow) last.setDate(last.getDate() - 1);
  return fmt(last);
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function pad(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function getUSHolidays(years: number[]): Holiday[] {
  const holidays: Holiday[] = [];
  for (const y of years) {
    holidays.push(
      { date: pad(y, 1, 1),  name: "New Year's Day" },
      { date: nthWeekday(y, 1, 1, 3), name: 'Martin Luther King Jr. Day' },
      { date: nthWeekday(y, 2, 1, 3), name: "Presidents' Day" },
      { date: lastWeekday(y, 5, 1),   name: 'Memorial Day' },
      { date: pad(y, 6, 19), name: 'Juneteenth' },
      { date: pad(y, 7, 4),  name: 'Independence Day' },
      { date: nthWeekday(y, 9, 1, 1), name: 'Labor Day' },
      { date: nthWeekday(y, 10, 1, 2), name: 'Columbus Day' },
      { date: pad(y, 11, 11), name: 'Veterans Day' },
      { date: nthWeekday(y, 11, 4, 4), name: 'Thanksgiving Day' },
      { date: pad(y, 12, 25), name: 'Christmas Day' },
    );
  }
  return holidays;
}
