import { isoWeek, nextPlanningMonday, weekDates } from './dates';
describe('ISO week boundaries', () => {
  it('assigns January dates to the correct ISO year', () => {
    expect(isoWeek('2021-01-01')).toEqual({ year: 2020, week: 53 });
  });
  it('rejects a nonexistent week 53', () => {
    expect(() => weekDates(2021, 53)).toThrow('Invalid ISO week');
  });
  it('rejects impossible calendar dates', () => {
    expect(() => isoWeek('2026-02-30')).toThrow('Invalid calendar date');
  });
  it.each([
    ['2026-10-11T12:00:00Z', '2026-10-12'],
    ['2026-10-12T04:59:00Z', '2026-10-12'],
    ['2026-10-12T05:00:00Z', '2026-10-19'],
    ['2026-10-14T12:00:00Z', '2026-10-19'],
    ['2026-08-31T12:00:00Z', '2026-09-07'],
    ['2026-12-28T12:00:00Z', '2027-01-04'],
  ])('resolves the next planning Monday in Peru at %s', (now, monday) => {
    expect(nextPlanningMonday(new Date(now))).toBe(monday);
  });
});
