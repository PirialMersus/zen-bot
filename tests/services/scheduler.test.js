import { describe, expect, it } from 'vitest';
import Reminder from '../../src/models/Reminder.js';
import User from '../../src/models/User.js';
import { Pointer } from '../../src/models/Pointer.js';
import { isQuietNow, getQuietEndDate } from '../../src/services/quietHours.js';
import { getNextPointerForUser } from '../../src/services/pointers.js';

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

  it('должен вычислять окончание тихих часов на следующее утро при вызове поздно вечером', () => {
    const testUser = {
      quietHours: { enabled: true, start: 23, end: 8 },
      timezone: 'UTC'
    };
    const lateEveningDate = new Date('2026-10-27T23:30:00Z');
    const expectedEndDate = new Date('2026-10-28T08:00:00Z');

    const result = getQuietEndDate(testUser, lateEveningDate);

    expect(result.toISOString()).toBe(expectedEndDate.toISOString());
  });

  it('должен вычислять окончание тихих часов на текущее утро при вызове ранним утром', () => {
    const testUser = {
      quietHours: { enabled: true, start: 23, end: 8 },
      timezone: 'UTC'
    };
    const earlyMorningDate = new Date('2026-10-28T07:15:00Z');
    const expectedEndDate = new Date('2026-10-28T08:00:00Z');

    const result = getQuietEndDate(testUser, earlyMorningDate);

    expect(result.toISOString()).toBe(expectedEndDate.toISOString());
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

describe('Рандомные напоминания — фильтр по тегу тишина', () => {
  it('должен возвращать только указатели с тегом тишина для рандомного напоминания', async () => {
    await Pointer.create({ text: 'Тишина для напоминания', tags: ['тишина'], isActive: true });
    await Pointer.create({ text: 'Практика — не для напоминания', tags: ['практика'], isActive: true });
    await Pointer.create({ text: 'Без тега — не для напоминания', tags: [], isActive: true });

    const telegramUserId = 55500001;
    await User.create({ telegramId: telegramUserId });

    const pointer = await getNextPointerForUser(telegramUserId, 'тишина');

    expect(pointer).not.toBeNull();
    expect(pointer.tags).toContain('тишина');
    expect(pointer.text).toBe('Тишина для напоминания');
  });

  it('не должен возвращать указатель, если нет ни одного с тегом тишина', async () => {
    await Pointer.create({ text: 'Только практика', tags: ['практика'], isActive: true });
    await Pointer.create({ text: 'Без тегов вообще', tags: [], isActive: true });

    const telegramUserId = 55500002;
    await User.create({ telegramId: telegramUserId });

    const pointer = await getNextPointerForUser(telegramUserId, 'тишина');

    expect(pointer).toBeNull();
  });

  it('рандомное напоминание без тишина-указателей не должно подменять текст напоминания', async () => {
    await Pointer.create({ text: 'Любой активный без тишины', tags: ['практика'], isActive: true });

    const telegramUserId = 55500003;
    const fixedReminderText = 'Мой фиксированный текст напоминания';

    await User.create({ telegramId: telegramUserId });

    const pointer = await getNextPointerForUser(telegramUserId, 'тишина');

    const actualMessageText = pointer
      ? (pointer.source ? `${pointer.text}\n\n— ${pointer.source}` : pointer.text)
      : fixedReminderText;

    expect(actualMessageText).toBe(fixedReminderText);
  });

  it('должен чередовать указатели с тегом тишина без повторов', async () => {
    await Pointer.create({ text: 'Тишина X', tags: ['тишина'], isActive: true });
    await Pointer.create({ text: 'Тишина Y', tags: ['тишина'], isActive: true });

    const telegramUserId = 55500004;
    await User.create({ telegramId: telegramUserId });

    const firstPointer = await getNextPointerForUser(telegramUserId, 'тишина');
    const secondPointer = await getNextPointerForUser(telegramUserId, 'тишина');

    expect(firstPointer).not.toBeNull();
    expect(secondPointer).not.toBeNull();
    expect(firstPointer.tags).toContain('тишина');
    expect(secondPointer.tags).toContain('тишина');
    expect(firstPointer.text).not.toBe(secondPointer.text);
  });
});
