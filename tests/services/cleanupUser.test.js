import { beforeEach, describe, expect, it } from 'vitest';
import User from '../../src/models/User.js';
import Reminder from '../../src/models/Reminder.js';
import Activity from '../../src/models/Activity.js';
import { cleanupUser } from '../../src/services/cleanupUser.js';
import { clearUserCache } from '../../src/middlewares/activity.js';

describe('Очистка данных пользователя при блокировке бота (cleanupUser)', () => {
  beforeEach(() => {
    clearUserCache();
  });

  it('должен полностью удалять пользователя, его напоминания и логи активности из базы данных', async () => {
    const blockedTelegramUserId = 99112233;

    await User.create({
      telegramId: blockedTelegramUserId,
      firstName: 'Пользователь',
      username: 'blocked_user',
      language: 'ru',
      lastActivityAt: new Date()
    });

    await Reminder.create({
      userId: blockedTelegramUserId,
      chatId: blockedTelegramUserId,
      text: 'Мое напоминание',
      isActive: true,
      intervalMinutes: 60,
      nextRunAt: new Date()
    });

    await Activity.create({
      telegramId: blockedTelegramUserId,
      type: 'message'
    });

    const userBeforeCleanup = await User.findOne({ telegramId: blockedTelegramUserId });
    const remindersBeforeCleanup = await Reminder.find({ userId: blockedTelegramUserId });
    const activitiesBeforeCleanup = await Activity.find({ telegramId: blockedTelegramUserId });

    expect(userBeforeCleanup).not.toBeNull();
    expect(remindersBeforeCleanup).toHaveLength(1);
    expect(activitiesBeforeCleanup).toHaveLength(1);

    await cleanupUser(blockedTelegramUserId);

    const userAfterCleanup = await User.findOne({ telegramId: blockedTelegramUserId });
    const remindersAfterCleanup = await Reminder.find({ userId: blockedTelegramUserId });
    const activitiesAfterCleanup = await Activity.find({ telegramId: blockedTelegramUserId });

    expect(userAfterCleanup).toBeNull();
    expect(remindersAfterCleanup).toHaveLength(0);
    expect(activitiesAfterCleanup).toHaveLength(0);
  });
});
