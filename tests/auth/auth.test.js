import { describe, expect, it } from 'vitest';
import { handleGetAuthCode } from '../../src/handlers/auth.js';
import User from '../../src/models/User.js';
import { createMockContext } from '../helpers/mockContext.js';
import { TEXTS } from '../../src/constants/texts.js';

describe('Обработчик авторизации (Auth Handler)', () => {
  it('должен отправлять сообщение об ошибке, если пользователь не найден в базе', async () => {
    const mockContext = createMockContext({
      userId: 987654321
    });

    await handleGetAuthCode(mockContext);

    expect(mockContext.reply).toHaveBeenCalledWith(TEXTS.ru.AUTH.USER_NOT_FOUND);
  });

  it('должен генерировать код авторизации и отправлять его пользователю', async () => {
    const telegramUserId = 123450987;
    await User.create({
      telegramId: telegramUserId,
      language: 'ru'
    });

    const mockContext = createMockContext({
      userId: telegramUserId
    });

    await handleGetAuthCode(mockContext);

    const updatedUser = await User.findOne({ telegramId: telegramUserId });
    expect(updatedUser.authCode).toBeDefined();
    expect(updatedUser.authCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(updatedUser.authCodeExpiresAt).toBeDefined();

    expect(mockContext.reply).toHaveBeenCalledTimes(1);
    const [replyText, replyOptions] = mockContext.reply.mock.calls[0];
    expect(replyText).toContain(updatedUser.authCode);
    expect(replyText).toContain('10 минут');
    expect(replyOptions.reply_markup).toBeDefined();
    expect(replyOptions.reply_markup.inline_keyboard[0][0].text).toBe(
      TEXTS.ru.AUTH.GET_NEW_CODE_BUTTON
    );
  });

  it('должен отвечать на callbackQuery при вызове через кнопку', async () => {
    const telegramUserId = 554433221;
    await User.create({
      telegramId: telegramUserId,
      language: 'en'
    });

    const mockContext = createMockContext({
      userId: telegramUserId,
      callbackData: 'get_auth_code'
    });

    await handleGetAuthCode(mockContext);

    expect(mockContext.answerCbQuery).toHaveBeenCalled();
    expect(mockContext.reply).toHaveBeenCalledTimes(1);
    const [replyText] = mockContext.reply.mock.calls[0];
    expect(replyText).toContain('Your code to sign in');
  });
});
