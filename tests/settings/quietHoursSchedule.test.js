import { describe, expect, it } from 'vitest';
import {
  handleQuietHoursMenu,
  handleQuietHoursSetPreset,
  handleQuietHoursCustomPrompt,
  handleQuietHoursCustomInput
} from '../../src/handlers/settings/quietHours.js';
import User from '../../src/models/User.js';
import { createMockContext } from '../helpers/mockContext.js';

describe('Гибкая настройка тихих часов', () => {
  it('должен открывать меню расписания тихих часов с кнопками пресетов', async () => {
    const telegramUserId = 55667788;
    const mockContext = createMockContext({
      userId: telegramUserId,
      callbackData: 'settings:quiet_hours:menu'
    });

    await handleQuietHoursMenu(mockContext);

    expect(mockContext.reply).toHaveBeenCalled();
    const [replyText, replyOptions] = mockContext.reply.mock.calls[0];
    expect(replyText).toContain('Расписание тихих часов');
    const buttons = replyOptions.reply_markup.inline_keyboard.flat().map(button => button.text);
    expect(buttons.some(text => text.includes('23:00 – 08:00'))).toBe(true);
    expect(buttons.some(text => text.includes('22:00 – 07:00'))).toBe(true);
  });

  it('должен сохранять выбранный пресет тихих часов в профиль пользователя', async () => {
    const telegramUserId = 55667789;
    await User.create({
      telegramId: telegramUserId,
      quietHours: { enabled: true, start: 23, end: 8 }
    });

    const mockContext = createMockContext({
      userId: telegramUserId,
      callbackData: 'settings:quiet_hours:preset:22:7'
    });

    await handleQuietHoursSetPreset(mockContext);

    const updatedUser = await User.findOne({ telegramId: telegramUserId });
    expect(updatedUser.quietHours.start).toBe(22);
    expect(updatedUser.quietHours.end).toBe(7);
    expect(mockContext.reply).toHaveBeenCalledWith(
      expect.stringContaining('22:00–7:00'),
      expect.anything()
    );
  });

  it('должен устанавливать флаг ожидания ввода при запросе ручной настройки', async () => {
    const mockContext = createMockContext({
      callbackData: 'settings:quiet_hours:custom'
    });

    await handleQuietHoursCustomPrompt(mockContext);

    expect(mockContext.session.isSettingCustomQuietHours).toBe(true);
    expect(mockContext.reply).toHaveBeenCalledWith(
      expect.stringContaining('НАЧАЛО-КОНЕЦ'),
      expect.anything()
    );
  });

  it('должен сохранять корректный ручной ввод часов в формате 23-8', async () => {
    const telegramUserId = 55667790;
    await User.create({
      telegramId: telegramUserId,
      quietHours: { enabled: true, start: 23, end: 8 }
    });

    const mockContext = createMockContext({
      userId: telegramUserId,
      session: { isSettingCustomQuietHours: true },
      text: '00-09'
    });

    const isHandled = await handleQuietHoursCustomInput(mockContext);

    expect(isHandled).toBe(true);
    expect(mockContext.session.isSettingCustomQuietHours).toBeNull();

    const updatedUser = await User.findOne({ telegramId: telegramUserId });
    expect(updatedUser.quietHours.start).toBe(0);
    expect(updatedUser.quietHours.end).toBe(9);
  });

  it('должен отклонять некорректный ручной ввод часов и выводить сообщение об ошибке', async () => {
    const telegramUserId = 55667791;
    const mockContext = createMockContext({
      userId: telegramUserId,
      session: { isSettingCustomQuietHours: true },
      text: 'неправильное_время'
    });

    const isHandled = await handleQuietHoursCustomInput(mockContext);

    expect(isHandled).toBe(true);
    expect(mockContext.session.isSettingCustomQuietHours).toBe(true);
    expect(mockContext.reply).toHaveBeenCalledWith(
      expect.stringContaining('Пожалуйста, укажите часы в формате'),
      expect.anything()
    );
  });
});
