import { describe, expect, it } from 'vitest';
import {
  handleConfirmAction,
  handleMyReminders,
  handleReminderListCallback,
  handleRequestAction,
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
    expect(replyText).toContain('Ваши напоминания');
    expect(replyText).toContain('Напоминание А');
    expect(replyText).toContain('Напоминание Б');

    const inlineButtons = replyOptions.reply_markup.inline_keyboard.flat();
    expect(inlineButtons.some(button => button.text === '1')).toBe(true);
    expect(inlineButtons.some(button => button.text === '2')).toBe(true);
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

    const buttons = editedOptions.reply_markup.inline_keyboard.flat().map(button => button.text);
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
});
