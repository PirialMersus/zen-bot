import { describe, expect, it } from 'vitest';
import {
  handleLanguageMenu,
  handleLanguageSet,
  handleSettings
} from '../../src/handlers/settings/quietHours.js';
import User from '../../src/models/User.js';
import { Pointer, PointerEn, PointerEs } from '../../src/models/Pointer.js';
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
    expect(buttonTexts).toContain('🇺🇦 Українська');
    expect(buttonTexts).toContain('🇪🇸 Español');
  });

  it('должен переключать язык на испанский и отправлять подтверждение на испанском языке', async () => {
    const telegramUserId = 66778822;
    await User.create({
      telegramId: telegramUserId,
      language: 'ru',
      shuffleQueue: [5, 4, 3, 2, 1],
      shuffleIndex: 2
    });

    const mockContext = createMockContext({
      userId: telegramUserId,
      callbackData: 'settings:language:set:es'
    });

    await handleLanguageSet(mockContext);

    const updatedUser = await User.findOne({ telegramId: telegramUserId });
    expect(updatedUser.language).toBe('es');
    expect(updatedUser.shuffleIndex).toBe(2);
    expect(updatedUser.shuffleQueue).toEqual([5, 4, 3, 2, 1]);

    expect(mockContext.reply).toHaveBeenCalled();
    const replyText = mockContext.reply.mock.calls[0][0];
    expect(replyText).toContain('Idioma cambiado a Español');
  });

  it('должен переключать язык на украинский и отправлять подтверждение на украинском языке', async () => {
    const telegramUserId = 66778811;
    await User.create({
      telegramId: telegramUserId,
      language: 'ru',
      shuffleQueue: [5, 4, 3, 2, 1],
      shuffleIndex: 2
    });

    const mockContext = createMockContext({
      userId: telegramUserId,
      callbackData: 'settings:language:set:uk'
    });

    await handleLanguageSet(mockContext);

    const updatedUser = await User.findOne({ telegramId: telegramUserId });
    expect(updatedUser.language).toBe('uk');
    expect(updatedUser.shuffleIndex).toBe(2);
    expect(updatedUser.shuffleQueue).toEqual([5, 4, 3, 2, 1]);

    expect(mockContext.reply).toHaveBeenCalled();
    const replyText = mockContext.reply.mock.calls[0][0];
    expect(replyText).toContain('Мову змінено на Українську');
  });

  it('должен переключать язык на английский и сохранять прогресс очереди перемешивания без обнуления', async () => {
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
    expect(updatedUser.shuffleIndex).toBe(3);
    expect(updatedUser.shuffleQueue).toEqual([5, 4, 3, 2, 1]);

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

    const ukrainianSpeakerId = 77788899;
    const ukrainianContext = createMockContext({
      userId: ukrainianSpeakerId,
      customUpdate: {
        message: {
          from: { id: ukrainianSpeakerId, language_code: 'uk' },
          text: '/start'
        }
      }
    });
    ukrainianContext.from.language_code = 'uk';

    await activityMiddleware(ukrainianContext, async () => {});

    const createdUkrainianUser = await User.findOne({ telegramId: ukrainianSpeakerId });
    expect(createdUkrainianUser.language).toBe('uk');

    const spanishSpeakerId = 77788811;
    const spanishContext = createMockContext({
      userId: spanishSpeakerId,
      customUpdate: {
        message: {
          from: { id: spanishSpeakerId, language_code: 'es' },
          text: '/start'
        }
      }
    });
    spanishContext.from.language_code = 'es';

    await activityMiddleware(spanishContext, async () => {});

    const createdSpanishUser = await User.findOne({ telegramId: spanishSpeakerId });
    expect(createdSpanishUser.language).toBe('es');
  });

  it('должен выдавать указатели на выбранном языке пользователя', async () => {
    const englishUserId = 99887766;
    await User.create({
      telegramId: englishUserId,
      language: 'en'
    });

    await Pointer.deleteMany({});
    await PointerEn.deleteMany({});
    await PointerEs.deleteMany({});
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
    await PointerEs.create({
      text: 'Texto de puntero en español',
      source: 'Autor',
      tags: ['silencio'],
      isActive: true
    });

    const receivedPointer = await getNextPointerForUser(englishUserId);
    expect(receivedPointer).not.toBeNull();
    expect(receivedPointer.text).toBe('English pointer text');

    const silencePointer = await getNextPointerForUser(englishUserId, 'тишина');
    expect(silencePointer).not.toBeNull();
    expect(silencePointer.tags).toContain('stillness');

    const spanishUserId = 99887755;
    await User.create({
      telegramId: spanishUserId,
      language: 'es'
    });

    const receivedSpanishPointer = await getNextPointerForUser(spanishUserId);
    expect(receivedSpanishPointer).not.toBeNull();
    expect(receivedSpanishPointer.text).toBe('Texto de puntero en español');

    const silenceSpanishPointer = await getNextPointerForUser(spanishUserId, 'тишина');
    expect(silenceSpanishPointer).not.toBeNull();
    expect(silenceSpanishPointer.tags).toContain('silencio');
  });

  it('должен сохранять прогресс очереди указателей при переключении языка между русским и английским', async () => {
    const switchingLanguageUserId = 77889900;

    await Pointer.deleteMany({});
    await PointerEn.deleteMany({});

    await Pointer.create([
      { number: 1, text: 'Русский указатель 1', isActive: true },
      { number: 2, text: 'Русский указатель 2', isActive: true },
      { number: 3, text: 'Русский указатель 3', isActive: true }
    ]);

    await PointerEn.create([
      { number: 1, text: 'English pointer 1', isActive: true },
      { number: 2, text: 'English pointer 2', isActive: true },
      { number: 3, text: 'English pointer 3', isActive: true }
    ]);

    await User.create({
      telegramId: switchingLanguageUserId,
      language: 'ru',
      shuffleQueue: [0, 1, 2],
      shuffleIndex: 0
    });

    const firstPointerInRussian = await getNextPointerForUser(switchingLanguageUserId);
    expect(firstPointerInRussian.text).toBe('Русский указатель 1');

    const userStateAfterFirstRead = await User.findOne({ telegramId: switchingLanguageUserId });
    expect(userStateAfterFirstRead.shuffleIndex).toBe(1);

    const switchLanguageContext = createMockContext({
      userId: switchingLanguageUserId,
      callbackData: 'settings:language:set:en'
    });
    await handleLanguageSet(switchLanguageContext);

    const userStateAfterLanguageSwitch = await User.findOne({ telegramId: switchingLanguageUserId });
    expect(userStateAfterLanguageSwitch.language).toBe('en');
    expect(userStateAfterLanguageSwitch.shuffleIndex).toBe(1);
    expect(userStateAfterLanguageSwitch.shuffleQueue).toEqual([0, 1, 2]);

    const secondPointerInEnglish = await getNextPointerForUser(switchingLanguageUserId);
    expect(secondPointerInEnglish.text).toBe('English pointer 2');

    const userStateAfterSecondRead = await User.findOne({ telegramId: switchingLanguageUserId });
    expect(userStateAfterSecondRead.shuffleIndex).toBe(2);
  });
});
