import { describe, expect, it } from 'vitest';
import { TEXTS } from '../../src/constants/texts.js';
import { handleBack } from '../../src/handlers/back.js';
import { handleStart } from '../../src/handlers/menu.js';
import { REMINDER_STEP } from '../../src/handlers/reminders.js';
import { createMockContext } from '../helpers/mockContext.js';

describe('Главное меню и навигация', () => {
  it('должен отправлять приветственное сообщение при вызове handleStart без параметров', async () => {
    const mockContext = createMockContext();

    await handleStart(mockContext);

    expect(mockContext.reply).toHaveBeenCalledTimes(1);
    expect(mockContext.reply.mock.calls[0][0]).toBe(TEXTS.MENU.START);
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
});
