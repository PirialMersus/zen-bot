import { beforeEach, describe, expect, it } from 'vitest';
import { Pointer, PointerEn } from '../../src/models/Pointer.js';
import { getPointerByNumber } from '../../src/services/pointers.js';
import { handleAdminGetPointerByNumber } from '../../src/handlers/admin.js';
import { createMockContext } from '../helpers/mockContext.js';

describe('Админская команда получения указателя по номеру', () => {
  const administratorTelegramIdentifier = 99998888;

  beforeEach(() => {
    process.env.CREATOR_ID = String(administratorTelegramIdentifier);
  });
  it('должен возвращать русский указатель по номеру через getPointerByNumber', async () => {
    await Pointer.create({
      number: 42,
      text: 'Внутренний свидетель всегда спокоен',
      source: 'Махарши',
      tags: ['тишина'],
      isActive: true
    });

    const foundPointer = await getPointerByNumber(42, 'ru');
    expect(foundPointer).not.toBeNull();
    expect(foundPointer.number).toBe(42);
    expect(foundPointer.text).toBe('Внутренний свидетель всегда спокоен');
    expect(foundPointer.source).toBe('Махарши');
  });

  it('должен возвращать английский указатель по номеру через getPointerByNumber', async () => {
    await PointerEn.create({
      number: 42,
      text: 'The inner witness is always still',
      source: 'Maharshi',
      tags: ['stillness'],
      isActive: true
    });

    const foundEnglishPointer = await getPointerByNumber(42, 'en');
    expect(foundEnglishPointer).not.toBeNull();
    expect(foundEnglishPointer.number).toBe(42);
    expect(foundEnglishPointer.text).toBe('The inner witness is always still');
    expect(foundEnglishPointer.source).toBe('Maharshi');
  });

  it('должен возвращать null при некорректном или несуществующем номере', async () => {
    const nonExistentPointer = await getPointerByNumber(99999, 'ru');
    expect(nonExistentPointer).toBeNull();

    const invalidIdentifierPointer = await getPointerByNumber('invalid_id', 'ru');
    expect(invalidIdentifierPointer).toBeNull();
  });

  it('должен отправлять указатель администратору при вызове команды /p <номер>', async () => {
    await Pointer.create({
      number: 10,
      text: 'Осознавай осознавание',
      source: 'Нисаргадатта',
      tags: ['тишина'],
      isActive: true
    });

    const mockAdminContext = createMockContext({
      userId: administratorTelegramIdentifier,
      text: '/p 10'
    });

    const executionResult = await handleAdminGetPointerByNumber(mockAdminContext);

    expect(executionResult).toBe(true);
    expect(mockAdminContext.reply).toHaveBeenCalled();

    const [replyMessageText, replyOptions] = mockAdminContext.reply.mock.calls[0];
    expect(replyMessageText).toContain('Осознавай осознавание');
    expect(replyMessageText).toContain('Нисаргадатта');
    expect(replyMessageText).not.toContain('Указатель #10');
    expect(replyMessageText).not.toContain('RU');

    expect(mockAdminContext.session.lastPointerText).toBe('Осознавай осознавание');

    const inlineKeyboardButtons = replyOptions.reply_markup.inline_keyboard.flat();
    const buttonTextsList = inlineKeyboardButtons.map(buttonItem => buttonItem.text);
    expect(buttonTextsList).toContain('🔔 В напоминание');
    expect(buttonTextsList).toContain('➡️ Следующий');
  });

  it('должен поддерживать текстовую команду получить pointer <номер>', async () => {
    await Pointer.create({
      number: 25,
      text: 'Только сейчас существует',
      source: 'Экхарт',
      tags: ['присутствие'],
      isActive: true
    });

    const mockAdminContext = createMockContext({
      userId: administratorTelegramIdentifier,
      text: 'получить pointer 25'
    });

    const executionResult = await handleAdminGetPointerByNumber(mockAdminContext);

    expect(executionResult).toBe(true);
    expect(mockAdminContext.reply).toHaveBeenCalled();

    const replyMessageText = mockAdminContext.reply.mock.calls[0][0];
    expect(replyMessageText).toContain('Только сейчас существует');
    expect(replyMessageText).toContain('Экхарт');
    expect(replyMessageText).not.toContain('Указатель #25');
  });

  it('должен находить английский указатель при указании en в команде', async () => {
    await PointerEn.create({
      number: 30,
      text: 'Surrender to what is',
      source: 'Tolle',
      tags: ['stillness'],
      isActive: true
    });

    const mockAdminContext = createMockContext({
      userId: administratorTelegramIdentifier,
      text: '/p en 30'
    });

    const executionResult = await handleAdminGetPointerByNumber(mockAdminContext);

    expect(executionResult).toBe(true);
    expect(mockAdminContext.reply).toHaveBeenCalled();

    const [replyMessageText, replyOptions] = mockAdminContext.reply.mock.calls[0];
    expect(replyMessageText).toContain('Surrender to what is');
    expect(replyMessageText).toContain('Tolle');
    expect(replyMessageText).not.toContain('Указатель #30');
    expect(replyMessageText).not.toContain('EN');

    const inlineKeyboardButtons = replyOptions.reply_markup.inline_keyboard.flat();
    const buttonTextsList = inlineKeyboardButtons.map(buttonItem => buttonItem.text);
    expect(buttonTextsList).toContain('🔔 To reminder');
    expect(buttonTextsList).toContain('➡️ Next');
  });

  it('должен сообщать если указатель с заданным номером не найден', async () => {
    const mockAdminContext = createMockContext({
      userId: administratorTelegramIdentifier,
      text: '/pointer 8888'
    });

    const executionResult = await handleAdminGetPointerByNumber(mockAdminContext);

    expect(executionResult).toBe(true);
    expect(mockAdminContext.reply).toHaveBeenCalled();

    const replyMessageText = mockAdminContext.reply.mock.calls[0][0];
    expect(replyMessageText).toContain('Указатель #8888 (RU) не найден в базе');
  });

  it('должен требовать указать номер если он отсутствует в сообщении', async () => {
    const mockAdminContext = createMockContext({
      userId: administratorTelegramIdentifier,
      text: '/pointer'
    });

    const executionResult = await handleAdminGetPointerByNumber(mockAdminContext);

    expect(executionResult).toBe(true);
    expect(mockAdminContext.reply).toHaveBeenCalled();

    const replyMessageText = mockAdminContext.reply.mock.calls[0][0];
    expect(replyMessageText).toContain('Укажите номер указателя');
  });

  it('не должен отвечать обычному пользователю', async () => {
    const ordinaryUserId = 99988877;

    const mockUserContext = createMockContext({
      userId: ordinaryUserId,
      text: '/pointer 1'
    });

    const executionResult = await handleAdminGetPointerByNumber(mockUserContext);

    expect(executionResult).toBe(false);
    expect(mockUserContext.reply).not.toHaveBeenCalled();
  });

  it('не должен перехватывать обычный ввод числа от администратора при создании напоминания', async () => {
    const mockAdminContext = createMockContext({
      userId: administratorTelegramIdentifier,
      text: '4'
    });

    const executionResult = await handleAdminGetPointerByNumber(mockAdminContext);

    expect(executionResult).toBe(false);
    expect(mockAdminContext.reply).not.toHaveBeenCalled();
  });
});
