import { describe, expect, it } from 'vitest';
import {
  handleLanguageMenu,
  handleLanguageSet,
  handleSettings
} from '../../src/handlers/settings/quietHours.js';
import User from '../../src/models/User.js';
import { Pointer, PointerEn } from '../../src/models/Pointer.js';
import { createMockContext } from '../helpers/mockContext.js';
import { activityMiddleware } from '../../src/middlewares/activity.js';
import { getNextPointerForUser } from '../../src/services/pointers.js';

describe('Мультиязычность и переключение языков', () => {
  it('должен открывать меню выбора языка с русскими и английскими кнопками', async () => {
    const telegramUserId = 55667788;
    const mockContext = createMockContext({ userId: telegramUserId });

    await handleLanguageMenu(mockContext);

    expect(mockContext.reply).toHaveBeenCalled();
    const [replyText, replyKeyboard] = mockContext.reply.mock.calls[0];
    expect(replyText).toContain('Выберите язык');

    const inlineButtons = replyKeyboard.reply_markup.inline_keyboard.flat();
    const buttonTexts = inlineButtons.map(item => item.text);
    expect(buttonTexts).toContain('🇷🇺 Русский');
    expect(buttonTexts).toContain('🇬🇧 English');
  });

  it('должен переключать язык на английский и обнулять очередь перемешивания', async () => {
    const telegramUserId = 66778899;
    await User.create({
      telegramId: telegramUserId,
      language: 'ru',
      shuffleQueue: [5, 4, 3, 2, 1],
      shuffleIndex: 3
    });

    const mockContext = createMockContext({
      userId: telegramUserId,
      callbackData: 'settings:language:set:en'
    });

    await handleLanguageSet(mockContext);

    const updatedUser = await User.findOne({ telegramId: telegramUserId });
    expect(updatedUser.language).toBe('en');
    expect(updatedUser.shuffleIndex).toBe(0);
    expect(updatedUser.shuffleQueue).toEqual([]);

    expect(mockContext.reply).toHaveBeenCalled();
    const replyText = mockContext.reply.mock.calls[0][0];
    expect(replyText).toContain('Language switched to English');
  });

  it('должен по умолчанию устанавливать русский язык для всех пользователей', async () => {
    const russianSpeakerId = 11122233;
    const russianContext = createMockContext({
      userId: russianSpeakerId,
      customUpdate: {
        message: {
          from: { id: russianSpeakerId, language_code: 'ru-RU' },
          text: '/start'
        }
      }
    });
    russianContext.from.language_code = 'ru-RU';

    let nextHandlerCalled = false;
    await activityMiddleware(russianContext, async () => {
      nextHandlerCalled = true;
    });

    expect(nextHandlerCalled).toBe(true);
    const createdRussianUser = await User.findOne({ telegramId: russianSpeakerId });
    expect(createdRussianUser.language).toBe('ru');

    const foreignSpeakerId = 44455566;
    const foreignContext = createMockContext({
      userId: foreignSpeakerId,
      customUpdate: {
        message: {
          from: { id: foreignSpeakerId, language_code: 'fr' },
          text: '/start'
        }
      }
    });
    foreignContext.from.language_code = 'fr';

    await activityMiddleware(foreignContext, async () => {});

    const createdForeignUser = await User.findOne({ telegramId: foreignSpeakerId });
    expect(createdForeignUser.language).toBe('en');
  });

  it('должен выдавать указатели на выбранном языке пользователя', async () => {
    const englishUserId = 99887766;
    await User.create({
      telegramId: englishUserId,
      language: 'en'
    });

    await Pointer.deleteMany({});
    await PointerEn.deleteMany({});
    await Pointer.create({
      text: 'Русский текст указателя',
      source: 'Автор',
      tags: ['тишина'],
      isActive: true
    });
    await PointerEn.create({
      text: 'English pointer text',
      source: 'Author',
      tags: ['stillness'],
      isActive: true
    });

    const receivedPointer = await getNextPointerForUser(englishUserId);
    expect(receivedPointer).not.toBeNull();
    expect(receivedPointer.text).toBe('English pointer text');

    const silencePointer = await getNextPointerForUser(englishUserId, 'тишина');
    expect(silencePointer).not.toBeNull();
    expect(silencePointer.tags).toContain('stillness');
  });
});
