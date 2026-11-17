import { describe, expect, it, beforeEach } from 'vitest';
import { Pointer } from '../../src/models/Pointer.js';
import User from '../../src/models/User.js';
import {
  handlePointer,
  handleNextPointer,
  handlePrevPointer,
  handleFavoritePointer
} from '../../src/handlers/pointers.js';
import { handleBack, handleCancel } from '../../src/handlers/back.js';
import { registerBotCommands } from '../../src/bot.js';
import { createMockContext } from '../helpers/mockContext.js';
import { UI } from '../../src/constants/ui.js';
import { clearUserCache } from '../../src/middlewares/activity.js';

describe('Навигация по указателям: Предыдущий и Следующий (History Navigation)', () => {
  beforeEach(async () => {
    clearUserCache();
    await Pointer.deleteMany({});
    await User.deleteMany({});
  });

  it('на первом указателе не должен показывать кнопку Предыдущий', async () => {
    await Pointer.create({
      number: 1,
      text: 'Первый указатель',
      isActive: true
    });

    const mockUserContext = createMockContext({ userId: 5001 });
    await handlePointer(mockUserContext);

    expect(mockUserContext.reply).toHaveBeenCalledTimes(1);
    const [, replyOptions] = mockUserContext.reply.mock.calls[0];
    const keyboardRows = replyOptions.reply_markup.inline_keyboard;
    const navigationRow = keyboardRows[keyboardRows.length - 1];

    expect(navigationRow).toHaveLength(1);
    expect(navigationRow[0].text).toBe(UI.ru.POINTER_NEXT);
    expect(navigationRow[0].callback_data).toBe('pointer:next:random');
    expect(mockUserContext.session.pointerHistoryIndex).toBe(0);
  });

  it('при переходе на следующий указатель должен показывать кнопку Предыдущий', async () => {
    await Pointer.create([
      { number: 1, text: 'Указатель А', isActive: true },
      { number: 2, text: 'Указатель Б', isActive: true }
    ]);

    const mockUserContext = createMockContext({ userId: 5002 });
    await handlePointer(mockUserContext);

    const nextCallbackContext = createMockContext({
      userId: 5002,
      callbackData: 'pointer:next:random',
      session: mockUserContext.session
    });

    await handleNextPointer(nextCallbackContext);

    expect(nextCallbackContext.editMessageText).toHaveBeenCalledTimes(1);
    const [, editOptions] = nextCallbackContext.editMessageText.mock.calls[0];
    const keyboardRows = editOptions.reply_markup.inline_keyboard;
    const navigationRow = keyboardRows[keyboardRows.length - 1];

    expect(navigationRow).toHaveLength(2);
    expect(navigationRow[0].text).toBe(UI.ru.POINTER_PREV);
    expect(navigationRow[0].callback_data).toBe('pointer:prev:random');
    expect(navigationRow[1].text).toBe(UI.ru.POINTER_NEXT);
    expect(navigationRow[1].callback_data).toBe('pointer:next:random');
    expect(nextCallbackContext.session.pointerHistoryIndex).toBe(1);
  });

  it('должен корректно возвращаться назад и снова вперед по истории просмотров', async () => {
    const pointerFirst = await Pointer.create({ number: 1, text: 'Цитата 1', isActive: true });
    const pointerSecond = await Pointer.create({ number: 2, text: 'Цитата 2', isActive: true });
    const pointerThird = await Pointer.create({ number: 3, text: 'Цитата 3', isActive: true });

    const sharedSession = {
      pointerHistory: [String(pointerFirst._id), String(pointerSecond._id), String(pointerThird._id)],
      pointerHistoryIndex: 2,
      pointerMode: 'random',
      lastPointerId: String(pointerThird._id),
      lastPointerText: 'Цитата 3'
    };

    const previousStepContext = createMockContext({
      userId: 5003,
      callbackData: 'pointer:prev:random',
      session: sharedSession
    });

    await handlePrevPointer(previousStepContext);

    expect(previousStepContext.editMessageText).toHaveBeenCalledTimes(1);
    const [secondCardText, secondCardOptions] = previousStepContext.editMessageText.mock.calls[0];
    expect(secondCardText).toContain('Цитата 2');
    expect(sharedSession.pointerHistoryIndex).toBe(1);

    const secondCardNavRow = secondCardOptions.reply_markup.inline_keyboard[1];
    expect(secondCardNavRow).toHaveLength(2);
    expect(secondCardNavRow[0].text).toBe(UI.ru.POINTER_PREV);

    const firstStepContext = createMockContext({
      userId: 5003,
      callbackData: 'pointer:prev:random',
      session: sharedSession
    });

    await handlePrevPointer(firstStepContext);

    expect(firstStepContext.editMessageText).toHaveBeenCalledTimes(1);
    const [firstCardText, firstCardOptions] = firstStepContext.editMessageText.mock.calls[0];
    expect(firstCardText).toContain('Цитата 1');
    expect(sharedSession.pointerHistoryIndex).toBe(0);

    const firstCardNavRow = firstCardOptions.reply_markup.inline_keyboard[1];
    expect(firstCardNavRow).toHaveLength(1);
    expect(firstCardNavRow[0].text).toBe(UI.ru.POINTER_NEXT);

    const forwardStepContext = createMockContext({
      userId: 5003,
      callbackData: 'pointer:next:random',
      session: sharedSession
    });

    await handleNextPointer(forwardStepContext);

    expect(forwardStepContext.editMessageText).toHaveBeenCalledTimes(1);
    const [restoredSecondCardText] = forwardStepContext.editMessageText.mock.calls[0];
    expect(restoredSecondCardText).toContain('Цитата 2');
    expect(sharedSession.pointerHistoryIndex).toBe(1);
  });

  it('должен сбрасывать историю указателей при возврате в главное меню через handleBack', async () => {
    const sessionWithHistory = {
      reminderStep: null,
      pointerHistory: ['id1', 'id2'],
      pointerHistoryIndex: 1,
      favoriteHistory: [{ id: 'fav1', current: 1, total: 2 }],
      favoriteHistoryIndex: 0
    };

    const backContext = createMockContext({
      userId: 5004,
      session: sessionWithHistory
    });

    await handleBack(backContext);

    expect(sessionWithHistory.pointerHistory).toBeNull();
    expect(sessionWithHistory.pointerHistoryIndex).toBeNull();
    expect(sessionWithHistory.favoriteHistory).toBeNull();
    expect(sessionWithHistory.favoriteHistoryIndex).toBeNull();
  });

  it('должен сбрасывать историю указателей при вызове handleCancel', async () => {
    const sessionWithHistory = {
      pointerHistory: ['id1'],
      pointerHistoryIndex: 0,
      favoriteHistory: [{ id: 'fav1' }],
      favoriteHistoryIndex: 0
    };

    const cancelContext = createMockContext({
      userId: 5005,
      session: sessionWithHistory
    });

    await handleCancel(cancelContext);

    expect(sessionWithHistory.pointerHistory).toBeNull();
    expect(sessionWithHistory.pointerHistoryIndex).toBeNull();
    expect(sessionWithHistory.favoriteHistory).toBeNull();
    expect(sessionWithHistory.favoriteHistoryIndex).toBeNull();
  });

  it('должен поддерживать листание назад и вперед в режиме избранного', async () => {
    const pointerA = await Pointer.create({ number: 10, text: 'Избранное А', isActive: true });
    const pointerB = await Pointer.create({ number: 20, text: 'Избранное Б', isActive: true });

    await User.create({
      telegramId: 5006,
      favoritePointers: [
        { pointerId: pointerA._id },
        { pointerId: pointerB._id }
      ]
    });

    const initialFavoriteContext = createMockContext({ userId: 5006 });
    await handleFavoritePointer(initialFavoriteContext);

    expect(initialFavoriteContext.reply).toHaveBeenCalledTimes(1);
    const [, initialOptions] = initialFavoriteContext.reply.mock.calls[0];
    const initialNavRow = initialOptions.reply_markup.inline_keyboard[2];
    expect(initialNavRow).toHaveLength(1);
    expect(initialNavRow[0].text).toBe(UI.ru.POINTER_NEXT_FAV);

    const nextFavoriteContext = createMockContext({
      userId: 5006,
      callbackData: 'pointer:next:favorite',
      session: initialFavoriteContext.session
    });

    await handleNextPointer(nextFavoriteContext);

    expect(nextFavoriteContext.editMessageText).toHaveBeenCalledTimes(1);
    const [, nextOptions] = nextFavoriteContext.editMessageText.mock.calls[0];
    const nextNavRow = nextOptions.reply_markup.inline_keyboard[2];
    expect(nextNavRow).toHaveLength(2);
    expect(nextNavRow[0].text).toBe(UI.ru.POINTER_PREV_FAV);
    expect(nextNavRow[1].text).toBe(UI.ru.POINTER_NEXT_FAV);

    const prevFavoriteContext = createMockContext({
      userId: 5006,
      callbackData: 'pointer:prev:favorite',
      session: initialFavoriteContext.session
    });

    await handlePrevPointer(prevFavoriteContext);

    expect(prevFavoriteContext.editMessageText).toHaveBeenCalledTimes(1);
    const [, prevOptions] = prevFavoriteContext.editMessageText.mock.calls[0];
    const prevNavRow = prevOptions.reply_markup.inline_keyboard[2];
    expect(prevNavRow).toHaveLength(1);
    expect(prevNavRow[0].text).toBe(UI.ru.POINTER_NEXT_FAV);
  });

  it('должен корректно регистрировать команды бота: только /start, /help и /find', async () => {
    const mockBot = {
      telegram: {
        setMyCommands: vi.fn().mockResolvedValue(true)
      }
    };

    await registerBotCommands(mockBot);

    expect(mockBot.telegram.setMyCommands).toHaveBeenCalledTimes(4);
    const registeredCommandsRussian = mockBot.telegram.setMyCommands.mock.calls[0][0];
    const commandNames = registeredCommandsRussian.map((commandItem) => commandItem.command);
    expect(commandNames).toEqual(['start', 'help', 'find']);
  });
});