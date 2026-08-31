import { describe, expect, it } from 'vitest';
import {
  handleQuietToggle,
  handleSettings,
  handleTimezoneMenu,
  handleTimezoneRegion,
  handleTimezoneSet
} from '../../src/handlers/settings/quietHours.js';
import User from '../../src/models/User.js';
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
