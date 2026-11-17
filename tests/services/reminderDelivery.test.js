import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  deliverReminder,
  handleDeliveryError,
  getDeleteAfterSeconds,
  getPointerTagForLanguage
} from '../../src/services/reminderDelivery.js';
import Reminder from '../../src/models/Reminder.js';
import * as cleanupUserModule from '../../src/services/cleanupUser.js';
import { hasDeletionTimer, clearAllDeletionTimers } from '../../src/services/deletionTimers.js';
import { handleKeepReminder } from '../../src/handlers/reminders.js';
import { createMockContext } from '../helpers/mockContext.js';
import { UI } from '../../src/constants/ui.js';

describe('Сервис доставки напоминаний (reminderDelivery)', () => {
  let mockBot;

  beforeEach(() => {
    mockBot = {
      telegram: {
        sendMessage: vi.fn().mockResolvedValue({ message_id: 101 }),
        sendPhoto: vi.fn().mockResolvedValue({ message_id: 102 }),
        sendVideo: vi.fn().mockResolvedValue({ message_id: 103 }),
        deleteMessage: vi.fn().mockResolvedValue(true)
      }
    };
  });

  it('должен возвращать правильные теги для каждого языка', () => {
    expect(getPointerTagForLanguage('en')).toBe('stillness');
    expect(getPointerTagForLanguage('uk')).toBe('тиша');
    expect(getPointerTagForLanguage('es')).toBe('silencio');
    expect(getPointerTagForLanguage('ru')).toBe('тишина');
    expect(getPointerTagForLanguage('unknown')).toBe('тишина');
  });

  it('должен корректно извлекать секунды автоудаления из напоминания', () => {
    expect(getDeleteAfterSeconds({ deleteAfterSeconds: 30 })).toBe(30);
    expect(getDeleteAfterSeconds({ deleteAfterSeconds: null })).toBeNull();
    expect(getDeleteAfterSeconds({})).toBeNull();
  });

  it('должен успешно отправлять текстовое напоминание без автоудаления', async () => {
    const reminder = {
      _id: 'reminder1',
      chatId: 12345,
      userId: 12345,
      text: 'Время дышать'
    };

    await deliverReminder({
      bot: mockBot,
      reminder,
      user: null,
      userLanguage: 'ru',
      currentPointer: null,
      messageText: reminder.text
    });

    expect(mockBot.telegram.sendMessage).toHaveBeenCalledTimes(1);
    expect(mockBot.telegram.sendMessage).toHaveBeenCalledWith(12345, 'Время дышать', {
      parse_mode: 'HTML'
    });
  });

  it('должен отправлять текстовое напоминание с кнопкой автоудаления без текстового футера', async () => {
    const reminder = {
      _id: 'reminder2',
      chatId: 54321,
      userId: 54321,
      text: 'Будь в моменте',
      deleteAfterSeconds: 30
    };

    await deliverReminder({
      bot: mockBot,
      reminder,
      user: null,
      userLanguage: 'ru',
      currentPointer: null,
      messageText: reminder.text
    });

    expect(mockBot.telegram.sendMessage).toHaveBeenCalledTimes(1);
    const [chatId, text, options] = mockBot.telegram.sendMessage.mock.calls[0];
    expect(chatId).toBe(54321);
    expect(text).toBe('Будь в моменте');
    expect(text).not.toContain('автоудаление');
    expect(options.parse_mode).toBe('HTML');
    expect(options.reply_markup.inline_keyboard[0][0].text).toBe(UI.ru.POINTER_KEEP_BUTTON(30));
  });

  it('должен отправлять напоминание с фотографией и подписью', async () => {
    const reminder = {
      _id: 'reminderPhoto',
      chatId: 998877,
      userId: 998877,
      photoFileId: 'photo_file_123',
      caption: 'Красивый закат',
      deleteAfterSeconds: null
    };

    await deliverReminder({
      bot: mockBot,
      reminder,
      user: null,
      userLanguage: 'ru',
      currentPointer: null,
      messageText: 'Фото'
    });

    expect(mockBot.telegram.sendPhoto).toHaveBeenCalledTimes(1);
    expect(mockBot.telegram.sendPhoto).toHaveBeenCalledWith(998877, 'photo_file_123', {
      caption: 'Красивый закат',
      parse_mode: 'HTML'
    });
  });

  it('должен отправлять напоминание с видеофайлом', async () => {
    const reminder = {
      _id: 'reminderVideo',
      chatId: 887766,
      userId: 887766,
      videoFileId: 'video_file_456',
      caption: 'Инструкция по медитации',
      deleteAfterSeconds: null
    };

    await deliverReminder({
      bot: mockBot,
      reminder,
      user: null,
      userLanguage: 'ru',
      currentPointer: null,
      messageText: 'Видео'
    });

    expect(mockBot.telegram.sendVideo).toHaveBeenCalledTimes(1);
    expect(mockBot.telegram.sendVideo).toHaveBeenCalledWith(887766, 'video_file_456', {
      caption: 'Инструкция по медитации',
      parse_mode: 'HTML'
    });
  });

  it('должен отправлять указатель с инлайн-клавиатурой и регистрировать таймер автоудаления', async () => {
    const reminder = {
      _id: 'reminderPointer',
      chatId: 445566,
      userId: 445566,
      deleteAfterSeconds: 15
    };

    const currentPointer = {
      _id: '507f1f77bcf86cd799439011',
      text: 'Наблюдай за мыслями',
      source: 'Дзен'
    };

    await deliverReminder({
      bot: mockBot,
      reminder,
      user: null,
      userLanguage: 'ru',
      currentPointer,
      messageText: 'Наблюдай за мыслями\n\n— Дзен'
    });

    expect(mockBot.telegram.sendMessage).toHaveBeenCalledTimes(1);
    const [chatId, text, options] = mockBot.telegram.sendMessage.mock.calls[0];
    expect(chatId).toBe(445566);
    expect(text).toContain('Наблюдай за мыслями');
    expect(options.reply_markup).toBeDefined();
  });

  it('должен деактивировать напоминание при ошибке 400 (несуществующий чат)', async () => {
    const reminder = await Reminder.create({
      userId: 777666,
      chatId: 777666,
      text: 'Тест деактивации',
      intervalMinutes: 10,
      isActive: true
    });

    const error = {
      response: {
        error_code: 400,
        description: 'Bad Request: chat not found'
      }
    };

    await handleDeliveryError({ error, reminder });

    const updatedReminder = await Reminder.findById(reminder._id);
    expect(updatedReminder.isActive).toBe(false);
  });

  it('должен вызывать cleanupUser при ошибке 403 (бот заблокирован пользователем)', async () => {
    const cleanupSpy = vi.spyOn(cleanupUserModule, 'cleanupUser').mockResolvedValue(true);

    const reminder = {
      _id: 'blockedReminder',
      userId: 999888,
      chatId: 999888
    };

    const error = {
      response: {
        error_code: 403,
        description: 'Forbidden: bot was blocked by the user'
      }
    };

    await handleDeliveryError({ error, reminder });

    expect(cleanupSpy).toHaveBeenCalledWith(999888);
    cleanupSpy.mockRestore();
  });

  it('должен прикреплять инлайн-кнопку Оставить и регистрировать таймер автоудаления для текстового напоминания', async () => {
    clearAllDeletionTimers();
    const reminder = {
      _id: 'reminderTextAutoDelete',
      chatId: 54321,
      userId: 54321,
      text: 'Время сделать перерыв',
      deleteAfterSeconds: 20
    };

    await deliverReminder({
      bot: mockBot,
      reminder,
      user: null,
      userLanguage: 'ru',
      currentPointer: null,
      messageText: reminder.text
    });

    expect(mockBot.telegram.sendMessage).toHaveBeenCalledTimes(1);
    const [, , options] = mockBot.telegram.sendMessage.mock.calls[0];
    expect(options.reply_markup).toBeDefined();
    expect(options.reply_markup.inline_keyboard[0][0].text).toBe(UI.ru.POINTER_KEEP_BUTTON(20));
    expect(options.reply_markup.inline_keyboard[0][0].callback_data).toBe('reminder:keep');
    expect(hasDeletionTimer(54321, 101)).toBe(true);
  });

  it('должен прикреплять инлайн-кнопку Оставить и регистрировать таймер автоудаления для фото и видео напоминаний', async () => {
    clearAllDeletionTimers();
    const photoReminder = {
      _id: 'photoReminderAutoDelete',
      chatId: 998877,
      userId: 998877,
      photoFileId: 'photo_file_999',
      caption: 'Закат',
      deleteAfterSeconds: 15
    };

    await deliverReminder({
      bot: mockBot,
      reminder: photoReminder,
      user: null,
      userLanguage: 'ru',
      currentPointer: null,
      messageText: 'Фото'
    });

    expect(mockBot.telegram.sendPhoto).toHaveBeenCalledTimes(1);
    const [, , photoOptions] = mockBot.telegram.sendPhoto.mock.calls[0];
    expect(photoOptions.reply_markup).toBeDefined();
    expect(photoOptions.reply_markup.inline_keyboard[0][0].text).toBe(
      UI.ru.POINTER_KEEP_BUTTON(15)
    );
    expect(photoOptions.reply_markup.inline_keyboard[0][0].callback_data).toBe('reminder:keep');
    expect(hasDeletionTimer(998877, 102)).toBe(true);

    const videoReminder = {
      _id: 'videoReminderAutoDelete',
      chatId: 887766,
      userId: 887766,
      videoFileId: 'video_file_999',
      caption: 'Медитация',
      deleteAfterSeconds: 25
    };

    await deliverReminder({
      bot: mockBot,
      reminder: videoReminder,
      user: null,
      userLanguage: 'ru',
      currentPointer: null,
      messageText: 'Видео'
    });

    expect(mockBot.telegram.sendVideo).toHaveBeenCalledTimes(1);
    const [, , videoOptions] = mockBot.telegram.sendVideo.mock.calls[0];
    expect(videoOptions.reply_markup).toBeDefined();
    expect(videoOptions.reply_markup.inline_keyboard[0][0].text).toBe(
      UI.ru.POINTER_KEEP_BUTTON(25)
    );
    expect(videoOptions.reply_markup.inline_keyboard[0][0].callback_data).toBe('reminder:keep');
    expect(hasDeletionTimer(887766, 103)).toBe(true);
  });

  it('должен отменять автоудаление обычного напоминания при вызове handleKeepReminder', async () => {
    clearAllDeletionTimers();
    const testChatId = 771122;
    const testMessageId = 555;

    const reminder = {
      _id: 'reminderToKeep',
      chatId: testChatId,
      userId: testChatId,
      text: 'Важная заметка',
      deleteAfterSeconds: 30
    };

    mockBot.telegram.sendMessage.mockResolvedValueOnce({ message_id: testMessageId });

    await deliverReminder({
      bot: mockBot,
      reminder,
      user: null,
      userLanguage: 'ru',
      currentPointer: null,
      messageText: reminder.text
    });

    expect(hasDeletionTimer(testChatId, testMessageId)).toBe(true);

    const mockContext = createMockContext({
      userId: testChatId,
      chatId: testChatId,
      callbackQuery: {
        id: 'callback_keep_reminder',
        data: 'reminder:keep',
        message: {
          message_id: testMessageId,
          chat: { id: testChatId }
        }
      }
    });

    await handleKeepReminder(mockContext);

    expect(hasDeletionTimer(testChatId, testMessageId)).toBe(false);
    expect(mockContext.editMessageReplyMarkup).toHaveBeenCalledWith();
    expect(mockContext.answerCbQuery).toHaveBeenCalledWith(UI.ru.POINTER_KEEP_TOAST);
  });
});
