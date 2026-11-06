import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { TEXTS } from '../../src/constants/texts.js';
import { UI } from '../../src/constants/ui.js';
import {
  handleFavoritePointer,
  handleNextPointer,
  handlePointerToReminder,
  handlePointersMenu,
  handleRandomPointer,
  handleToggleFavoritePointer
} from '../../src/handlers/pointers.js';
import {
  handleBack
} from '../../src/handlers/back.js';
import {
  handleReminderText,
  handleIntervalPreset,
  handleDeleteAfterPreset,
  REMINDER_STEP
} from '../../src/handlers/reminders.js';
import { Pointer, PointerEn } from '../../src/models/Pointer.js';
import Reminder from '../../src/models/Reminder.js';
import User from '../../src/models/User.js';
import {
  getNextFavoritePointerForUser,
  isPointerInFavorites,
  toggleFavoritePointer
} from '../../src/services/pointers.js';
import { createMockContext } from '../helpers/mockContext.js';

describe('Стресс-тестирование и граничные сценарии избранного', () => {
  it('должен безопасно обрабатывать невалидные, битые и вредоносные pointerId', async () => {
    const userId = 88801;

    const invalidInputs = [
      null,
      undefined,
      '',
      '   ',
      'invalid_object_id',
      12345,
      {},
      [],
      '64f1a2b3c4d5e6f7a8b9c0'
    ];

    for (const badId of invalidInputs) {
      const isFav = await isPointerInFavorites(userId, badId);
      expect(isFav).toBe(false);

      const toggleResult = await toggleFavoritePointer(userId, badId);
      expect(toggleResult.isFavorite).toBe(false);
      expect(toggleResult.totalFavorites).toBe(0);
    }
  });

  it('должен предотвращать дублирование и гонки при многократном переключении', async () => {
    const userId = 88802;
    const pointer = await Pointer.create({
      text: 'Тест на антидублирование',
      isActive: true
    });

    const firstToggle = await toggleFavoritePointer(userId, pointer._id);
    expect(firstToggle.isFavorite).toBe(true);
    expect(firstToggle.totalFavorites).toBe(1);

    const secondToggle = await toggleFavoritePointer(userId, pointer._id);
    expect(secondToggle.isFavorite).toBe(false);
    expect(secondToggle.totalFavorites).toBe(0);

    const thirdToggle = await toggleFavoritePointer(userId, pointer._id);
    expect(thirdToggle.isFavorite).toBe(true);
    expect(thirdToggle.totalFavorites).toBe(1);

    const user = await User.findOne({ telegramId: userId });
    const pointerMatches = user.favoritePointers.filter(
      item => String(item.pointerId) === String(pointer._id)
    );
    expect(pointerMatches.length).toBe(1);
  });

  it('должен корректно очищать удаленные или деактивированные указатели из избранного', async () => {
    const userId = 88803;

    const activePointer = await Pointer.create({
      text: 'Активный указатель',
      isActive: true
    });

    const deletedPointer = await Pointer.create({
      text: 'Указатель под удаление',
      isActive: true
    });

    const deactivatedPointer = await Pointer.create({
      text: 'Деактивированный указатель',
      isActive: true
    });

    await toggleFavoritePointer(userId, activePointer._id);
    await toggleFavoritePointer(userId, deletedPointer._id);
    await toggleFavoritePointer(userId, deactivatedPointer._id);

    await Pointer.deleteOne({ _id: deletedPointer._id });
    await Pointer.updateOne({ _id: deactivatedPointer._id }, { isActive: false });

    const receivedPointer = await getNextFavoritePointerForUser(userId);
    expect(receivedPointer).not.toBeNull();
    expect(String(receivedPointer._id)).toBe(String(activePointer._id));

    const updatedUser = await User.findOne({ telegramId: userId });
    expect(updatedUser.favoritePointers.length).toBe(1);
    expect(String(updatedUser.favoritePointers[0].pointerId)).toBe(String(activePointer._id));
  });

  it('должен находить русский указатель из избранного даже если язык интерфейса пользователя изменен на en', async () => {
    const userId = 88804;
    await User.create({ telegramId: userId, language: 'ru' });

    const ruPointer = await Pointer.create({
      text: 'Русская мудрость в тишине',
      isActive: true
    });

    await toggleFavoritePointer(userId, ruPointer._id);

    await User.updateOne({ telegramId: userId }, { language: 'en' });

    const pointerForEnglishUser = await getNextFavoritePointerForUser(userId);
    expect(pointerForEnglishUser).not.toBeNull();
    expect(pointerForEnglishUser.text).toBe('Русская мудрость в тишине');
  });

  it('должен корректно работать с единственным указателем в избранном при многократных запросах', async () => {
    const userId = 88805;
    const singlePointer = await Pointer.create({
      text: 'Единственный указатель',
      isActive: true
    });

    await toggleFavoritePointer(userId, singlePointer._id);

    for (let index = 0; index < 5; index++) {
      const resultPointer = await getNextFavoritePointerForUser(userId);
      expect(resultPointer).not.toBeNull();
      expect(String(resultPointer._id)).toBe(String(singlePointer._id));
    }
  });

  it('должен поддерживать полный цикл разрыва и смены решения: думал-передумал при создании напоминания', async () => {
    const userId = 88806;
    const pointer = await Pointer.create({
      text: 'Указатель для теста отмены',
      isActive: true
    });
    await toggleFavoritePointer(userId, pointer._id);

    const context = createMockContext({
      userId,
      text: UI.ru.REMINDER_FAVORITE,
      session: {
        reminderStep: REMINDER_STEP.TEXT,
        creatingReminder: { deleteAfterSeconds: 10 }
      }
    });

    await handleFavoritePointer(context);

    expect(context.session.reminderStep).toBe(REMINDER_STEP.INTERVAL);
    expect(context.session.creatingReminder.isFavoritePointer).toBe(true);

    const backContext = createMockContext({
      userId,
      session: context.session
    });

    await handleBack(backContext);

    expect(backContext.session.reminderStep).toBe(REMINDER_STEP.TEXT);

    const changeMindContext = createMockContext({
      userId,
      text: 'Собственный текст после передумывания',
      session: backContext.session
    });

    await handleReminderText(changeMindContext);

    expect(changeMindContext.session.reminderStep).toBe(REMINDER_STEP.INTERVAL);
    expect(changeMindContext.session.creatingReminder.isFavoritePointer).toBe(false);
    expect(changeMindContext.session.creatingReminder.text).toBe('Собственный текст после передумывания');

    await handleIntervalPreset(changeMindContext, 15);
    expect(changeMindContext.session.reminderStep).toBe(REMINDER_STEP.AUTO_DELETE);

    changeMindContext.message.text = '30 сек';
    await handleDeleteAfterPreset(changeMindContext);

    const createdReminder = await Reminder.findOne({ userId: String(userId) });
    expect(createdReminder).not.toBeNull();
    expect(createdReminder.text).toBe('Собственный текст после передумывания');
    expect(createdReminder.isFavoritePointer).toBe(false);
    expect(createdReminder.intervalMinutes).toBe(15);
  });

  it('должен сбрасывать незавершенное создание напоминания при переходе в Указатели', async () => {
    const userId = 88807;
    await Pointer.create({ text: 'Указатель для меню', isActive: true });

    const abandonedContext = createMockContext({
      userId,
      session: {
        reminderStep: REMINDER_STEP.INTERVAL,
        creatingReminder: { text: 'Брошенное напоминание' }
      }
    });

    await handlePointersMenu(abandonedContext);

    expect(abandonedContext.session.reminderStep).toBeNull();
    expect(abandonedContext.session.creatingReminder).toBeNull();
    expect(abandonedContext.session.pointerMode).toBe('random');
  });

  it('должен перенаправлять кнопку 🎲 Случайный в создание напоминания, если сессия находится на шаге TEXT', async () => {
    const userId = 88808;
    const reminderStepContext = createMockContext({
      userId,
      text: UI.ru.REMINDER_RANDOM,
      session: {
        reminderStep: REMINDER_STEP.TEXT,
        creatingReminder: {}
      }
    });

    await handleRandomPointer(reminderStepContext);

    expect(reminderStepContext.session.reminderStep).toBe(REMINDER_STEP.INTERVAL);
    expect(reminderStepContext.session.creatingReminder.isRandomPointer).toBe(true);
    expect(reminderStepContext.session.creatingReminder.isFavoritePointer).toBe(false);
  });

  it('должен плавно обрабатывать удаление указателя из избранного в режиме favorite', async () => {
    const userId = 88809;
    const pointer = await Pointer.create({
      text: 'Указатель для удаления в режиме favorite',
      isActive: true
    });
    await toggleFavoritePointer(userId, pointer._id);

    const toggleContext = createMockContext({
      userId,
      callbackData: `pointer:fav_toggle:${pointer._id}:favorite`,
      session: { pointerMode: 'favorite', lastPointerId: String(pointer._id) }
    });

    await handleToggleFavoritePointer(toggleContext);

    expect(toggleContext.answerCbQuery).toHaveBeenCalledWith(TEXTS.ru.POINTERS.FAVORITE_REMOVED);
    expect(toggleContext.editMessageReplyMarkup).toHaveBeenCalled();

    const nextContext = createMockContext({
      userId,
      callbackData: 'pointer:next:favorite',
      session: { pointerMode: 'favorite' }
    });

    await handleNextPointer(nextContext);

    expect(nextContext.editMessageText).toHaveBeenCalledWith(TEXTS.ru.POINTERS.FAVORITE_EMPTY);
  });

  it('должен безопасно выдерживать пустые сессии и отсутствующие свойства', async () => {
    const userId = 88810;
    await Pointer.create({ text: 'Указатель для пустой сессии', isActive: true });

    const emptySessionContext = createMockContext({
      userId,
      session: {}
    });

    await handleNextPointer(emptySessionContext);
    expect(emptySessionContext.reply).toHaveBeenCalled();

    const emptyPointerToReminderContext = createMockContext({
      userId,
      session: {}
    });
    await handlePointerToReminder(emptyPointerToReminderContext);
    expect(emptyPointerToReminderContext.reply).not.toHaveBeenCalled();

    const emptyToggleContext = createMockContext({
      userId,
      session: {},
      callbackData: 'pointer:fav_toggle'
    });
    await handleToggleFavoritePointer(emptyToggleContext);
    expect(emptyToggleContext.answerCbQuery).toHaveBeenCalled();
  });
});
