import { describe, expect, it } from 'vitest';
import { Pointer, PointerEn, PointerUk, PointerEs } from '../../src/models/Pointer.js';
import User from '../../src/models/User.js';
import { getNextPointerForUser } from '../../src/services/pointers.js';
import { activityMiddleware, resolveUserLanguage } from '../../src/middlewares/activity.js';
import { handleNextPointer, handlePointer, handlePointerToReminder } from '../../src/handlers/pointers.js';
import { createMockContext } from '../helpers/mockContext.js';
import russianPointersDataset from '../../data/pointers.ru.js';
import englishPointersDataset from '../../data/pointers.en.js';
import ukrainianPointersDataset from '../../data/pointers.uk.js';
import spanishPointersDataset from '../../data/pointers.es.js';

describe('Изоляция языков и защита от утечки английского контента', () => {
  it('должен отдавать только русские указатели пользователю без языка при наличии активных английских указателей в базе', async () => {
    const defaultUserTelegramId = 88112233;

    await Pointer.create([
      { text: 'Русский указатель 1', isActive: true, tags: ['тишина'] },
      { text: 'Русский указатель 2', isActive: true, tags: ['тишина'] },
      { text: 'Русский указатель 3', isActive: true, tags: ['тишина'] }
    ]);

    await PointerEn.create([
      { text: 'English pointer 1', isActive: true, tags: ['stillness'] },
      { text: 'English pointer 2', isActive: true, tags: ['stillness'] },
      { text: 'English pointer 3', isActive: true, tags: ['stillness'] }
    ]);

    const cyrillicCharactersRegularExpression = /[а-яА-ЯёЁ]/;

    for (let iterationIndex = 0; iterationIndex < 15; iterationIndex++) {
      const receivedPointer = await getNextPointerForUser(defaultUserTelegramId);

      expect(receivedPointer).not.toBeNull();
      expect(receivedPointer.text).toMatch(cyrillicCharactersRegularExpression);
      expect(receivedPointer.text).not.toContain('English');
    }
  });

  it('должен отдавать украинские указатели пользователю с украинским языком при наличии PointerUk в базе', async () => {
    const ukrainianUserTelegramId = 88112299;
    await User.create({ telegramId: ukrainianUserTelegramId, language: 'uk' });

    await PointerUk.create([
      { text: 'Український вказівник 1', isActive: true, tags: ['тиша'] },
      { text: 'Український вказівник 2', isActive: true, tags: ['тиша'] }
    ]);

    const receivedPointer = await getNextPointerForUser(ukrainianUserTelegramId);
    expect(receivedPointer).not.toBeNull();
    expect(receivedPointer.text).toContain('Український вказівник');
  });

  it('должен отдавать испанские указатели пользователю с испанским языком при наличии PointerEs в базе', async () => {
    const spanishUserTelegramId = 88112288;
    await User.create({ telegramId: spanishUserTelegramId, language: 'es' });

    await PointerEs.create([
      { text: 'Puntero español 1', isActive: true, tags: ['silencio'] },
      { text: 'Puntero español 2', isActive: true, tags: ['silencio'] }
    ]);

    const receivedPointer = await getNextPointerForUser(spanishUserTelegramId);
    expect(receivedPointer).not.toBeNull();
    expect(receivedPointer.text).toContain('Puntero español');
  });

  it('должен корректно находить старые русские указатели без поля language', async () => {
    const historicalUserTelegramId = 88112244;

    await Pointer.create([
      { text: 'Исторический русский указатель без указания языка', isActive: true, tags: ['тишина'] }
    ]);

    const receivedPointer = await getNextPointerForUser(historicalUserTelegramId);

    expect(receivedPointer).not.toBeNull();
    expect(receivedPointer.text).toBe('Исторический русский указатель без указания языка');
  });

  it('должен автоматически восстанавливать очередь перемешивания при выходе индекса за границы', async () => {
    const brokenQueueUserTelegramId = 88112255;

    await Pointer.create([
      { text: 'Актуальный русский указатель 1', isActive: true },
      { text: 'Актуальный русский указатель 2', isActive: true }
    ]);

    await User.create({
      telegramId: brokenQueueUserTelegramId,
      language: 'ru',
      shuffleIndex: 10,
      shuffleQueue: [999, 1000, 1001, 1002]
    });

    const receivedPointer = await getNextPointerForUser(brokenQueueUserTelegramId);

    expect(receivedPointer).not.toBeNull();

    const updatedUserRecord = await User.findOne({ telegramId: brokenQueueUserTelegramId });
    expect(updatedUserRecord.shuffleQueue.length).toBe(2);
    expect(updatedUserRecord.shuffleIndex).toBeLessThanOrEqual(2);
  });

  it('должен корректно определять язык в middleware в зависимости от кода языка Telegram', async () => {
    const slavicLanguageCodesList = ['ru', 'be'];
    let startTelegramIdCounter = 991000;

    for (const testedTelegramLanguageCode of slavicLanguageCodesList) {
      startTelegramIdCounter++;
      const currentTestTelegramId = startTelegramIdCounter;

      const mockContext = createMockContext({
        userId: currentTestTelegramId,
        customUpdate: {
          message: {
            from: { id: currentTestTelegramId, language_code: testedTelegramLanguageCode },
            text: '/start'
          }
        }
      });
      mockContext.from.language_code = testedTelegramLanguageCode;

      await activityMiddleware(mockContext, async () => {});

      expect(mockContext.state.userLanguage).toBe('ru');

      const registeredUserRecord = await User.findOne({ telegramId: currentTestTelegramId });
      expect(registeredUserRecord).not.toBeNull();
      expect(registeredUserRecord.language).toBe('ru');
    }

    const ukrainianLanguageCodesList = ['uk'];
    for (const testedTelegramLanguageCode of ukrainianLanguageCodesList) {
      startTelegramIdCounter++;
      const currentTestTelegramId = startTelegramIdCounter;

      const mockContext = createMockContext({
        userId: currentTestTelegramId,
        customUpdate: {
          message: {
            from: { id: currentTestTelegramId, language_code: testedTelegramLanguageCode },
            text: '/start'
          }
        }
      });
      mockContext.from.language_code = testedTelegramLanguageCode;

      await activityMiddleware(mockContext, async () => {});

      expect(mockContext.state.userLanguage).toBe('uk');

      const registeredUserRecord = await User.findOne({ telegramId: currentTestTelegramId });
      expect(registeredUserRecord).not.toBeNull();
      expect(registeredUserRecord.language).toBe('uk');
    }

    const spanishLanguageCodesList = ['es'];
    for (const testedTelegramLanguageCode of spanishLanguageCodesList) {
      startTelegramIdCounter++;
      const currentTestTelegramId = startTelegramIdCounter;

      const mockContext = createMockContext({
        userId: currentTestTelegramId,
        customUpdate: {
          message: {
            from: { id: currentTestTelegramId, language_code: testedTelegramLanguageCode },
            text: '/start'
          }
        }
      });
      mockContext.from.language_code = testedTelegramLanguageCode;

      await activityMiddleware(mockContext, async () => {});

      expect(mockContext.state.userLanguage).toBe('es');

      const registeredUserRecord = await User.findOne({ telegramId: currentTestTelegramId });
      expect(registeredUserRecord).not.toBeNull();
      expect(registeredUserRecord.language).toBe('es');
    }

    const foreignLanguageCodesList = ['en', 'fr', 'de', 'it'];
    for (const testedTelegramLanguageCode of foreignLanguageCodesList) {
      startTelegramIdCounter++;
      const currentTestTelegramId = startTelegramIdCounter;

      const mockContext = createMockContext({
        userId: currentTestTelegramId,
        customUpdate: {
          message: {
            from: { id: currentTestTelegramId, language_code: testedTelegramLanguageCode },
            text: '/start'
          }
        }
      });
      mockContext.from.language_code = testedTelegramLanguageCode;

      await activityMiddleware(mockContext, async () => {});

      expect(mockContext.state.userLanguage).toBe('en');

      const registeredUserRecord = await User.findOne({ telegramId: currentTestTelegramId });
      expect(registeredUserRecord).not.toBeNull();
      expect(registeredUserRecord.language).toBe('en');
    }
  });

  it('должен возвращать русский язык при поврежденном значении поля language в профиле', async () => {
    const invalidLanguageValuesList = [null, '', 'unknown', 'deutsch'];
    let userIdentifierSeed = 771100;

    for (const invalidLanguageValue of invalidLanguageValuesList) {
      userIdentifierSeed++;
      const currentUserId = userIdentifierSeed;

      await User.collection.insertOne({
        telegramId: currentUserId,
        language: invalidLanguageValue
      });

      const mockContext = createMockContext({ userId: currentUserId });
      const resolvedLanguage = await resolveUserLanguage(mockContext);
      expect(resolvedLanguage).toBe('ru');

      const receivedPointer = await getNextPointerForUser(currentUserId);
      expect(receivedPointer).toBeNull();
    }
  });

  it('должен в хэндлерах отправлять русские тексты и кнопки если в базе сохранен русский язык даже при английском клиенте', async () => {
    const englishClientUserId = 66554433;

    await User.create({
      telegramId: englishClientUserId,
      language: 'ru'
    });

    await Pointer.create([
      { text: 'Наблюдение за дыханием', isActive: true }
    ]);
    await PointerEn.create([
      { text: 'Observation of breathing', isActive: true }
    ]);

    const mockContext = createMockContext({
      userId: englishClientUserId,
      from: { id: englishClientUserId, language_code: 'en' }
    });

    await handlePointer(mockContext);

    expect(mockContext.reply).toHaveBeenCalled();
    const [firstReplyMessageText, firstReplyMessageKeyboard] = mockContext.reply.mock.calls[0];
    expect(firstReplyMessageText).toContain('Наблюдение за дыханием');

    const inlineKeyboardButtons = firstReplyMessageKeyboard.reply_markup.inline_keyboard.flat();
    const buttonCaptionsList = inlineKeyboardButtons.map(buttonItem => buttonItem.text);
    expect(buttonCaptionsList).toContain('🔔 В напоминание');
    expect(buttonCaptionsList).toContain('➡️ Следующий');

    const nextPointerCallbackMockContext = createMockContext({
      userId: englishClientUserId,
      from: { id: englishClientUserId, language_code: 'en' },
      callbackData: 'pointer:next'
    });

    await handleNextPointer(nextPointerCallbackMockContext);

    expect(nextPointerCallbackMockContext.editMessageText).toHaveBeenCalled();
    const [editedMessageText, editedMessageKeyboard] = nextPointerCallbackMockContext.editMessageText.mock.calls[0];
    expect(editedMessageText).toContain('Наблюдение за дыханием');

    const editedInlineButtons = editedMessageKeyboard.reply_markup.inline_keyboard.flat();
    const editedButtonCaptionsList = editedInlineButtons.map(buttonItem => buttonItem.text);
    expect(editedButtonCaptionsList).toContain('🔔 В напоминание');
    expect(editedButtonCaptionsList).toContain('➡️ Следующий');
  });

  it('должен возвращать null для английского пользователя если английские указатели деактивированы', async () => {
    const englishLanguageUserId = 44332211;

    await Pointer.create([
      { text: 'Русский рабочий указатель', isActive: true }
    ]);
    await PointerEn.create([
      { text: 'Inactive english pointer', isActive: false }
    ]);

    await User.create({
      telegramId: englishLanguageUserId,
      language: 'en'
    });

    const receivedPointer = await getNextPointerForUser(englishLanguageUserId);
    expect(receivedPointer).toBeNull();
  });

  it('должен в режиме создания напоминания из указателя отправлять русские клавиатуры интервалов если в базе сохранен русский язык', async () => {
    const englishClientUserId = 55443322;

    await User.create({
      telegramId: englishClientUserId,
      language: 'ru'
    });

    const mockContext = createMockContext({
      userId: englishClientUserId,
      from: { id: englishClientUserId, language_code: 'en' },
      session: {
        lastPointerText: 'Наблюдай за пространством между мыслями'
      }
    });

    await handlePointerToReminder(mockContext);

    expect(mockContext.reply).toHaveBeenCalled();
    const [replyMessageText, replyMessageOptions] = mockContext.reply.mock.calls[0];
    expect(replyMessageText).toContain('Как часто напоминать:');
    expect(replyMessageText).toContain('Можно выбрать кнопкой или ввести количество минут цифрами');

    const replyMarkup = replyMessageOptions.reply_markup;
    const keyboardRows = replyMarkup.keyboard;
    const flattenedButtons = keyboardRows.flat().map(buttonItem => (typeof buttonItem === 'string' ? buttonItem : buttonItem.text));
    expect(flattenedButtons).toContain('Каждые 5 минут');
    expect(flattenedButtons).toContain('Каждые 15 минут');
    expect(flattenedButtons).toContain('Каждый час');
    expect(flattenedButtons).toContain('Раз в день');
    expect(flattenedButtons).toContain('⬅️ Назад');
    expect(flattenedButtons).not.toContain('Every 5 minutes');
  });

  it('должен гарантировать целостность данных в датасетах указателей', () => {
    expect(russianPointersDataset.length).toBeGreaterThan(100);
    expect(englishPointersDataset.length).toBeGreaterThan(100);
    expect(ukrainianPointersDataset.length).toBe(russianPointersDataset.length);

    const cyrillicRegularExpression = /[а-яА-ЯёЁіІїЇєЄ]/;
    const firstRussianPointer = russianPointersDataset[0];
    expect(firstRussianPointer.text).toMatch(cyrillicRegularExpression);

    const firstEnglishPointer = englishPointersDataset[0];
    expect(firstEnglishPointer.text.length).toBeGreaterThan(5);

    const firstUkrainianPointer = ukrainianPointersDataset[0];
    expect(firstUkrainianPointer.text).toMatch(cyrillicRegularExpression);
  });

  it('должен безопасно откатываться к русской коллекции указателей если коллекция языка пуста', async () => {
    const emptyCollectionUserId = 99887766;

    await User.create({
      telegramId: emptyCollectionUserId,
      language: 'uk'
    });

    await Pointer.create([
      { number: 1, text: 'Русский базовый указатель', isActive: true, tags: ['тишина'] }
    ]);

    const receivedPointer = await getNextPointerForUser(emptyCollectionUserId);
    expect(receivedPointer).not.toBeNull();
    expect(receivedPointer.text).toBe('Русский базовый указатель');
  });

  it('должен поддерживать украинские опции автоудаления в handleDeleteAfterPreset', async () => {
    const { handleDeleteAfterPreset, REMINDER_STEP } = await import('../../src/handlers/reminders.js');
    const Reminder = (await import('../../src/models/Reminder.js')).default;

    const testUserTelegramId = 99887755;
    const mockContextOneMinute = createMockContext({
      userId: testUserTelegramId,
      text: '1 хв',
      session: {
        reminderStep: REMINDER_STEP.AUTO_DELETE,
        creatingReminder: {
          text: 'Тест нагадування',
          intervalMinutes: 60
        }
      }
    });

    await handleDeleteAfterPreset(mockContextOneMinute);
    const savedReminderOneMinute = await Reminder.findOne({ userId: testUserTelegramId, text: 'Тест нагадування' });
    expect(savedReminderOneMinute).not.toBeNull();
    expect(savedReminderOneMinute.deleteAfterSeconds).toBe(60);

    const mockContextNeverDelete = createMockContext({
      userId: testUserTelegramId,
      text: 'Не видаляти',
      session: {
        reminderStep: REMINDER_STEP.AUTO_DELETE,
        creatingReminder: {
          text: 'Тест нагадування 2',
          intervalMinutes: 60
        }
      }
    });

    await handleDeleteAfterPreset(mockContextNeverDelete);
    const savedReminderNeverDelete = await Reminder.findOne({ userId: testUserTelegramId, text: 'Тест нагадування 2' });
    expect(savedReminderNeverDelete).not.toBeNull();
    expect(savedReminderNeverDelete.deleteAfterSeconds).toBeNull();
  });

  it('должен поддерживать испанские опции автоудаления в handleDeleteAfterPreset', async () => {
    const { handleDeleteAfterPreset, REMINDER_STEP } = await import('../../src/handlers/reminders.js');
    const Reminder = (await import('../../src/models/Reminder.js')).default;

    const testUserTelegramId = 99887744;
    const mockContextTenSeconds = createMockContext({
      userId: testUserTelegramId,
      text: '10 seg',
      session: {
        reminderStep: REMINDER_STEP.AUTO_DELETE,
        creatingReminder: {
          text: 'Recordatorio prueba 1',
          intervalMinutes: 15
        }
      }
    });

    await handleDeleteAfterPreset(mockContextTenSeconds);
    const savedReminderTenSeconds = await Reminder.findOne({ userId: testUserTelegramId, text: 'Recordatorio prueba 1' });
    expect(savedReminderTenSeconds).not.toBeNull();
    expect(savedReminderTenSeconds.deleteAfterSeconds).toBe(10);

    const mockContextNoEliminar = createMockContext({
      userId: testUserTelegramId,
      text: 'No eliminar',
      session: {
        reminderStep: REMINDER_STEP.AUTO_DELETE,
        creatingReminder: {
          text: 'Recordatorio prueba 2',
          intervalMinutes: 15
        }
      }
    });

    await handleDeleteAfterPreset(mockContextNoEliminar);
    const savedReminderNoEliminar = await Reminder.findOne({ userId: testUserTelegramId, text: 'Recordatorio prueba 2' });
    expect(savedReminderNoEliminar).not.toBeNull();
    expect(savedReminderNoEliminar.deleteAfterSeconds).toBeNull();
  });

  it('должен иметь идентичный размер испанского датасета и валидные тексты', () => {
    expect(spanishPointersDataset.length).toBe(russianPointersDataset.length);
    expect(spanishPointersDataset.length).toBe(englishPointersDataset.length);
    expect(spanishPointersDataset.length).toBe(ukrainianPointersDataset.length);
    expect(spanishPointersDataset.length).toBeGreaterThan(0);
    expect(spanishPointersDataset[0].text.length).toBeGreaterThan(5);
    expect(spanishPointersDataset[spanishPointersDataset.length - 1].text.length).toBeGreaterThan(5);
  });
});
