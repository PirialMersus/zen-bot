import { describe, expect, it } from 'vitest';
import { TEXTS } from '../../src/constants/texts.js';
import {
  handleConfirmAction,
  handleMyReminders,
  handleRequestAction
} from '../../src/handlers/reminders.js';
import Reminder from '../../src/models/Reminder.js';
import { createMockContext } from '../helpers/mockContext.js';

describe('Управление существующими напоминаниями', () => {
  it('должен сообщать об отсутствии напоминаний, если список пуст', async () => {
    const telegramUserId = 11223344;
    const mockContext = createMockContext({ userId: telegramUserId });

    await handleMyReminders(mockContext);

    expect(mockContext.reply).toHaveBeenCalledWith(
      TEXTS.REMINDERS.NONE,
      expect.anything()
    );
  });

  it('должен выводить список напоминаний пользователя', async () => {
    const telegramUserId = 11223344;
    await Reminder.create({
      userId: String(telegramUserId),
      chatId: telegramUserId,
      text: 'Первое напоминание',
      intervalMinutes: 15,
      isActive: true
    });
    await Reminder.create({
      userId: String(telegramUserId),
      chatId: telegramUserId,
      text: 'Второе напоминание',
      intervalMinutes: 60,
      isActive: false
    });

    const mockContext = createMockContext({ userId: telegramUserId });

    await handleMyReminders(mockContext);

    expect(mockContext.reply).toHaveBeenCalledTimes(2);
  });

  it('должен переключать статус напоминания на паузу и обратно', async () => {
    const telegramUserId = 11223344;
    const testReminder = await Reminder.create({
      userId: String(telegramUserId),
      chatId: telegramUserId,
      text: 'Напоминание для паузы',
      intervalMinutes: 30,
      isActive: true
    });

    const pauseMockContext = createMockContext({
      userId: telegramUserId,
      callbackData: `pause:${testReminder.id}`,
      extra: {
        editMessageText: createMockContext().editMessageText
      }
    });

    await handleRequestAction(pauseMockContext, 'pause');

    const pausedReminderInDb = await Reminder.findById(testReminder.id);
    expect(pausedReminderInDb.isActive).toBe(false);

    const resumeMockContext = createMockContext({
      userId: telegramUserId,
      callbackData: `resume:${testReminder.id}`,
      extra: {
        editMessageText: createMockContext().editMessageText
      }
    });

    await handleRequestAction(resumeMockContext, 'resume');

    const resumedReminderInDb = await Reminder.findById(testReminder.id);
    expect(resumedReminderInDb.isActive).toBe(true);
  });

  it('должен удалять напоминание после подтверждения действия', async () => {
    const telegramUserId = 11223344;
    const reminderToDelete = await Reminder.create({
      userId: String(telegramUserId),
      chatId: telegramUserId,
      text: 'Напоминание под удаление',
      intervalMinutes: 10,
      isActive: true
    });

    const confirmDeleteMockContext = createMockContext({
      userId: telegramUserId,
      callbackData: `confirm:delete:${reminderToDelete.id}`
    });

    await handleConfirmAction(confirmDeleteMockContext);

    const deletedReminderInDb = await Reminder.findById(reminderToDelete.id);
    expect(deletedReminderInDb).toBeNull();
    expect(confirmDeleteMockContext.deleteMessage).toHaveBeenCalled();
  });
});
