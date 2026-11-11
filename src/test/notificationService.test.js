import { formatReportTitle, formatInboxDate, formatInboxDetailDateTime } from '../utils/inboxFormat.js';

describe('HU-015 Inbox Format Utils Unit Tests', () => {
  test('formatReportTitle pad-lefts ID to 4 digits correctly', () => {
    expect(formatReportTitle(1)).toBe('Reply to your report #HR-0001');
    expect(formatReportTitle(42)).toBe('Reply to your report #HR-0042');
    expect(formatReportTitle(1005)).toBe('Reply to your report #HR-1005');
  });

  test('formatInboxDate returns Today for current date', () => {
    const now = new Date();
    expect(formatInboxDate(now)).toBe('Today');
  });

  test('formatInboxDate returns Yesterday for yesterday date', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatInboxDate(yesterday)).toBe('Yesterday');
  });

  test('formatInboxDetailDateTime formats date and time accurately', () => {
    const now = new Date();
    const result = formatInboxDetailDateTime(now);
    expect(result).toContain('Today ·');
  });
});