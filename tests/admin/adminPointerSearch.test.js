import { beforeEach, describe, expect, it } from 'vitest';
import { Pointer, PointerEn } from '../../src/models/Pointer.js';
import { findPointersByText, countPointersByText } from '../../src/services/pointers.js';
import { handleAdminSearchPointers } from '../../src/handlers/admin.js';
import { createMockContext } from '../helpers/mockContext.js';

describe('Поиск указателей администратором', () => {
  const administratorTelegramIdentifier = 99998888;

  beforeEach(() => {
    process.env.CREATOR_ID = String(administratorTelegramIdentifier);
  });

  it('должен находить русские указатели по точной фразе через findPointersByText', async () => {
    await Pointer.create([
      {
        number: 1,
        text: 'В этом теле никого нет и никогда не было',
        source: 'Нисаргадатта',
        tags: ['тишина'],
        isActive: true
      },
      {
        number: 2,
        text: 'В этом теле только присутствие',
        source: null,
        tags: ['тишина'],
        isActive: true
      },
      {
        number: 3,
        text: 'Тишина ума открывает истину',
        source: null,
        tags: ['тишина'],
        isActive: true
      }
    ]);

    const matchingPointersList = await findPointersByText('в этом теле', 'ru');
    expect(matchingPointersList).toHaveLength(2);
    expect(matchingPointersList[0].text).toContain('никого нет');
    expect(matchingPointersList[1].text).toContain('только присутствие');

    const totalCount = await countPointersByText('в этом теле', 'ru');
    expect(totalCount).toBe(2);
  });

  it('должен возвращать пустой массив при отсутствии совпадений или пустом запросе', async () => {
    const emptyResultsList = await findPointersByText('несуществующий текст 12345', 'ru');
    expect(emptyResultsList).toEqual([]);

    const whitespaceResultsList = await findPointersByText('   ', 'ru');
    expect(whitespaceResultsList).toEqual([]);
  });

  it('должен отправлять каждое найденное совпадение отдельным сообщением в телеграм', async () => {
    await Pointer.create([
      {
        number: 10,
        text: 'Позволь себе быть пространством',
        source: 'Махарши',
        tags: ['тишина'],
        isActive: true
      },
      {
        number: 11,
        text: 'Оставайся пространством осознания',
        source: 'Экхарт',
        tags: ['присутствие'],
        isActive: true
      }
    ]);

    const mockAdminContext = createMockContext({
      userId: administratorTelegramIdentifier,
      text: '/find пространством'
    });

    const executionResult = await handleAdminSearchPointers(mockAdminContext);

    expect(executionResult).toBe(true);
    expect(mockAdminContext.reply).toHaveBeenCalledTimes(2);

    const firstReplyMessage = mockAdminContext.reply.mock.calls[0][0];
    const secondReplyMessage = mockAdminContext.reply.mock.calls[1][0];

    expect(firstReplyMessage).toContain('Позволь себе быть пространством');
    expect(firstReplyMessage).toContain('Махарши');

    expect(secondReplyMessage).toContain('Оставайся пространством осознания');
    expect(secondReplyMessage).toContain('Экхарт');

    expect(mockAdminContext.session.lastPointerText).toBe('Оставайся пространством осознания');
  });

  it('должен поддерживать поиск английских указателей с модификатором en', async () => {
    await PointerEn.create({
      number: 1,
      text: 'Notice the one who is seeking truth',
      source: 'Nisargadatta',
      tags: ['stillness'],
      isActive: true
    });

    const mockAdminContext = createMockContext({
      userId: administratorTelegramIdentifier,
      text: '/find en seeking truth'
    });

    const executionResult = await handleAdminSearchPointers(mockAdminContext);

    expect(executionResult).toBe(true);
    expect(mockAdminContext.reply).toHaveBeenCalledTimes(1);

    const [replyMessageText, replyOptions] = mockAdminContext.reply.mock.calls[0];
    expect(replyMessageText).toContain('Notice the one who is seeking truth');
    expect(replyMessageText).toContain('Nisargadatta');

    const keyboardButtons = replyOptions.reply_markup.inline_keyboard.flat();
    const buttonTextsList = keyboardButtons.map(button => button.text);
    expect(buttonTextsList).toContain('🔔 To reminder');
  });

  it('должен предупреждать при превышении лимита выдачи', async () => {
    const bulkPointersList = Array.from({ length: 12 }, (_, itemIndex) => ({
      number: itemIndex + 1,
      text: `Многократная тестовая фраза номер ${itemIndex + 1}`,
      source: null,
      tags: ['тест'],
      isActive: true
    }));

    await Pointer.create(bulkPointersList);

    const mockAdminContext = createMockContext({
      userId: administratorTelegramIdentifier,
      text: '/find Многократная тестовая фраза'
    });

    const executionResult = await handleAdminSearchPointers(mockAdminContext);

    expect(executionResult).toBe(true);
    expect(mockAdminContext.reply).toHaveBeenCalledTimes(11);

    const infoReplyMessage = mockAdminContext.reply.mock.calls[10][0];
    expect(infoReplyMessage).toContain('Найдено всего: 12');
    expect(infoReplyMessage).toContain('Показаны первые 10');
  });

  it('должен требовать указать текст для поиска если передана пустая команда', async () => {
    const mockAdminContext = createMockContext({
      userId: administratorTelegramIdentifier,
      text: '/find'
    });

    const executionResult = await handleAdminSearchPointers(mockAdminContext);

    expect(executionResult).toBe(true);
    expect(mockAdminContext.reply).toHaveBeenCalled();

    const replyMessageText = mockAdminContext.reply.mock.calls[0][0];
    expect(replyMessageText).toContain('Укажите текст для поиска');
  });

  it('должен сообщать если ничего не найдено', async () => {
    const mockAdminContext = createMockContext({
      userId: administratorTelegramIdentifier,
      text: '/find редчайшеесловокоторогонет'
    });

    const executionResult = await handleAdminSearchPointers(mockAdminContext);

    expect(executionResult).toBe(true);
    expect(mockAdminContext.reply).toHaveBeenCalled();

    const replyMessageText = mockAdminContext.reply.mock.calls[0][0];
    expect(replyMessageText).toContain('не найдены');
  });

  it('не должен отвечать обычному пользователю', async () => {
    const regularUserIdentifier = 11112222;

    const mockUserContext = createMockContext({
      userId: regularUserIdentifier,
      text: '/find тишина'
    });

    const executionResult = await handleAdminSearchPointers(mockUserContext);

    expect(executionResult).toBe(false);
    expect(mockUserContext.reply).not.toHaveBeenCalled();
  });
});
