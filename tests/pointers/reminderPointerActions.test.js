import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Pointer, PointerEn } from '../../src/models/Pointer.js';
import User from '../../src/models/User.js';
import { UI } from '../../src/constants/ui.js';
import { TEXTS } from '../../src/constants/texts.js';
import {
  buildReminderPointerInlineKeyboard
} from '../../src/keyboard/pointers.js';
import {
  handleKeepPointer,
  handleToggleFavoritePointer,
  handleExpireInfo
} from '../../src/handlers/pointers.js';
import {
  registerDeletionTimer,
  cancelDeletionTimer,
  hasDeletionTimer,
  getDeletionTimer,
  clearAllDeletionTimers
} from '../../src/services/deletionTimers.js';
import { createMockContext } from '../helpers/mockContext.js';

describe('Указатели в напоминаниях и управление автоудалением', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearAllDeletionTimers();
  });

  afterEach(() => {
    clearAllDeletionTimers();
    vi.useRealTimers();
  });

  it('должен формировать компактную inline-клавиатуру в одну строку с кнопкой Оставить и В избранное', () => {
    const keyboard = buildReminderPointerInlineKeyboard({
      pointerId: '60c72b2f9b1d8b2bad000001',
      isFavorite: false,
      deleteAfterSeconds: 30,
      language: 'ru'
    });

    const replyMarkup = keyboard.reply_markup;
    expect(replyMarkup.inline_keyboard.length).toBe(1);

    const actionRow = replyMarkup.inline_keyboard[0];
    expect(actionRow.length).toBe(2);
    expect(actionRow[0].text).toBe(UI.ru.POINTER_KEEP_BUTTON(30));
    expect(actionRow[0].callback_data).toBe('pointer:keep:60c72b2f9b1d8b2bad000001');

    expect(actionRow[1].text).toBe(UI.ru.POINTER_FAV_ADD);
    expect(actionRow[1].callback_data).toBe('pointer:fav_toggle:60c72b2f9b1d8b2bad000001:reminder');
  });

  it('должен формировать клавиатуру только с кнопкой В избранное, если автоудаление не настроено', () => {
    const keyboard = buildReminderPointerInlineKeyboard({
      pointerId: '60c72b2f9b1d8b2bad000001',
      isFavorite: false,
      deleteAfterSeconds: null,
      language: 'ru'
    });

    const replyMarkup = keyboard.reply_markup;
    expect(replyMarkup.inline_keyboard.length).toBe(1);
    expect(replyMarkup.inline_keyboard[0][0].text).toBe(UI.ru.POINTER_FAV_ADD);
  });

  it('должен возвращать null для указателя в избранном без автоудаления', () => {
    const keyboardInFavorites = buildReminderPointerInlineKeyboard({
      pointerId: '60c72b2f9b1d8b2bad000002',
      isFavorite: true,
      deleteAfterSeconds: null,
      language: 'en'
    });
    expect(keyboardInFavorites).toBeNull();
  });

  it('должен показывать информационный тост при нажатии на бейдж автоудаления', async () => {
    const testUserId = 8881004;
    await User.create({ telegramId: testUserId, language: 'ru' });

    const mockCtx = createMockContext({
      userId: testUserId,
      chatId: testUserId,
      callbackQuery: {
        id: 'cb_query_expire',
        data: 'pointer:expire_info'
      }
    });

    await handleExpireInfo(mockCtx);

    expect(mockCtx.answerCbQuery).toHaveBeenCalledWith(
      TEXTS.ru.POINTERS.EXPIRE_BADGE_INFO,
      { show_alert: false }
    );
  });

  it('должен корректно регистрировать и отменять таймер автоудаления в deletionTimers', async () => {
    const callbackOnDelete = vi.fn();
    const testChatId = 12345;
    const testMessageId = 67890;

    registerDeletionTimer(testChatId, testMessageId, 30, callbackOnDelete);
    expect(hasDeletionTimer(testChatId, testMessageId)).toBe(true);
    expect(getDeletionTimer(testChatId, testMessageId)?.deleteAfterSeconds).toBe(30);

    const cancelledResult = cancelDeletionTimer(testChatId, testMessageId);
    expect(cancelledResult).toBe(true);
    expect(hasDeletionTimer(testChatId, testMessageId)).toBe(false);

    vi.advanceTimersByTime(35000);
    expect(callbackOnDelete).not.toHaveBeenCalled();
  });

  it('должен выполнять удаление по истечении времени, если таймер не был отменен', async () => {
    const callbackOnDelete = vi.fn();
    const testChatId = 999;
    const testMessageId = 888;

    registerDeletionTimer(testChatId, testMessageId, 10, callbackOnDelete);
    expect(hasDeletionTimer(testChatId, testMessageId)).toBe(true);

    vi.advanceTimersByTime(11000);
    expect(callbackOnDelete).toHaveBeenCalledTimes(1);
    expect(hasDeletionTimer(testChatId, testMessageId)).toBe(false);
  });

  it('должен отменять автоудаление при нажатии Не удалять и удалять все кнопки из разметки', async () => {
    const testUserId = 8881001;
    await User.create({ telegramId: testUserId, language: 'ru' });

    const pointer = await Pointer.create({
      text: 'Всё преходяще, покой неизменен',
      isActive: true
    });

    const testChatId = testUserId;
    const testMessageId = 401;

    registerDeletionTimer(testChatId, testMessageId, 30, vi.fn());
    expect(hasDeletionTimer(testChatId, testMessageId)).toBe(true);

    const mockCtx = createMockContext({
      userId: testUserId,
      chatId: testChatId,
      callbackQuery: {
        id: 'cb_query_1',
        data: `pointer:keep:${pointer._id}`,
        message: {
          message_id: testMessageId,
          chat: { id: testChatId },
          text: pointer.text
        }
      }
    });

    await handleKeepPointer(mockCtx);

    expect(hasDeletionTimer(testChatId, testMessageId)).toBe(false);
    expect(mockCtx.answerCbQuery).toHaveBeenCalledWith(UI.ru.POINTER_KEEP_TOAST);
    expect(mockCtx.editMessageReplyMarkup).toHaveBeenCalledWith();
  });

  it('должен добавлять в избранное и автоматически отменять таймер автоудаления в режиме reminder', async () => {
    const testUserId = 8881002;
    await User.create({ telegramId: testUserId, language: 'ru', favoritePointers: [] });

    const pointer = await Pointer.create({
      text: 'Наблюдай за наблюдателем',
      isActive: true
    });

    const testChatId = testUserId;
    const testMessageId = 502;

    registerDeletionTimer(testChatId, testMessageId, 30, vi.fn());
    expect(hasDeletionTimer(testChatId, testMessageId)).toBe(true);

    const mockCtxAdd = createMockContext({
      userId: testUserId,
      chatId: testChatId,
      callbackQuery: {
        id: 'cb_query_2',
        data: `pointer:fav_toggle:${pointer._id}:reminder`,
        message: {
          message_id: testMessageId,
          chat: { id: testChatId },
          text: pointer.text
        }
      }
    });

    await handleToggleFavoritePointer(mockCtxAdd);

    expect(mockCtxAdd.answerCbQuery).toHaveBeenCalledWith(TEXTS.ru.POINTERS.FAVORITE_ADDED);
    expect(hasDeletionTimer(testChatId, testMessageId)).toBe(false);
    expect(mockCtxAdd.editMessageReplyMarkup).toHaveBeenCalledWith(undefined);
  });

  it('должен удалять клавиатуру при добавлении в избранное в режиме reminder, если таймер уже был отменен', async () => {
    const testUserId = 8881003;
    await User.create({ telegramId: testUserId, language: 'ru', favoritePointers: [] });

    const pointer = await Pointer.create({
      text: 'Внимательность в каждом вздохе',
      isActive: true
    });

    const testChatId = testUserId;
    const testMessageId = 603;

    const mockCtx = createMockContext({
      userId: testUserId,
      chatId: testChatId,
      callbackQuery: {
        id: 'cb_query_4',
        data: `pointer:fav_toggle:${pointer._id}:reminder`,
        message: {
          message_id: testMessageId,
          chat: { id: testChatId },
          text: pointer.text
        }
      }
    });

    await handleToggleFavoritePointer(mockCtx);

    const passedKeyboard = mockCtx.editMessageReplyMarkup.mock.calls[0][0];
    expect(passedKeyboard).toBeUndefined();
  });
});
