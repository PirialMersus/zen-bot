import { describe, expect, it, vi } from 'vitest';
import { TEXTS } from '../../src/constants/texts.js';
import { handleBack } from '../../src/handlers/back.js';
import { handleStart, handleHelp } from '../../src/handlers/menu.js';
import { registerBotCommands } from '../../src/bot.js';
import { REMINDER_STEP } from '../../src/handlers/reminders.js';
import { createMockContext } from '../helpers/mockContext.js';
import User from '../../src/models/User.js';

describe('Главное меню и навигация', () => {
  it('должен отправлять приветственное сообщение и карточку онбординга часового пояса при вызове handleStart без параметров', async () => {
    const mockContext = createMockContext();

    await handleStart(mockContext);

    expect(mockContext.reply).toHaveBeenCalledTimes(2);
    expect(mockContext.reply.mock.calls[0][0]).toBe(TEXTS.MENU.START);
    expect(mockContext.reply.mock.calls[1][0]).toContain('Europe/Minsk');
    expect(mockContext.reply.mock.calls[1][0]).toContain('23:00–08:00');
    expect(
      mockContext.reply.mock.calls[1][1].reply_markup.inline_keyboard[0][0].callback_data
    ).toBe('settings:timezone');
  });

  it('должен отображать кастомный часовой пояс и кастомные тихие часы в карточке онбординга', async () => {
    const customUserTelegramIdentifier = 87654321;
    await User.create({
      telegramId: customUserTelegramIdentifier,
      timezone: 'Europe/Kyiv',
      quietHours: {
        enabled: true,
        start: 23,
        end: 7
      }
    });

    const mockContext = createMockContext({
      from: { id: customUserTelegramIdentifier }
    });

    await handleStart(mockContext);

    expect(mockContext.reply).toHaveBeenCalledTimes(2);
    expect(mockContext.reply.mock.calls[1][0]).toContain('Europe/Kyiv');
    expect(mockContext.reply.mock.calls[1][0]).toContain('23:00–07:00');
  });

  it('должен отображать статус отключенных тихих часов в карточке онбординга', async () => {
    const disabledQuietHoursUserTelegramIdentifier = 98765432;
    await User.create({
      telegramId: disabledQuietHoursUserTelegramIdentifier,
      timezone: 'Europe/Warsaw',
      quietHours: {
        enabled: false,
        start: 23,
        end: 8
      }
    });

    const mockContext = createMockContext({
      from: { id: disabledQuietHoursUserTelegramIdentifier }
    });

    await handleStart(mockContext);

    expect(mockContext.reply).toHaveBeenCalledTimes(2);
    expect(mockContext.reply.mock.calls[1][0]).toContain('Europe/Warsaw');
    expect(mockContext.reply.mock.calls[1][0]).toContain('выключены');
  });

  it('должен отправлять справочное сообщение при вызове handleHelp', async () => {
    const mockContext = createMockContext();

    await handleHelp(mockContext);

    expect(mockContext.reply).toHaveBeenCalledTimes(1);
    expect(mockContext.reply.mock.calls[0][0]).toBe(TEXTS.MENU.HELP);
  });

  it('должен возвращать в главное меню при нажатии Назад без активного шага', async () => {
    const mockContext = createMockContext({
      session: { reminderStep: null }
    });

    await handleBack(mockContext);

    expect(mockContext.reply).toHaveBeenCalledTimes(1);
    expect(mockContext.reply.mock.calls[0][0]).toBe(TEXTS.MENU.MAIN);
  });

  it('должен возвращать на шаг выбора интервала при нажатии Назад со стадии автоудаления', async () => {
    const mockContext = createMockContext({
      session: {
        reminderStep: REMINDER_STEP.AUTO_DELETE,
        creatingReminder: { text: 'Медитация', intervalMinutes: 15 }
      }
    });

    await handleBack(mockContext);

    expect(mockContext.session.reminderStep).toBe(REMINDER_STEP.INTERVAL);
    expect(mockContext.reply).toHaveBeenCalled();
  });

  it('должен возвращать на шаг ввода текста при нажатии Назад со стадии интервала', async () => {
    const mockContext = createMockContext({
      session: {
        reminderStep: REMINDER_STEP.INTERVAL,
        creatingReminder: { text: 'Медитация' }
      }
    });

    await handleBack(mockContext);

    expect(mockContext.session.reminderStep).toBe(REMINDER_STEP.TEXT);
    expect(mockContext.reply).toHaveBeenCalled();
  });

  it('должен сбрасывать процесс создания напоминания при нажатии Назад со стадии ввода текста', async () => {
    const mockContext = createMockContext({
      session: {
        reminderStep: REMINDER_STEP.TEXT,
        creatingReminder: { text: 'Медитация' }
      }
    });

    await handleBack(mockContext);

    expect(mockContext.session.reminderStep).toBeNull();
    expect(mockContext.session.creatingReminder).toBeNull();
    expect(mockContext.reply).toHaveBeenCalledTimes(1);
    expect(mockContext.reply.mock.calls[0][0]).toBe(TEXTS.MENU.MAIN);
  });

  it('должен регистрировать команды Telegram для всех поддерживаемых языков', async () => {
    const mockBot = {
      telegram: {
        setMyCommands: vi.fn().mockResolvedValue(true)
      }
    };

    await registerBotCommands(mockBot);

    expect(mockBot.telegram.setMyCommands).toHaveBeenCalledTimes(4);
    expect(mockBot.telegram.setMyCommands).toHaveBeenNthCalledWith(1, [
      { command: 'start', description: 'Запустить бота / Главное меню' },
      { command: 'help', description: 'Справка и возможности' },
      { command: 'f', description: 'Поиск указателей по автору или фразе' },
      { command: 'cancel', description: 'Отмена текущего действия' }
    ]);
    expect(mockBot.telegram.setMyCommands).toHaveBeenNthCalledWith(
      2,
      [
        { command: 'start', description: 'Start the bot / Main menu' },
        { command: 'help', description: 'Help and features' },
        { command: 'f', description: 'Search pointers by author or phrase' },
        { command: 'cancel', description: 'Cancel current action' }
      ],
      { language_code: 'en' }
    );
    expect(mockBot.telegram.setMyCommands).toHaveBeenNthCalledWith(
      3,
      [
        { command: 'start', description: 'Запустити бота / Головне меню' },
        { command: 'help', description: 'Довідка та можливості' },
        { command: 'f', description: 'Пошук вказівників за автором або фразою' },
        { command: 'cancel', description: 'Скасувати поточну дію' }
      ],
      { language_code: 'uk' }
    );
    expect(mockBot.telegram.setMyCommands).toHaveBeenNthCalledWith(
      4,
      [
        { command: 'start', description: 'Iniciar el bot / Menú principal' },
        { command: 'help', description: 'Ayuda y características' },
        { command: 'f', description: 'Buscar punteros por autor o frase' },
        { command: 'cancel', description: 'Cancelar acción actual' }
      ],
      { language_code: 'es' }
    );
  });
});
