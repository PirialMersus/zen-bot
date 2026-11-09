import { beforeEach, describe, expect, it, vi } from 'vitest';
import { activityMiddleware, detectUserLanguage } from '../../src/middlewares/activity.js';
import User from '../../src/models/User.js';
import { createMockContext } from '../helpers/mockContext.js';

describe('Middleware активности и уведомление о новом пользователе', () => {
  const administratorTelegramIdentifier = '791785172';

  beforeEach(() => {
    process.env.CREATOR_ID = administratorTelegramIdentifier;
  });

  it('должен отправлять уведомление администратору и сохранять пользователя при первом визите нового человека', async () => {
    const newTelegramUserId = 99887766;
    const mockContext = createMockContext({
      userId: newTelegramUserId,
      from: {
        id: newTelegramUserId,
        first_name: 'Иван',
        last_name: 'Иванов',
        username: 'ivan_zen',
        language_code: 'ru'
      }
    });

    const nextMiddlewareFunction = vi.fn().mockResolvedValue();

    await activityMiddleware(mockContext, nextMiddlewareFunction);

    expect(nextMiddlewareFunction).toHaveBeenCalledTimes(1);
    expect(mockContext.telegram.sendMessage).toHaveBeenCalledTimes(1);

    const [notifiedAdminId, sentNotificationText, sentNotificationOptions] = mockContext.telegram.sendMessage.mock.calls[0];
    expect(String(notifiedAdminId)).toBe(administratorTelegramIdentifier);
    expect(sentNotificationText).toContain('Новый пользователь в боте!');
    expect(sentNotificationText).toContain('Иван Иванов');
    expect(sentNotificationText).toContain('@ivan_zen');
    expect(sentNotificationText).toContain(String(newTelegramUserId));
    expect(sentNotificationText).toContain('ru');
    expect(sentNotificationOptions.parse_mode).toBe('HTML');

    const createdDatabaseUser = await User.findOne({ telegramId: newTelegramUserId });
    expect(createdDatabaseUser).not.toBeNull();
    expect(createdDatabaseUser.firstName).toBe('Иван');
    expect(createdDatabaseUser.lastName).toBe('Иванов');
    expect(createdDatabaseUser.username).toBe('ivan_zen');
  });

  it('не должен отправлять уведомление администратору, если пользователь уже существует в базе', async () => {
    const existingTelegramUserId = 11223344;
    await User.create({
      telegramId: existingTelegramUserId,
      firstName: 'Старый',
      username: 'old_user'
    });

    const mockContext = createMockContext({
      userId: existingTelegramUserId,
      from: {
        id: existingTelegramUserId,
        first_name: 'Старый',
        username: 'old_user'
      }
    });

    const nextMiddlewareFunction = vi.fn().mockResolvedValue();

    await activityMiddleware(mockContext, nextMiddlewareFunction);

    expect(nextMiddlewareFunction).toHaveBeenCalledTimes(1);
    expect(mockContext.telegram.sendMessage).not.toHaveBeenCalled();
  });

  it('не должен отправлять уведомление, если действие совершает сам администратор', async () => {
    const administratorIdAsNumber = Number(administratorTelegramIdentifier);
    const mockContext = createMockContext({
      userId: administratorIdAsNumber,
      from: {
        id: administratorIdAsNumber,
        first_name: 'Администратор',
        username: 'admin_user'
      }
    });

    const nextMiddlewareFunction = vi.fn().mockResolvedValue();

    await activityMiddleware(mockContext, nextMiddlewareFunction);

    expect(nextMiddlewareFunction).toHaveBeenCalledTimes(1);
    expect(mockContext.telegram.sendMessage).not.toHaveBeenCalled();
  });

  it('должен корректно обрабатывать пользователя без фамилии и username', async () => {
    const userWithoutUsernameId = 33445566;
    const mockContext = createMockContext({
      userId: userWithoutUsernameId,
      from: {
        id: userWithoutUsernameId,
        first_name: 'Алексей',
        last_name: undefined,
        username: undefined,
        language_code: undefined
      }
    });

    const nextMiddlewareFunction = vi.fn().mockResolvedValue();

    await activityMiddleware(mockContext, nextMiddlewareFunction);

    expect(mockContext.telegram.sendMessage).toHaveBeenCalledTimes(1);
    const [, sentNotificationText] = mockContext.telegram.sendMessage.mock.calls[0];
    expect(sentNotificationText).toContain('Алексей');
    expect(sentNotificationText).toContain('нет username');
    expect(sentNotificationText).toContain('не указан');
  });

  it('должен правильно определять язык по коду локали', () => {
    expect(detectUserLanguage('ru')).toBe('ru');
    expect(detectUserLanguage('RU')).toBe('ru');
    expect(detectUserLanguage('ru-RU')).toBe('ru');
    expect(detectUserLanguage('be')).toBe('ru');
    expect(detectUserLanguage('uk')).toBe('uk');
    expect(detectUserLanguage('uk-UA')).toBe('uk');
    expect(detectUserLanguage('es')).toBe('es');
    expect(detectUserLanguage('es-ES')).toBe('es');
    expect(detectUserLanguage('en')).toBe('en');
    expect(detectUserLanguage('en-US')).toBe('en');
    expect(detectUserLanguage('de')).toBe('en');
    expect(detectUserLanguage(undefined)).toBe('ru');
    expect(detectUserLanguage(null)).toBe('ru');
    expect(detectUserLanguage('')).toBe('ru');
  });

  it('должен автоматически сохранять en для нового пользователя с английской локалью Telegram', async () => {
    const englishTelegramUserId = 77112233;
    const mockContext = createMockContext({
      userId: englishTelegramUserId,
      from: {
        id: englishTelegramUserId,
        first_name: 'John',
        language_code: 'en'
      }
    });

    const nextMiddlewareFunction = vi.fn().mockResolvedValue();

    await activityMiddleware(mockContext, nextMiddlewareFunction);

    expect(mockContext.state.userLanguage).toBe('en');

    const createdDatabaseUser = await User.findOne({ telegramId: englishTelegramUserId });
    expect(createdDatabaseUser).not.toBeNull();
    expect(createdDatabaseUser.language).toBe('en');
  });

  it('должен сохранять ru для нового пользователя с белорусской локалью', async () => {
    const belarusianTelegramUserId = 88223344;
    const mockContext = createMockContext({
      userId: belarusianTelegramUserId,
      from: {
        id: belarusianTelegramUserId,
        first_name: 'Алесь',
        language_code: 'be'
      }
    });

    const nextMiddlewareFunction = vi.fn().mockResolvedValue();

    await activityMiddleware(mockContext, nextMiddlewareFunction);

    expect(mockContext.state.userLanguage).toBe('ru');

    const createdDatabaseUser = await User.findOne({ telegramId: belarusianTelegramUserId });
    expect(createdDatabaseUser).not.toBeNull();
    expect(createdDatabaseUser.language).toBe('ru');
  });

  it('должен автоматически сохранять uk для нового пользователя с украинской локалью Telegram', async () => {
    const ukrainianTelegramUserId = 88223355;
    const mockContext = createMockContext({
      userId: ukrainianTelegramUserId,
      from: {
        id: ukrainianTelegramUserId,
        first_name: 'Тарас',
        language_code: 'uk'
      }
    });

    const nextMiddlewareFunction = vi.fn().mockResolvedValue();

    await activityMiddleware(mockContext, nextMiddlewareFunction);

    expect(mockContext.state.userLanguage).toBe('uk');

    const createdDatabaseUser = await User.findOne({ telegramId: ukrainianTelegramUserId });
    expect(createdDatabaseUser).not.toBeNull();
    expect(createdDatabaseUser.language).toBe('uk');
  });

  it('должен автоматически сохранять es для нового пользователя с испанской локалью Telegram', async () => {
    const spanishTelegramUserId = 88223366;
    const mockContext = createMockContext({
      userId: spanishTelegramUserId,
      from: {
        id: spanishTelegramUserId,
        first_name: 'Carlos',
        language_code: 'es'
      }
    });

    const nextMiddlewareFunction = vi.fn().mockResolvedValue();

    await activityMiddleware(mockContext, nextMiddlewareFunction);

    expect(mockContext.state.userLanguage).toBe('es');

    const createdDatabaseUser = await User.findOne({ telegramId: spanishTelegramUserId });
    expect(createdDatabaseUser).not.toBeNull();
    expect(createdDatabaseUser.language).toBe('es');
  });
});
