import { describe, expect, it } from 'vitest';
import {
  handleConfirmAction,
  handleMyReminders,
  handleReminderListCallback,
  handleViewReminder
} from '../../src/handlers/reminders.js';
import Reminder from '../../src/models/Reminder.js';
import User from '../../src/models/User.js';
import { createMockContext } from '../helpers/mockContext.js';

describe('Управление напоминаниями (Вариант А)', () => {
  it('должен формировать компактный единый список с кнопками номеров при наличии нескольких напоминаний', async () => {
    const telegramUserId = 66778811;
    await User.create({ telegramId: telegramUserId, timezone: 'Europe/Minsk' });

    await Reminder.create({
      userId: String(telegramUserId),
      chatId: telegramUserId,
      text: 'Напоминание А',
      intervalMinutes: 15,
      isActive: true
    });
    await Reminder.create({
      userId: String(telegramUserId),
      chatId: telegramUserId,
      text: 'Напоминание Б',
      intervalMinutes: 60,
      isActive: false
    });

    const mockContext = createMockContext({ userId: telegramUserId });
    await handleMyReminders(mockContext);

    expect(mockContext.reply).toHaveBeenCalledTimes(1);
    const [replyText, replyOptions] = mockContext.reply.mock.calls[0];
    expect(replyText).toContain('Твои напоминания');
    expect(replyText).toContain('Напоминание А');
    expect(replyText).toContain('Напоминание Б');

    const inlineButtons = replyOptions.reply_markup.inline_keyboard.flat();
    expect(
      inlineButtons.some((button) => button.text.includes('1') && button.text.includes('🟢'))
    ).toBe(true);
    expect(
      inlineButtons.some((button) => button.text.includes('2') && button.text.includes('⏸️'))
    ).toBe(true);
  });

  it('должен открывать детальную карточку конкретного напоминания по клику на номер', async () => {
    const telegramUserId = 66778812;
    await User.create({ telegramId: telegramUserId, timezone: 'Europe/Minsk' });

    const reminder = await Reminder.create({
      userId: String(telegramUserId),
      chatId: telegramUserId,
      text: 'Детальное напоминание',
      intervalMinutes: 30,
      isActive: true
    });

    const mockContext = createMockContext({
      userId: telegramUserId,
      callbackData: `reminder:view:${reminder.id}`
    });

    await handleViewReminder(mockContext);

    expect(mockContext.editMessageText).toHaveBeenCalledTimes(1);
    const [editedText, editedOptions] = mockContext.editMessageText.mock.calls[0];
    expect(editedText).toContain('Детальное напоминание');
    expect(editedText).toContain('Каждые 30 мин ⌛');

    const buttons = editedOptions.reply_markup.inline_keyboard.flat().map((button) => button.text);
    expect(buttons).toContain('⏸️ Приостановить');
    expect(buttons).toContain('🗑 Удалить');
    expect(buttons).toContain('⬅️ Ко всем напоминаниям');
  });

  it('должен возвращаться ко всему списку при клике на Ко всем напоминаниям', async () => {
    const telegramUserId = 66778813;
    await User.create({ telegramId: telegramUserId, timezone: 'Europe/Minsk' });

    await Reminder.create({
      userId: String(telegramUserId),
      chatId: telegramUserId,
      text: 'Напоминание в списке',
      intervalMinutes: 15,
      isActive: true
    });

    const mockContext = createMockContext({
      userId: telegramUserId,
      callbackData: 'reminder:list'
    });

    await handleReminderListCallback(mockContext);

    expect(mockContext.editMessageText).toHaveBeenCalledTimes(1);
    const [editedText] = mockContext.editMessageText.mock.calls[0];
    expect(editedText).toContain('Напоминание в списке');
  });

  it('должен восстанавливать карточку напоминания при отмене удаления', async () => {
    const telegramUserId = 66778814;
    await User.create({ telegramId: telegramUserId, timezone: 'Europe/Minsk' });

    const reminder = await Reminder.create({
      userId: String(telegramUserId),
      chatId: telegramUserId,
      text: 'Не удалять это',
      intervalMinutes: 20,
      isActive: true
    });

    const mockContext = createMockContext({
      userId: telegramUserId,
      callbackData: `confirm:cancel:${reminder.id}`
    });

    await handleConfirmAction(mockContext);

    expect(mockContext.editMessageReplyMarkup).toHaveBeenCalledTimes(1);
  });

  it('должен безопасно усекать текст списка при превышении лимита длины сообщения и не ронять Telegram API', async () => {
    const telegramUserId = 66778815;
    await User.create({ telegramId: telegramUserId, timezone: 'Europe/Minsk' });

    const bulkReminders = [];
    for (let index = 1; index <= 60; index++) {
      bulkReminders.push({
        userId: telegramUserId,
        chatId: telegramUserId,
        text: `Напоминание с очень длинным подробным текстом номер ${index} для проверки безопасной границы лимита сообщения в четыре тысячи символов`,
        intervalMinutes: 10 + index,
        isActive: true
      });
    }
    await Reminder.insertMany(bulkReminders);

    const mockContext = createMockContext({ userId: telegramUserId });
    await handleMyReminders(mockContext);

    expect(mockContext.reply).toHaveBeenCalledTimes(1);
    const [replyText, replyOptions] = mockContext.reply.mock.calls[0];
    expect(replyText.length).toBeLessThanOrEqual(3900);
    expect(replyText).toContain('… и ещё');
    expect(replyOptions.reply_markup.inline_keyboard.flat().length).toBe(60);
  });

  it('должен отображать время автоудаления в списке напоминаний, если оно задано', async () => {
    const telegramUserId = 66778816;
    await User.create({ telegramId: telegramUserId, timezone: 'Europe/Minsk' });

    await Reminder.create({
      userId: String(telegramUserId),
      chatId: telegramUserId,
      text: 'С автоудалением 60',
      intervalMinutes: 15,
      deleteAfterSeconds: 60,
      isActive: true
    });
    await Reminder.create({
      userId: String(telegramUserId),
      chatId: telegramUserId,
      text: 'С автоудалением 45',
      intervalMinutes: 30,
      deleteAfterSeconds: 45,
      isActive: false
    });
    await Reminder.create({
      userId: String(telegramUserId),
      chatId: telegramUserId,
      text: 'Без автоудаления',
      intervalMinutes: 60,
      deleteAfterSeconds: null,
      isActive: true
    });

    const mockContext = createMockContext({ userId: telegramUserId });
    await handleMyReminders(mockContext);

    expect(mockContext.reply).toHaveBeenCalledTimes(1);
    const [replyText] = mockContext.reply.mock.calls[0];
    expect(replyText).toContain('🗑 автоудаление: 60 сек');
    expect(replyText).toContain('🗑 автоудаление: 45 сек');
    expect(replyText).not.toContain('undefined');
  });
});
