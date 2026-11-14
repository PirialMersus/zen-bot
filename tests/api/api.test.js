import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import http from 'http';
import express from 'express';
import apiRouter from '../../src/api/index.js';
import User from '../../src/models/User.js';
import Reminder from '../../src/models/Reminder.js';
import { Pointer, PointerEn } from '../../src/models/Pointer.js';
import { validateServerEnvironment } from '../../src/server.js';

describe('API безопасность и мультиязычность указателей', () => {
  let serverInstance;
  let serverBaseUrl;

  beforeAll(async () => {
    const expressApp = express();
    expressApp.use(express.json());
    expressApp.use('/api', apiRouter);

    serverInstance = http.createServer(expressApp);
    await new Promise(resolveListening => {
      serverInstance.listen(0, '127.0.0.1', resolveListening);
    });
    const serverPort = serverInstance.address().port;
    serverBaseUrl = `http://127.0.0.1:${serverPort}`;
  });

  afterAll(async () => {
    if (serverInstance) {
      await new Promise(resolveClosing => serverInstance.close(resolveClosing));
    }
  });

  it('должен генерировать код авторизации и не возвращать его в ответе API', async () => {
    const testTelegramId = 44556677;
    await User.create({ telegramId: testTelegramId });

    const authRequestHttpResponse = await fetch(`${serverBaseUrl}/api/auth/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId: testTelegramId })
    });

    const responseJsonBody = await authRequestHttpResponse.json();

    expect(authRequestHttpResponse.status).toBe(200);
    expect(responseJsonBody.message).toBe('Код отправлен в Telegram');
    expect(responseJsonBody.code).toBeUndefined();

    const updatedUser = await User.findOne({ telegramId: testTelegramId });
    expect(updatedUser.authCode).toBeDefined();
    expect(updatedUser.authCode).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/);
  });

  it('должен блокировать DEV-123 и любые недействительные коды верификации', async () => {
    await User.create({ telegramId: 791785172 });

    const verificationHttpResponse = await fetch(`${serverBaseUrl}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'DEV-123' })
    });

    const responseJsonBody = await verificationHttpResponse.json();

    expect(verificationHttpResponse.status).toBe(401);
    expect(responseJsonBody.message).toBe('Неверный или истёкший код');
  });

  it('должен успешно авторизовать пользователя по валидному authCode и выдать JWT токен', async () => {
    const validUserTelegramId = 77112233;
    await User.create({
      telegramId: validUserTelegramId,
      authCode: 'XYZ-789',
      authCodeExpiresAt: new Date(Date.now() + 60 * 1000)
    });

    const verificationHttpResponse = await fetch(`${serverBaseUrl}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'XYZ-789' })
    });

    const responseJsonBody = await verificationHttpResponse.json();

    expect(verificationHttpResponse.status).toBe(200);
    expect(responseJsonBody.token).toBeDefined();
    expect(responseJsonBody.user.telegramId).toBe(validUserTelegramId);

    const userAfterLogin = await User.findOne({ telegramId: validUserTelegramId });
    expect(userAfterLogin.authCode).toBeNull();
  });

  it('должен ограничивать частоту запросов кода для одного telegramId', async () => {
    const spamTargetTelegramId = 88223344;
    await User.create({ telegramId: spamTargetTelegramId });

    for (let requestIndex = 0; requestIndex < 3; requestIndex += 1) {
      const response = await fetch(`${serverBaseUrl}/api/auth/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: spamTargetTelegramId })
      });
      expect(response.status).toBe(200);
    }

    const fourthSpamResponse = await fetch(`${serverBaseUrl}/api/auth/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId: spamTargetTelegramId })
    });

    expect(fourthSpamResponse.status).toBe(429);
    const fourthResponseBody = await fourthSpamResponse.json();
    expect(fourthResponseBody.message).toContain('Слишком много запросов кода');
  });

  it('должен выбрасывать ошибку валидации при старте сервера в production без JWT_SECRET', () => {
    const originalEnvironment = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;

    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;

    expect(() => validateServerEnvironment()).toThrow('Критическая ошибка конфигурации: переменная JWT_SECRET обязательна в production окружении');

    process.env.NODE_ENV = originalEnvironment;
    process.env.JWT_SECRET = originalSecret;
  });

  it('должен отдавать случайный английский указатель при передаче language=en', async () => {
    await Pointer.deleteMany({});
    await PointerEn.deleteMany({});

    await Pointer.create({ number: 1, text: 'Русский текст для API', isActive: true });
    await PointerEn.create({ number: 1, text: 'English text for API', isActive: true });

    const englishHttpResponse = await fetch(`${serverBaseUrl}/api/pointers/random?language=en`);
    const englishResponseBody = await englishHttpResponse.json();

    expect(englishHttpResponse.status).toBe(200);
    expect(englishResponseBody.text).toBe('English text for API');

    const russianHttpResponse = await fetch(`${serverBaseUrl}/api/pointers/random`);
    const russianResponseBody = await russianHttpResponse.json();

    expect(russianHttpResponse.status).toBe(200);
    expect(russianResponseBody.text).toBe('Русский текст для API');
  });

  it('должен содержать составной индекс isActive и nextRunAt в модели Reminder', async () => {
    const reminderIndexes = Reminder.schema.indexes();
    const compoundIndexFound = reminderIndexes.some(
      ([indexFieldsDefinition]) =>
        indexFieldsDefinition.isActive === 1 && indexFieldsDefinition.nextRunAt === 1
    );

    expect(compoundIndexFound).toBe(true);
  });

  it('должен возвращать 400 при передаче невалидного id в PATCH и DELETE напоминания', async () => {
    const testUserTelegramId = 99112233;
    await User.create({
      telegramId: testUserTelegramId,
      authCode: 'AAA-111',
      authCodeExpiresAt: new Date(Date.now() + 60 * 1000)
    });

    const verificationResponse = await fetch(`${serverBaseUrl}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'AAA-111' })
    });
    const verificationBody = await verificationResponse.json();
    const authToken = verificationBody.token;

    const patchResponse = await fetch(`${serverBaseUrl}/api/reminders/invalid-id-123`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ intervalMinutes: 30 })
    });

    expect(patchResponse.status).toBe(400);
    const patchBody = await patchResponse.json();
    expect(patchBody.message).toBe('Некорректный id напоминания');

    const deleteResponse = await fetch(`${serverBaseUrl}/api/reminders/invalid-id-123`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    expect(deleteResponse.status).toBe(400);
    const deleteBody = await deleteResponse.json();
    expect(deleteBody.message).toBe('Некорректный id напоминания');
  });

  it('должен пересчитывать nextRunAt и проверять тип isActive при PATCH напоминания', async () => {
    const testUserTelegramId = 99445566;
    await User.create({
      telegramId: testUserTelegramId,
      authCode: 'BBB-222',
      authCodeExpiresAt: new Date(Date.now() + 60 * 1000)
    });

    const verificationResponse = await fetch(`${serverBaseUrl}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'BBB-222' })
    });
    const verificationBody = await verificationResponse.json();
    const authToken = verificationBody.token;

    const oldNextRunDate = new Date(Date.now() + 60 * 1000);
    const reminder = await Reminder.create({
      userId: testUserTelegramId,
      chatId: testUserTelegramId,
      text: 'Тест PATCH',
      intervalMinutes: 1,
      nextRunAt: oldNextRunDate
    });

    const invalidTypeResponse = await fetch(`${serverBaseUrl}/api/reminders/${reminder._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ isActive: 'invalid-boolean-string' })
    });

    expect(invalidTypeResponse.status).toBe(400);
    const invalidTypeBody = await invalidTypeResponse.json();
    expect(invalidTypeBody.message).toBe('isActive должен быть булевым значением');

    const beforePatchTimestamp = Date.now();
    const patchResponse = await fetch(`${serverBaseUrl}/api/reminders/${reminder._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ intervalMinutes: 120 })
    });

    expect(patchResponse.status).toBe(200);
    const updatedReminder = await Reminder.findById(reminder._id);
    expect(updatedReminder.intervalMinutes).toBe(120);
    expect(new Date(updatedReminder.nextRunAt).getTime()).toBeGreaterThanOrEqual(
      beforePatchTimestamp + 120 * 60 * 1000 - 1000
    );
  });
});
