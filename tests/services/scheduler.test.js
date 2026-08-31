import { describe, expect, it } from 'vitest';
import Reminder from '../../src/models/Reminder.js';
import User from '../../src/models/User.js';
import { isQuietNow } from '../../src/services/quietHours.js';

describe('Планировщик и тихие часы (Scheduler & Quiet Hours)', () => {
  it('должен возвращать false, если тихие часы отключены', () => {
    const testUser = {
      quietHours: { enabled: false, start: 23, end: 8 },
      timezone: 'UTC'
    };
    const testDate = new Date('2026-08-31T02:00:00Z');

    const result = isQuietNow(testUser, testDate);

    expect(result).toBe(false);
  });

  it('должен определять активные тихие часы при переходе через полночь', () => {
    const testUser = {
      quietHours: { enabled: true, start: 23, end: 8 },
      timezone: 'UTC'
    };

    const midnightDate = new Date('2026-08-31T01:30:00Z');
    const afternoonDate = new Date('2026-08-31T14:00:00Z');

    expect(isQuietNow(testUser, midnightDate)).toBe(true);
    expect(isQuietNow(testUser, afternoonDate)).toBe(false);
  });

  it('должен корректно учитывать часовой пояс пользователя', () => {
    const testUser = {
      quietHours: { enabled: true, start: 23, end: 8 },
      timezone: 'Europe/Warsaw'
    };

    const targetDateUtc = new Date('2026-08-31T22:30:00Z');

    const result = isQuietNow(testUser, targetDateUtc);

    expect(result).toBe(true);
  });

  it('должен находить только активные напоминания, чей срок выполнения наступил', async () => {
    const currentTime = new Date();
    const pastTime = new Date(currentTime.getTime() - 60000);
    const futureTime = new Date(currentTime.getTime() + 60000);

    await Reminder.create({
      userId: '1001',
      chatId: 1001,
      text: 'Напоминание 1',
      intervalMinutes: 15,
      isActive: true,
      nextRunAt: pastTime
    });

    await Reminder.create({
      userId: '1002',
      chatId: 1002,
      text: 'Напоминание 2 (в будущем)',
      intervalMinutes: 15,
      isActive: true,
      nextRunAt: futureTime
    });

    await Reminder.create({
      userId: '1003',
      chatId: 1003,
      text: 'Напоминание 3 (на паузе)',
      intervalMinutes: 15,
      isActive: false,
      nextRunAt: pastTime
    });

    const readyReminders = await Reminder.find({
      isActive: true,
      nextRunAt: { $lte: currentTime }
    });

    expect(readyReminders.length).toBe(1);
    expect(readyReminders[0].userId).toBe('1001');
  });
});
