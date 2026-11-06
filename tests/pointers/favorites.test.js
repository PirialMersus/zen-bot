import { describe, expect, it } from 'vitest';
import { TEXTS } from '../../src/constants/texts.js';
import { UI } from '../../src/constants/ui.js';
import {
  handleFavoritePointer,
  handleNextPointer,
  handlePointer,
  handleRandomPointer,
  handleToggleFavoritePointer
} from '../../src/handlers/pointers.js';
import {
  handleAdminSearchPointers,
  handleAdminGetPointerByNumber
} from '../../src/handlers/admin.js';
import {
  handleReminderText,
  formatReminderMessageText,
  REMINDER_STEP
} from '../../src/handlers/reminders.js';
import { Pointer } from '../../src/models/Pointer.js';
import User from '../../src/models/User.js';
import {
  getNextFavoritePointerForUser,
  isPointerInFavorites,
  toggleFavoritePointer
} from '../../src/services/pointers.js';
import { createMockContext } from '../helpers/mockContext.js';

describe('Избранные указатели', () => {
  it('должен корректно добавлять и удалять указатель из избранного', async () => {
    const userId = 9001;
    const pointer = await Pointer.create({
      text: 'Будь в настоящем',
      isActive: true
    });

    const initialFavoriteState = await isPointerInFavorites(userId, pointer._id);
    expect(initialFavoriteState).toBe(false);

    const addResult = await toggleFavoritePointer(userId, pointer._id);
    expect(addResult.isFavorite).toBe(true);
    expect(addResult.totalFavorites).toBe(1);

    const isFavAfterAdd = await isPointerInFavorites(userId, pointer._id);
    expect(isFavAfterAdd).toBe(true);

    const removeResult = await toggleFavoritePointer(userId, pointer._id);
    expect(removeResult.isFavorite).toBe(false);
    expect(removeResult.totalFavorites).toBe(0);

    const isFavAfterRemove = await isPointerInFavorites(userId, pointer._id);
    expect(isFavAfterRemove).toBe(false);
  });

  it('должен отображать кнопку Добавить в избранное для обычного указателя и Удалить для избранного', async () => {
    const userId = 9002;
    const pointer = await Pointer.create({
      text: 'Внутренняя тишина',
      isActive: true
    });

    const mockContextNotFavorite = createMockContext({ userId });
    await handlePointer(mockContextNotFavorite);

    const [, optionsNotFav] = mockContextNotFavorite.reply.mock.calls[0];
    const buttonsNotFav = optionsNotFav.reply_markup.inline_keyboard.flat().map(button => button.text);
    expect(buttonsNotFav).toContain(UI.ru.POINTER_FAV_ADD);

    await toggleFavoritePointer(userId, pointer._id);

    const mockContextFavorite = createMockContext({ userId });
    await handlePointer(mockContextFavorite);

    const [, optionsFav] = mockContextFavorite.reply.mock.calls[0];
    const buttonsFav = optionsFav.reply_markup.inline_keyboard.flat().map(button => button.text);
    expect(buttonsFav).toContain(UI.ru.POINTER_FAV_REMOVE);
  });

  it('должен переключать статус избранного через inline callback', async () => {
    const userId = 9003;
    const pointer = await Pointer.create({
      text: 'Осознанность сейчас',
      isActive: true
    });

    const toggleContext = createMockContext({
      userId,
      callbackData: `pointer:fav_toggle:${pointer._id}:random`
    });

    await handleToggleFavoritePointer(toggleContext);

    expect(toggleContext.answerCbQuery).toHaveBeenCalledWith(TEXTS.ru.POINTERS.FAVORITE_ADDED);
    expect(toggleContext.editMessageReplyMarkup).toHaveBeenCalled();

    const isFavNow = await isPointerInFavorites(userId, pointer._id);
    expect(isFavNow).toBe(true);

    const untoggleContext = createMockContext({
      userId,
      callbackData: `pointer:fav_toggle:${pointer._id}:random`
    });

    await handleToggleFavoritePointer(untoggleContext);

    expect(untoggleContext.answerCbQuery).toHaveBeenCalledWith(TEXTS.ru.POINTERS.FAVORITE_REMOVED);
    const isFavAfterSecondToggle = await isPointerInFavorites(userId, pointer._id);
    expect(isFavAfterSecondToggle).toBe(false);
  });

  it('должен сообщать, если у пользователя нет избранных при выборе Из избранного', async () => {
    const userId = 9004;
    const emptyContext = createMockContext({ userId });

    await handleFavoritePointer(emptyContext);

    expect(emptyContext.reply).toHaveBeenCalledWith(TEXTS.ru.POINTERS.FAVORITE_EMPTY);
  });

  it('должен выдавать сохраненный указатель при вызове handleFavoritePointer', async () => {
    const userId = 9005;
    const pointer = await Pointer.create({
      text: 'Избранное напоминание о тишине',
      isActive: true
    });

    await toggleFavoritePointer(userId, pointer._id);

    const favContext = createMockContext({ userId });
    await handleFavoritePointer(favContext);

    expect(favContext.reply).toHaveBeenCalled();
    const [replyText, replyOptions] = favContext.reply.mock.calls[0];
    expect(replyText).toContain('Избранное напоминание о тишине');

    const buttons = replyOptions.reply_markup.inline_keyboard.flat().map(button => button.text);
    expect(buttons).toContain(UI.ru.POINTER_FAV_REMOVE);
  });

  it('должен предупреждать при создании напоминания из избранного, если избранное пусто', async () => {
    const userId = 9006;
    const reminderContext = createMockContext({
      userId,
      text: UI.ru.REMINDER_FAVORITE,
      session: {
        reminderStep: REMINDER_STEP.TEXT,
        creatingReminder: {}
      }
    });

    await handleReminderText(reminderContext);

    expect(reminderContext.reply).toHaveBeenCalledWith(TEXTS.ru.POINTERS.FAVORITE_REMINDER_EMPTY);
    expect(reminderContext.session.reminderStep).toBe(REMINDER_STEP.TEXT);
  });

  it('должен переводить в шаг выбора интервала при создании напоминания из избранного, если избранные есть', async () => {
    const userId = 9007;
    const pointer = await Pointer.create({
      text: 'Текст для избранного',
      isActive: true
    });
    await toggleFavoritePointer(userId, pointer._id);

    const reminderContext = createMockContext({
      userId,
      text: UI.ru.REMINDER_FAVORITE,
      session: {
        reminderStep: REMINDER_STEP.TEXT,
        creatingReminder: {}
      }
    });

    await handleReminderText(reminderContext);

    expect(reminderContext.session.reminderStep).toBe(REMINDER_STEP.INTERVAL);
    expect(reminderContext.session.creatingReminder.isFavoritePointer).toBe(true);
  });

  it('должен форматировать карточку напоминания с типом Из избранного', () => {
    const reminderItem = {
      id: 'mock_reminder_id',
      text: 'Некоторый текст',
      isFavoritePointer: true,
      isActive: true,
      intervalMinutes: 60,
      deleteAfterSeconds: null,
      nextRunAt: null
    };

    const formattedMessage = formatReminderMessageText(reminderItem, '1', 'ru');
    expect(formattedMessage).toContain(`«${UI.ru.REMINDER_FAVORITE}»`);
  });

  it('должен позволять администратору добавлять в избранное указатели, найденные через /find', async () => {
    const adminId = 99990001;
    process.env.CREATOR_ID = String(adminId);

    const pointerOne = await Pointer.create({
      number: 101,
      text: 'Указатель админа номер один про бесконечность',
      isActive: true
    });

    const searchContext = createMockContext({
      userId: adminId,
      text: '/find бесконечность'
    });

    await handleAdminSearchPointers(searchContext);

    expect(searchContext.reply).toHaveBeenCalled();
    const [, replyOptions] = searchContext.reply.mock.calls[0];
    const inlineButtons = replyOptions.reply_markup.inline_keyboard.flat();

    const favButton = inlineButtons.find(button => button.callback_data?.startsWith('pointer:fav_toggle'));
    expect(favButton).toBeDefined();
    expect(favButton.text).toBe(UI.ru.POINTER_FAV_ADD);
    expect(favButton.callback_data).toBe(`pointer:fav_toggle:${pointerOne._id}:random`);

    const toggleContext = createMockContext({
      userId: adminId,
      callbackData: favButton.callback_data
    });

    await handleToggleFavoritePointer(toggleContext);

    const isFavNow = await isPointerInFavorites(adminId, pointerOne._id);
    expect(isFavNow).toBe(true);

    const secondSearchContext = createMockContext({
      userId: adminId,
      text: '/find бесконечность'
    });

    await handleAdminSearchPointers(secondSearchContext);
    const [, secondReplyOptions] = secondSearchContext.reply.mock.calls[0];
    const secondInlineButtons = secondReplyOptions.reply_markup.inline_keyboard.flat();
    const secondFavButton = secondInlineButtons.find(button => button.callback_data?.startsWith('pointer:fav_toggle'));

    expect(secondFavButton.text).toBe(UI.ru.POINTER_FAV_REMOVE);
  });

  it('должен корректно добавлять несколько указателей из результатов админского поиска', async () => {
    const adminId = 99990002;
    process.env.CREATOR_ID = String(adminId);

    const first = await Pointer.create({
      number: 201,
      text: 'Солнечный свет сквозь облака',
      isActive: true
    });

    const second = await Pointer.create({
      number: 202,
      text: 'Солнечный день в глубине сознания',
      isActive: true
    });

    const searchContext = createMockContext({
      userId: adminId,
      text: '/find солнечный'
    });

    await handleAdminSearchPointers(searchContext);

    expect(searchContext.reply).toHaveBeenCalledTimes(2);

    const firstMsgOptions = searchContext.reply.mock.calls[0][1];
    const secondMsgOptions = searchContext.reply.mock.calls[1][1];

    const firstFavBtn = firstMsgOptions.reply_markup.inline_keyboard.flat().find(b => b.callback_data?.includes(String(first._id)));
    const secondFavBtn = secondMsgOptions.reply_markup.inline_keyboard.flat().find(b => b.callback_data?.includes(String(second._id)));

    expect(firstFavBtn).toBeDefined();
    expect(secondFavBtn).toBeDefined();

    await handleToggleFavoritePointer(createMockContext({ userId: adminId, callbackData: firstFavBtn.callback_data }));
    await handleToggleFavoritePointer(createMockContext({ userId: adminId, callbackData: secondFavBtn.callback_data }));

    const isFirstFav = await isPointerInFavorites(adminId, first._id);
    const isSecondFav = await isPointerInFavorites(adminId, second._id);

    expect(isFirstFav).toBe(true);
    expect(isSecondFav).toBe(true);

    const adminUser = await User.findOne({ telegramId: adminId });
    expect(adminUser.favoritePointers).toHaveLength(2);

    const nextFavOne = await getNextFavoritePointerForUser(adminId);
    const nextFavTwo = await getNextFavoritePointerForUser(adminId);

    expect(nextFavOne).not.toBeNull();
    expect(nextFavTwo).not.toBeNull();
    const ids = [String(nextFavOne._id), String(nextFavTwo._id)];
    expect(ids).toContain(String(first._id));
    expect(ids).toContain(String(second._id));
  });
});
