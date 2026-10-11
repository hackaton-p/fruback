import { isoWeek, weekDates } from './dates';
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
});
