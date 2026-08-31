import { vi } from 'vitest';

export const createMockContext = (customOptions = {}) => {
  const telegramUserId = customOptions.userId || 12345678;
  const chatId = customOptions.chatId || telegramUserId;

  const mockTelegramService = {
    sendMessage: vi.fn().mockResolvedValue({ message_id: 999, text: '' }),
    sendPhoto: vi.fn().mockResolvedValue({ message_id: 1000 }),
    sendVideo: vi.fn().mockResolvedValue({ message_id: 1001 }),
    deleteMessage: vi.fn().mockResolvedValue(true),
    editMessageText: vi.fn().mockResolvedValue(true),
    answerCbQuery: vi.fn().mockResolvedValue(true)
  };

  const contextObject = {
    from: {
      id: telegramUserId,
      is_bot: false,
      first_name: 'TestUser',
      username: 'test_user',
      ...customOptions.from
    },
    chat: {
      id: chatId,
      type: 'private',
      ...customOptions.chat
    },
    session: customOptions.session || {},
    match: customOptions.match || null,
    message: customOptions.message || null,
    callbackQuery: customOptions.callbackQuery || null,
    telegram: mockTelegramService,
    reply: vi.fn().mockResolvedValue({ message_id: 100, text: '' }),
    replyWithPhoto: vi.fn().mockResolvedValue({ message_id: 101 }),
    replyWithVideo: vi.fn().mockResolvedValue({ message_id: 102 }),
    answerCbQuery: vi.fn().mockResolvedValue(true),
    deleteMessage: vi.fn().mockResolvedValue(true),
    editMessageText: vi.fn().mockResolvedValue(true),
    ...customOptions.extra
  };

  if (customOptions.text && !contextObject.message) {
    contextObject.message = {
      message_id: 50,
      text: customOptions.text,
      date: Math.floor(Date.now() / 1000)
    };
  }

  if (customOptions.callbackData && !contextObject.callbackQuery) {
    contextObject.callbackQuery = {
      id: 'mock_callback_id',
      data: customOptions.callbackData,
      from: contextObject.from,
      message: {
        message_id: 40,
        chat: contextObject.chat,
        text: 'Previous message'
      }
    };
  }

  return contextObject;
};
