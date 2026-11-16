import { describe, expect, it, vi } from 'vitest';
import { TEXTS } from '../../src/constants/texts.js';
import { handleBack } from '../../src/handlers/back.js';
import { handleStart, handleHelp } from '../../src/handlers/menu.js';
import { registerBotCommands } from '../../src/bot.js';
import { REMINDER_STEP } from '../../src/handlers/reminders.js';
import { createMockContext } from '../helpers/mockContext.js';

describe('Главное меню и навигация', () => {
  it('должен отправлять приветственное сообщение при вызове handleStart без параметров', async () => {
    const mockContext = createMockContext();

    await handleStart(mockContext);

    expect(mockContext.reply).toHaveBeenCalledTimes(1);
    expect(mockContext.reply.mock.calls[0][0]).toBe(TEXTS.MENU.START);
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
      { command: 'f', description: 'Поиск указателей по автору или фразе' }
    ]);
    expect(mockBot.telegram.setMyCommands).toHaveBeenNthCalledWith(2, [
      { command: 'start', description: 'Start the bot / Main menu' },
      { command: 'help', description: 'Help and features' },
      { command: 'f', description: 'Search pointers by author or phrase' }
    ], { language_code: 'en' });
    expect(mockBot.telegram.setMyCommands).toHaveBeenNthCalledWith(3, [
      { command: 'start', description: 'Запустити бота / Головне меню' },
      { command: 'help', description: 'Довідка та можливості' },
      { command: 'f', description: 'Пошук вказівників за автором або фразою' }
    ], { language_code: 'uk' });
    expect(mockBot.telegram.setMyCommands).toHaveBeenNthCalledWith(4, [
      { command: 'start', description: 'Iniciar el bot / Menú principal' },
      { command: 'help', description: 'Ayuda y características' },
      { command: 'f', description: 'Buscar punteros por autor o frase' }
    ], { language_code: 'es' });
  });
});
