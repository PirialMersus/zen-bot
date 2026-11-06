import { describe, expect, it } from 'vitest';
import { TEXTS } from '../../src/constants/texts.js';
import { UI } from '../../src/constants/ui.js';
import { BUTTONS } from '../../src/constants/buttons.js';
import {
  handleFavoriteInfo,
  handleFavoritePointer,
  handleNextPointer,
  handlePointer,
  handlePointerToReminder,
  handlePointersMenu,
  handleRandomPointer,
  handleToggleFavoritePointer
} from '../../src/handlers/pointers.js';
import {
  handleBack
} from '../../src/handlers/back.js';
import {
  handleAdminSearchPointers,
  handleAdminGetPointerByNumber
} from '../../src/handlers/admin.js';
import {
  handleReminderText,
  handleIntervalPreset,
  handleDeleteAfterPreset,
  formatReminderMessageText,
  buildRemindersListPayload,
  REMINDER_STEP
} from '../../src/handlers/reminders.js';
import { Pointer, PointerEn } from '../../src/models/Pointer.js';
import Reminder from '../../src/models/Reminder.js';
import User from '../../src/models/User.js';
import { cleanupUser } from '../../src/services/cleanupUser.js';
import {
  getNextFavoritePointerForUser,
  isPointerInFavorites,
  toggleFavoritePointer
} from '../../src/services/pointers.js';
import { createMockContext } from '../helpers/mockContext.js';

describe('Всестороннее тестирование функционала избранного', () => {
  it('должен поддерживать полный цикл избранного на английском языке (i18n)', async () => {
    const englishUserId = 77701;
    await User.create({ telegramId: englishUserId, language: 'en' });

    const emptyReminderContext = createMockContext({
      userId: englishUserId,
      text: UI.en.REMINDER_FAVORITE,
      session: {
        reminderStep: REMINDER_STEP.TEXT,
        creatingReminder: {}
      }
    });

    await handleReminderText(emptyReminderContext);
    expect(emptyReminderContext.reply).toHaveBeenCalledWith(TEXTS.en.POINTERS.FAVORITE_REMINDER_EMPTY);
    expect(emptyReminderContext.session.reminderStep).toBe(REMINDER_STEP.TEXT);

    const enPointer = await PointerEn.create({
      number: 10,
      text: 'Silence is the language of presence',
      isActive: true
    });

    await toggleFavoritePointer(englishUserId, enPointer._id);

    const validReminderContext = createMockContext({
      userId: englishUserId,
      text: UI.en.REMINDER_FAVORITE,
      session: {
        reminderStep: REMINDER_STEP.TEXT,
        creatingReminder: { deleteAfterSeconds: 10 }
      }
    });

    await handleReminderText(validReminderContext);
    expect(validReminderContext.session.reminderStep).toBe(REMINDER_STEP.INTERVAL);
    expect(validReminderContext.session.creatingReminder.isFavoritePointer).toBe(true);

    const reminderItem = {
      id: 'rem_en_1',
      text: UI.en.REMINDER_FAVORITE,
      isFavoritePointer: true,
      isActive: true,
      intervalMinutes: 60,
      deleteAfterSeconds: null,
      nextRunAt: null
    };

    const formattedList = buildRemindersListPayload([reminderItem], 'en');
    expect(formattedList.text).toContain(`«${UI.en.REMINDER_FAVORITE}»`);

    const formattedMsg = formatReminderMessageText(reminderItem, '1', 'en');
    expect(formattedMsg).toContain(`«${UI.en.REMINDER_FAVORITE}»`);
  });

  it('должен сохранять точный текст указателя в напоминание из всех 4 источников вызова', async () => {
    const testUserId = 77702;
    process.env.CREATOR_ID = String(testUserId);

    const pRandom = await Pointer.create({ text: 'Указатель из рандома', isActive: true });
    const pFav = await Pointer.create({ text: 'Указатель из избранного', isActive: true });
    const pSearch = await Pointer.create({ text: 'Указатель найденный по поиску', isActive: true });
    const pByNumber = await Pointer.create({ number: 55, text: 'Указатель по номеру 55', isActive: true });

    await toggleFavoritePointer(testUserId, pFav._id);

    const ctxRandom = createMockContext({ userId: testUserId });
    await handlePointer(ctxRandom);
    const toRemCtx1 = createMockContext({
      userId: testUserId,
      session: { ...ctxRandom.session },
      callbackData: 'pointer:to_reminder'
    });
    await handlePointerToReminder(toRemCtx1);
    expect(toRemCtx1.session.creatingReminder.text).toBe(ctxRandom.session.lastPointerText);

    const ctxFav = createMockContext({ userId: testUserId });
    await handleFavoritePointer(ctxFav);
    const toRemCtx2 = createMockContext({
      userId: testUserId,
      session: { ...ctxFav.session },
      callbackData: 'pointer:to_reminder'
    });
    await handlePointerToReminder(toRemCtx2);
    expect(toRemCtx2.session.creatingReminder.text).toBe(ctxFav.session.lastPointerText);

    const ctxSearch = createMockContext({ userId: testUserId, text: '/find поиску' });
    await handleAdminSearchPointers(ctxSearch);
    const toRemCtx3 = createMockContext({
      userId: testUserId,
      session: { ...ctxSearch.session },
      callbackData: 'pointer:to_reminder'
    });
    await handlePointerToReminder(toRemCtx3);
    expect(toRemCtx3.session.creatingReminder.text).toBe(ctxSearch.session.lastPointerText);

    const ctxNum = createMockContext({ userId: testUserId, text: '/p 55' });
    await handleAdminGetPointerByNumber(ctxNum);
    const toRemCtx4 = createMockContext({
      userId: testUserId,
      session: { ...ctxNum.session },
      callbackData: 'pointer:to_reminder'
    });
    await handlePointerToReminder(toRemCtx4);
    expect(toRemCtx4.session.creatingReminder.text).toBe('Указатель по номеру 55');
  });

  it('должен позволять откат через Назад со стадии автоудаления до выбора текста', async () => {
    const testUserId = 77703;
    const pointer = await Pointer.create({ text: 'Указатель для глубокого отката', isActive: true });
    await toggleFavoritePointer(testUserId, pointer._id);

    const sessionState = {
      reminderStep: REMINDER_STEP.TEXT,
      creatingReminder: { deleteAfterSeconds: 10 }
    };

    const ctxText = createMockContext({ userId: testUserId, text: UI.ru.REMINDER_FAVORITE, session: sessionState });
    await handleReminderText(ctxText);
    expect(sessionState.reminderStep).toBe(REMINDER_STEP.INTERVAL);

    await handleIntervalPreset(ctxText, 60);
    expect(sessionState.reminderStep).toBe(REMINDER_STEP.AUTO_DELETE);

    const ctxBack1 = createMockContext({ userId: testUserId, session: sessionState });
    await handleBack(ctxBack1);
    expect(sessionState.reminderStep).toBe(REMINDER_STEP.INTERVAL);

    const ctxBack2 = createMockContext({ userId: testUserId, session: sessionState });
    await handleBack(ctxBack2);
    expect(sessionState.reminderStep).toBe(REMINDER_STEP.TEXT);

    const ctxBack3 = createMockContext({ userId: testUserId, session: sessionState });
    await handleBack(ctxBack3);
    expect(sessionState.reminderStep).toBeNull();
    expect(sessionState.creatingReminder).toBeNull();
  });

  it('должен гарантировать полную изоляцию избранного между разными пользователями', async () => {
    const userA = 77704;
    const userB = 77705;

    const pointerA = await Pointer.create({ text: 'Указатель пользователя А', isActive: true });
    const pointerB = await Pointer.create({ text: 'Указатель пользователя Б', isActive: true });

    await toggleFavoritePointer(userA, pointerA._id);
    await toggleFavoritePointer(userB, pointerB._id);

    const isAFavForA = await isPointerInFavorites(userA, pointerA._id);
    const isBFavForA = await isPointerInFavorites(userA, pointerB._id);

    const isAFavForB = await isPointerInFavorites(userB, pointerA._id);
    const isBFavForB = await isPointerInFavorites(userB, pointerB._id);

    expect(isAFavForA).toBe(true);
    expect(isBFavForA).toBe(false);
    expect(isAFavForB).toBe(false);
    expect(isBFavForB).toBe(true);

    const nextForA = await getNextFavoritePointerForUser(userA);
    const nextForB = await getNextFavoritePointerForUser(userB);

    expect(String(nextForA._id)).toBe(String(pointerA._id));
    expect(String(nextForB._id)).toBe(String(pointerB._id));

    await toggleFavoritePointer(userA, pointerA._id);

    const nextForAAfterRemove = await getNextFavoritePointerForUser(userA);
    const nextForBAfterRemove = await getNextFavoritePointerForUser(userB);

    expect(nextForAAfterRemove).toBeNull();
    expect(nextForBAfterRemove).not.toBeNull();
    expect(String(nextForBAfterRemove._id)).toBe(String(pointerB._id));
  });

  it('должен корректно отдавать смесь русских и английских указателей из избранного одного пользователя', async () => {
    const polyglotUserId = 77706;

    const ruPtr = await Pointer.create({ text: 'Русский покой', isActive: true });
    const enPtr = await PointerEn.create({ text: 'English stillness', isActive: true });

    await toggleFavoritePointer(polyglotUserId, ruPtr._id);
    await toggleFavoritePointer(polyglotUserId, enPtr._id);

    const firstFetched = await getNextFavoritePointerForUser(polyglotUserId);
    const secondFetched = await getNextFavoritePointerForUser(polyglotUserId);

    expect(firstFetched).not.toBeNull();
    expect(secondFetched).not.toBeNull();

    const texts = [firstFetched.text, secondFetched.text];
    expect(texts).toContain('Русский покой');
    expect(texts).toContain('English stillness');
  });

  it('должен чисто удалять избранное и напоминания при вызове cleanupUser', async () => {
    const userToCleanId = 77707;
    const ptr = await Pointer.create({ text: 'Указатель для очистки', isActive: true });

    await toggleFavoritePointer(userToCleanId, ptr._id);

    await Reminder.create({
      userId: String(userToCleanId),
      chatId: userToCleanId,
      text: UI.ru.REMINDER_FAVORITE,
      intervalMinutes: 15,
      isFavoritePointer: true,
      isActive: true
    });

    const userBeforeClean = await User.findOne({ telegramId: userToCleanId });
    const remBeforeClean = await Reminder.findOne({ userId: String(userToCleanId) });

    expect(userBeforeClean).not.toBeNull();
    expect(remBeforeClean).not.toBeNull();

    await cleanupUser(userToCleanId);

    const userAfterClean = await User.findOne({ telegramId: userToCleanId });
    const remAfterClean = await Reminder.findOne({ userId: String(userToCleanId) });

    expect(userAfterClean).toBeNull();
    expect(remAfterClean).toBeNull();
  });

  it('должен отображать локализованный бейдж и чистый текст цитаты на английском языке', async () => {
    const englishUserId = 77708;
    await User.create({ telegramId: englishUserId, language: 'en' });

    const firstEnPointer = await PointerEn.create({
      text: 'Pure awareness prior to thought',
      source: 'Nisargadatta Maharaj',
      isActive: true
    });
    const secondEnPointer = await PointerEn.create({
      text: 'What you are looking for is what is looking',
      source: 'Francis Lucille',
      isActive: true
    });

    await toggleFavoritePointer(englishUserId, firstEnPointer._id);
    await toggleFavoritePointer(englishUserId, secondEnPointer._id);

    const favoriteContext = createMockContext({ userId: englishUserId });
    await handleFavoritePointer(favoriteContext);

    expect(favoriteContext.reply).toHaveBeenCalled();
    const [replyText, replyOptions] = favoriteContext.reply.mock.calls[0];

    expect(replyText).not.toContain('Favorites');
    expect(replyText).not.toContain('⭐');
    expect(replyText).toContain('—');

    const inlineKeyboardRows = replyOptions.reply_markup.inline_keyboard;
    expect(inlineKeyboardRows[0][0].text).toBe(UI.en.POINTER_FAV_MODE_BADGE(1, 2));
    expect(inlineKeyboardRows[0][0].callback_data).toBe('pointer:fav_info');
    expect(inlineKeyboardRows[1][1].text).toBe(UI.en.POINTER_NEXT_FAV);

    const infoContext = createMockContext({ userId: englishUserId, callbackData: 'pointer:fav_info' });
    await handleFavoriteInfo(infoContext);
    expect(infoContext.answerCbQuery).toHaveBeenCalledWith(TEXTS.en.POINTERS.FAVORITE_BADGE_INFO, { show_alert: false });

    const nextFavoriteContext = createMockContext({
      userId: englishUserId,
      callbackData: 'pointer:next:favorite',
      session: {
        pointerMode: 'favorite',
        lastPointerId: String(firstEnPointer._id)
      }
    });
    await handleNextPointer(nextFavoriteContext);

    expect(nextFavoriteContext.answerCbQuery).toHaveBeenCalledWith(TEXTS.en.POINTERS.FAVORITE_TOAST(2, 2));
    const [editedText, editedOptions] = nextFavoriteContext.editMessageText.mock.calls[0];
    expect(editedText).not.toContain('Favorites');
    expect(editedText).not.toContain('⭐');
    expect(editedOptions.reply_markup.inline_keyboard[0][0].text).toBe(UI.en.POINTER_FAV_MODE_BADGE(2, 2));
  });
});
