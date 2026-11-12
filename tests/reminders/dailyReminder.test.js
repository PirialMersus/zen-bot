import { describe, expect, it } from 'vitest';
import { handleIntervalInput } from '../../src/handlers/reminders.js';
import { calculateDailyNextRun } from '../../src/services/scheduler.js';
import { formatInterval } from '../../src/services/remindersFormat.js';
import { createMockContext } from '../helpers/mockContext.js';

describe('Ежедневные напоминания по времени ЧЧ:ММ', () => {
  it('должен распознавать формат времени 09:00 и переводить на шаг автоудаления', async () => {
    const mockContext = createMockContext({
      session: {
        reminderStep: 'INTERVAL',
        creatingReminder: { text: 'Утренняя зарядка' }
      },
      message: { text: '09:00' }
    });

    const isHandled = await handleIntervalInput(mockContext);

    expect(isHandled).toBe(true);
    expect(mockContext.session.creatingReminder.type).toBe('daily');
    expect(mockContext.session.creatingReminder.targetTime).toBe('09:00');
    expect(mockContext.session.creatingReminder.intervalMinutes).toBe(1440);
    expect(mockContext.session.reminderStep).toBe('AUTO_DELETE');
  });

  it('должен рассчитывать время следующего запуска на завтра, если время уже прошло сегодня', () => {
    const fromDate = new Date('2026-11-11T12:00:00.000Z');
    const targetTime = '09:00';
    const nextRun = calculateDailyNextRun(targetTime, 'UTC', fromDate);

    expect(nextRun.toISOString()).toBe('2026-11-12T09:00:00.000Z');
  });

  it('должен рассчитывать время следующего запуска на сегодня, если время еще не наступило', () => {
    const fromDate = new Date('2026-11-11T07:00:00.000Z');
    const targetTime = '09:00';
    const nextRun = calculateDailyNextRun(targetTime, 'UTC', fromDate);

    expect(nextRun.toISOString()).toBe('2026-11-11T09:00:00.000Z');
  });

  it('должен корректно форматировать текст интервала для daily напоминания', () => {
    const reminder = {
      type: 'daily',
      targetTime: '09:00',
      intervalMinutes: 1440
    };

    expect(formatInterval(reminder, 'ru')).toBe('Каждый день в 09:00 ⌛');
    expect(formatInterval(reminder, 'en')).toBe('Every day at 09:00 ⌛');
  });
});
