import { describe, expect, it } from 'vitest';
import { TEXTS } from '../../src/constants/texts.js';
import { UI } from '../../src/constants/ui.js';
import {
  handleCreateReminder,
  handleDeleteAfterInput,
  handleDeleteAfterPreset,
  handleIntervalInput,
  handleIntervalPreset,
  handleReminderText,
  REMINDER_STEP
} from '../../src/handlers/reminders.js';
import Reminder from '../../src/models/Reminder.js';
import User from '../../src/models/User.js';
import { createMockContext } from '../helpers/mockContext.js';

describe('Создание напоминаний', () => {
  it('должен инициализировать сессию и переводить на шаг ввода текста', async () => {
    const mockContext = createMockContext();

    await handleCreateReminder(mockContext);

    expect(mockContext.session.reminderStep).toBe(REMINDER_STEP.TEXT);
    expect(mockContext.session.creatingReminder).toEqual({
      deleteAfterSeconds: 10
    });
    expect(mockContext.reply).toHaveBeenCalled();
  });

  it('должен сохранять текст и переводить на шаг выбора интервала', async () => {
    const mockContext = createMockContext({
      session: {
        reminderStep: REMINDER_STEP.TEXT,
        creatingReminder: { deleteAfterSeconds: 10 }
      },
      text: 'Быть здесь и сейчас'
    });

    await handleReminderText(mockContext);

    expect(mockContext.session.reminderStep).toBe(REMINDER_STEP.INTERVAL);
    expect(mockContext.session.creatingReminder.text).toBe('Быть здесь и сейчас');
    expect(mockContext.session.creatingReminder.isRandomPointer).toBe(false);
  });

  it('должен устанавливать флаг случайного указателя при выборе соответствующей опции', async () => {
    const mockContext = createMockContext({
      session: {
        reminderStep: REMINDER_STEP.TEXT,
        creatingReminder: { deleteAfterSeconds: 10 }
      },
      text: UI.REMINDER_RANDOM
    });

    await handleReminderText(mockContext);

    expect(mockContext.session.reminderStep).toBe(REMINDER_STEP.INTERVAL);
    expect(mockContext.session.creatingReminder.isRandomPointer).toBe(true);
  });

  it('должен сохранять интервал из пресета и переводить на выбор автоудаления', async () => {
    const mockContext = createMockContext({
      session: {
        reminderStep: REMINDER_STEP.INTERVAL,
        creatingReminder: {
          text: 'Осознанность',
          deleteAfterSeconds: 10
        }
      }
    });

    await handleIntervalPreset(mockContext, 15);

    expect(mockContext.session.reminderStep).toBe(REMINDER_STEP.AUTO_DELETE);
    expect(mockContext.session.creatingReminder.intervalMinutes).toBe(15);
  });

  it('должен валидировать и сохранять пользовательский интервал текстом', async () => {
    const invalidMockContext = createMockContext({
      session: {
        reminderStep: REMINDER_STEP.INTERVAL,
        creatingReminder: { text: 'Осознанность' }
      },
      text: '-5'
    });

    const isHandledInvalid = await handleIntervalInput(invalidMockContext);
    expect(isHandledInvalid).toBe(true);
    expect(invalidMockContext.reply).toHaveBeenCalledWith(TEXTS.REMINDERS.MIN_INTERVAL);

    const validMockContext = createMockContext({
      session: {
        reminderStep: REMINDER_STEP.INTERVAL,
        creatingReminder: { text: 'Осознанность' }
      },
      text: '45'
    });

    const isHandledValid = await handleIntervalInput(validMockContext);
    expect(isHandledValid).toBe(true);
    expect(validMockContext.session.reminderStep).toBe(REMINDER_STEP.AUTO_DELETE);
    expect(validMockContext.session.creatingReminder.intervalMinutes).toBe(45);
  });

  it('должен завершать создание напоминания и сохранять запись в базе данных', async () => {
    const telegramUserId = 99887766;
    await User.create({ telegramId: telegramUserId });

    const mockContext = createMockContext({
      userId: telegramUserId,
      session: {
        reminderStep: REMINDER_STEP.AUTO_DELETE,
        creatingReminder: {
          text: 'Дыхание и покой',
          intervalMinutes: 30
        }
      },
      text: '10 сек'
    });

    await handleDeleteAfterPreset(mockContext);

    expect(mockContext.session.reminderStep).toBeNull();
    expect(mockContext.session.creatingReminder).toBeNull();

    const createdReminder = await Reminder.findOne({ userId: String(telegramUserId) });
    expect(createdReminder).not.toBeNull();
    expect(createdReminder.text).toBe('Дыхание и покой');
    expect(createdReminder.intervalMinutes).toBe(30);
    expect(createdReminder.deleteAfterSeconds).toBe(10);
    expect(createdReminder.isActive).toBe(true);
  });

  it('должен корректно сохранять напоминание с опцией Не удалять', async () => {
    const telegramUserId = 44556677;
    await User.create({ telegramId: telegramUserId });

    const mockContext = createMockContext({
      userId: telegramUserId,
      session: {
        reminderStep: REMINDER_STEP.AUTO_DELETE,
        creatingReminder: {
          text: 'Постоянное напоминание',
          intervalMinutes: 60
        }
      },
      text: 'Не удалять'
    });

    await handleDeleteAfterPreset(mockContext);

    const createdReminder = await Reminder.findOne({ userId: String(telegramUserId) });
    expect(createdReminder).not.toBeNull();
    expect(createdReminder.deleteAfterSeconds).toBeNull();
  });
});
