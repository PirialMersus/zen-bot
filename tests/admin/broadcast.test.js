import { beforeEach, describe, expect, it } from 'vitest';
import { BUTTONS } from '../../src/constants/buttons.js';
import { UI } from '../../src/constants/ui.js';
import {
  handleAdminBroadcastCancel,
  handleAdminBroadcastConfirm,
  handleAdminBroadcastMessage,
  handleAdminBroadcastStart,
  handleFeedbackCancel,
  handleFeedbackMessage,
  handleFeedbackStart
} from '../../src/handlers/admin.js';
import User from '../../src/models/User.js';
import { createMockContext } from '../helpers/mockContext.js';

describe('Рассылка сообщений и сбор обратной связи', () => {
  const administratorTelegramIdentifier = 99998888;

  beforeEach(() => {
    process.env.CREATOR_ID = String(administratorTelegramIdentifier);
  });

  it('должен отклонять запуск рассылки, если пользователь не является администратором', async () => {
    const regularUserContext = createMockContext({
      userId: 11112222
    });

    await handleAdminBroadcastStart(regularUserContext);

    expect(regularUserContext.reply).not.toHaveBeenCalled();
    expect(regularUserContext.session.adminBroadcastStep).toBeUndefined();
  });

  it('должен переводить администратора в режим ожидания сообщения рассылки', async () => {
    const adminUserContext = createMockContext({
      userId: administratorTelegramIdentifier
    });

    await handleAdminBroadcastStart(adminUserContext);

    expect(adminUserContext.reply).toHaveBeenCalled();
    expect(adminUserContext.session.adminBroadcastStep).toBe('AWAITING_MESSAGE');
  });

  it('должен сбрасывать процесс рассылки при отмене администратором', async () => {
    const adminUserContext = createMockContext({
      userId: administratorTelegramIdentifier,
      session: {
        adminBroadcastStep: 'AWAITING_MESSAGE',
        broadcastSourceChatId: 123,
        broadcastSourceMessageId: 456
      }
    });

    await handleAdminBroadcastCancel(adminUserContext);

    expect(adminUserContext.session.adminBroadcastStep).toBeNull();
    expect(adminUserContext.session.broadcastSourceChatId).toBeNull();
    expect(adminUserContext.session.broadcastSourceMessageId).toBeNull();
    expect(adminUserContext.editMessageText).toHaveBeenCalledWith('❌ Создание рассылки отменено.');
  });

  it('должен сохранять сообщение рассылки и запрашивать подтверждение', async () => {
    await User.create({ telegramId: 101 });
    await User.create({ telegramId: 102 });

    const adminUserContext = createMockContext({
      userId: administratorTelegramIdentifier,
      session: {
        adminBroadcastStep: 'AWAITING_MESSAGE'
      },
      text: 'Внимание, друзья! Это тестовая рассылка.'
    });

    const isHandled = await handleAdminBroadcastMessage(adminUserContext);

    expect(isHandled).toBe(true);
    expect(adminUserContext.session.adminBroadcastStep).toBe('AWAITING_CONFIRMATION');
    expect(adminUserContext.session.broadcastSourceChatId).toBe(administratorTelegramIdentifier);
    expect(adminUserContext.session.broadcastSourceMessageId).toBe(50);
    expect(adminUserContext.reply).toHaveBeenCalled();
  });

  it('должен сбрасывать рассылку при нажатии кнопки навигации в процессе создания', async () => {
    const adminUserContext = createMockContext({
      userId: administratorTelegramIdentifier,
      session: {
        adminBroadcastStep: 'AWAITING_MESSAGE'
      },
      text: BUTTONS.REMINDERS
    });

    const isHandled = await handleAdminBroadcastMessage(adminUserContext);

    expect(isHandled).toBe(false);
    expect(adminUserContext.session.adminBroadcastStep).toBeNull();
  });

  it('должен успешно копировать сообщение всем пользователям при подтверждении рассылки', async () => {
    await User.create({ telegramId: 201 });
    await User.create({ telegramId: 202 });

    const adminUserContext = createMockContext({
      userId: administratorTelegramIdentifier,
      session: {
        adminBroadcastStep: 'AWAITING_CONFIRMATION',
        broadcastSourceChatId: 500,
        broadcastSourceMessageId: 600
      }
    });

    await handleAdminBroadcastConfirm(adminUserContext);

    expect(adminUserContext.telegram.copyMessage).toHaveBeenCalledTimes(2);
    expect(adminUserContext.reply).toHaveBeenCalled();
    expect(adminUserContext.session.adminBroadcastStep).toBeNull();
  });

  it('должен активировать режим ожидания обратной связи при нажатии кнопки Ответить', async () => {
    const regularUserContext = createMockContext({
      userId: 301
    });

    await handleFeedbackStart(regularUserContext);

    expect(regularUserContext.session.feedbackAwaiting).toBe(true);
    expect(regularUserContext.reply).toHaveBeenCalled();
  });

  it('должен отменять режим обратной связи при нажатии кнопки Отмена', async () => {
    const regularUserContext = createMockContext({
      userId: 302,
      session: {
        feedbackAwaiting: true
      }
    });

    await handleFeedbackCancel(regularUserContext);

    expect(regularUserContext.session.feedbackAwaiting).toBe(false);
    expect(regularUserContext.editMessageText).toHaveBeenCalledWith('Отправка ответа отменена.');
  });

  it('должен пересылать ответ пользователя администратору и сбрасывать флаг', async () => {
    const regularUserContext = createMockContext({
      userId: 303,
      from: {
        first_name: 'Иван',
        last_name: 'Иванов',
        username: 'ivan_ivanov'
      },
      session: {
        feedbackAwaiting: true
      },
      text: 'Спасибо за классного бота!'
    });

    const isHandled = await handleFeedbackMessage(regularUserContext);

    expect(isHandled).toBe(true);
    expect(regularUserContext.telegram.sendMessage).toHaveBeenCalled();
    expect(regularUserContext.telegram.copyMessage).toHaveBeenCalledWith(
      String(administratorTelegramIdentifier),
      303,
      50
    );
    expect(regularUserContext.session.feedbackAwaiting).toBe(false);
    expect(regularUserContext.reply).toHaveBeenCalled();
  });

  it('должен игнорировать кнопки навигации и отключать режим обратной связи', async () => {
    const regularUserContext = createMockContext({
      userId: 304,
      session: {
        feedbackAwaiting: true
      },
      text: UI.REMINDER_CREATE
    });

    const isHandled = await handleFeedbackMessage(regularUserContext);

    expect(isHandled).toBe(false);
    expect(regularUserContext.session.feedbackAwaiting).toBe(false);
    expect(regularUserContext.telegram.sendMessage).not.toHaveBeenCalled();
    expect(regularUserContext.telegram.copyMessage).not.toHaveBeenCalled();
  });
});
