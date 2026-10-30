import { describe, expect, it } from 'vitest';
import {
  handleQuietToggle,
  handleSettings,
  handleTimezoneMenu,
  handleTimezoneRegion,
  handleTimezoneSet
} from '../../src/handlers/settings/quietHours.js';
import User from '../../src/models/User.js';
import Reminder from '../../src/models/Reminder.js';
import { createMockContext } from '../helpers/mockContext.js';

describe('Настройки пользователя (Settings)', () => {
  it('должен отображать настройки пользователя по умолчанию', async () => {
    const telegramUserId = 33445566;
    const mockContext = createMockContext({ userId: telegramUserId });

    await handleSettings(mockContext);

    expect(mockContext.reply).toHaveBeenCalled();
    const replyMessage = mockContext.reply.mock.calls[0][0];
    expect(replyMessage).toContain('Тихие часы');
    expect(replyMessage).toContain('Часовой пояс');
  });

  it('должен переключать флаг тихих часов', async () => {
    const telegramUserId = 33445566;
    await User.create({
      telegramId: telegramUserId,
      quietHours: { enabled: true, start: 23, end: 8 }
    });

    const mockContext = createMockContext({
      userId: telegramUserId,
      callbackData: 'settings:quiet_toggle'
    });

    await handleQuietToggle(mockContext);

    const updatedUser = await User.findOne({ telegramId: telegramUserId });
    expect(updatedUser.quietHours.enabled).toBe(false);
  });

  it('должен сбрасывать время ожидания напоминаний при выключении тихих часов', async () => {
    const telegramUserId = 77889900;
    const nowHour = new Date().getUTCHours();
    const quietStart = (nowHour + 23) % 24;
    const quietEnd = (nowHour + 3) % 24;

    await User.create({
      telegramId: telegramUserId,
      quietHours: { enabled: true, start: quietStart, end: quietEnd },
      timezone: 'UTC'
    });

    const now = new Date();
    const waitingReminder = await Reminder.create({
      userId: String(telegramUserId),
      chatId: telegramUserId,
      text: 'Ждущее утра напоминание',
      intervalMinutes: 15,
      isActive: true,
      nextRunAt: new Date(now.getTime() + 30 * 60 * 1000)
    });

    const futureDaytimeDate = new Date(now.getTime() + 10 * 60 * 60 * 1000);
    const daytimeReminder = await Reminder.create({
      userId: String(telegramUserId),
      chatId: telegramUserId,
      text: 'Далекое напоминание',
      intervalMinutes: 1440,
      isActive: true,
      nextRunAt: futureDaytimeDate
    });

    const mockContext = createMockContext({
      userId: telegramUserId,
      callbackData: 'settings:quiet_toggle'
    });

    await handleQuietToggle(mockContext);

    const refreshedWaitingReminder = await Reminder.findById(waitingReminder._id);
    const refreshedDaytimeReminder = await Reminder.findById(daytimeReminder._id);

    expect(refreshedWaitingReminder.nextRunAt.getTime()).toBeLessThanOrEqual(Date.now());
    expect(refreshedDaytimeReminder.nextRunAt.getTime()).toBe(futureDaytimeDate.getTime());
  });

  it('должен отображать меню выбора региона часового пояса', async () => {
    const mockContext = createMockContext({
      callbackData: 'settings:timezone'
    });

    await handleTimezoneMenu(mockContext);

    expect(mockContext.reply).toHaveBeenCalledWith(
      '🌍 Выберите регион:',
      expect.anything()
    );
  });

  it('должен отображать список городов для выбранного региона', async () => {
    const mockContext = createMockContext({
      callbackData: 'timezone:region:europe'
    });

    await handleTimezoneRegion(mockContext);

    expect(mockContext.reply).toHaveBeenCalledWith(
      '🌍 Выберите город:',
      expect.anything()
    );
  });

  it('должен сохранять выбранный часовой пояс в профиль пользователя', async () => {
    const telegramUserId = 33445566;
    await User.create({
      telegramId: telegramUserId,
      timezone: 'Europe/Minsk'
    });

    const mockContext = createMockContext({
      userId: telegramUserId,
      callbackData: 'timezone:set:Europe/Warsaw'
    });

    await handleTimezoneSet(mockContext);

    const updatedUser = await User.findOne({ telegramId: telegramUserId });
    expect(updatedUser.timezone).toBe('Europe/Warsaw');
    expect(mockContext.reply).toHaveBeenCalledWith(
      expect.stringContaining('Europe/Warsaw')
    );
  });
});
