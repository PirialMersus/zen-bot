import { describe, expect, it } from 'vitest';
import { Pointer, PointerEn } from '../../src/models/Pointer.js';
import {
  handleSearchPointers,
  handleSearchMorePointers
} from '../../src/handlers/pointers.js';
import { createMockContext } from '../helpers/mockContext.js';
import { findPointersByText, countPointersByText } from '../../src/services/pointers.js';

describe('Публичный поиск указателей по команде /f', () => {
  it('должен находить указатели по автору, даже если имя автора отсутствует в тексте', async () => {
    await Pointer.create([
      {
        number: 101,
        text: 'Осознай того, кто слушает',
        source: 'Нисаргадатта Махарадж',
        isActive: true
      },
      {
        number: 102,
        text: 'Будь в тишине прямо сейчас',
        source: 'Рамана Махарши',
        isActive: true
      }
    ]);

    const matchingByAuthor = await findPointersByText('Нисаргадатта', 'ru');
    expect(matchingByAuthor).toHaveLength(1);
    expect(matchingByAuthor[0].source).toBe('Нисаргадатта Махарадж');
    expect(matchingByAuthor[0].text).toBe('Осознай того, кто слушает');

    const totalCount = await countPointersByText('Махарши', 'ru');
    expect(totalCount).toBe(1);
  });

  it('должен находить указатели по отрывку текста', async () => {
    await Pointer.create({
      number: 103,
      text: 'Внимание на кончике носа и дыхании',
      source: null,
      isActive: true
    });

    const matchingByText = await findPointersByText('кончике носа', 'ru');
    expect(matchingByText).toHaveLength(1);
    expect(matchingByText[0].text).toContain('кончике носа');
  });

  it('должен выводить подсказку с примером при вызове /f без поискового запроса', async () => {
    const regularUserId = 12345678;
    const mockContext = createMockContext({
      userId: regularUserId,
      text: '/f'
    });

    const executionResult = await handleSearchPointers(mockContext);

    expect(executionResult).toBe(true);
    expect(mockContext.reply).toHaveBeenCalled();

    const replyMessage = mockContext.reply.mock.calls[0][0];
    expect(replyMessage).toContain('Укажите текст для поиска или автора');
    expect(replyMessage).toContain('/f Будда или /f [отрывок указателя]');
  });

  it('должен быть доступен обычному пользователю без прав администратора', async () => {
    await Pointer.create({
      number: 104,
      text: 'Любовь и тишина наполняют сердце',
      source: 'Будда',
      isActive: true
    });

    const regularUserId = 87654321;
    const mockUserContext = createMockContext({
      userId: regularUserId,
      text: '/f Будда'
    });

    const executionResult = await handleSearchPointers(mockUserContext);

    expect(executionResult).toBe(true);
    expect(mockUserContext.reply).toHaveBeenCalledTimes(1);

    const replyText = mockUserContext.reply.mock.calls[0][0];
    expect(replyText).toContain('Любовь и тишина наполняют сердце');
    expect(replyText).toContain('Будда');
  });

  it('должен выдавать результаты порциями по 5 штук и поддерживать пагинацию через кнопку Показать ещё', async () => {
    const bulkPointers = Array.from({ length: 12 }, (_, index) => ({
      number: 200 + index + 1,
      text: `Медитативная практика номер ${index + 1}`,
      source: 'Учитель Дзен',
      isActive: true
    }));

    await Pointer.create(bulkPointers);

    const testUserId = 55443322;
    const searchContext = createMockContext({
      userId: testUserId,
      text: '/f Учитель Дзен'
    });

    await handleSearchPointers(searchContext);

    expect(searchContext.reply).toHaveBeenCalledTimes(6);

    const paginationMessage = searchContext.reply.mock.calls[5][0];
    const paginationOptions = searchContext.reply.mock.calls[5][1];

    expect(paginationMessage).toContain('Найдено всего: 12');
    expect(paginationMessage).toContain('Показаны: 1–5');

    const inlineButtons = paginationOptions.reply_markup.inline_keyboard.flat();
    expect(inlineButtons).toHaveLength(1);
    expect(inlineButtons[0].callback_data).toBe('search:more');
    expect(inlineButtons[0].text).toContain('7');

    const firstMoreContext = createMockContext({
      userId: testUserId,
      session: { ...searchContext.session },
      callbackData: 'search:more'
    });

    await handleSearchMorePointers(firstMoreContext);

    expect(firstMoreContext.reply).toHaveBeenCalledTimes(6);
    const secondPaginationMessage = firstMoreContext.reply.mock.calls[5][0];
    expect(secondPaginationMessage).toContain('Найдено всего: 12');
    expect(secondPaginationMessage).toContain('Показаны: 1–10');

    const secondMoreContext = createMockContext({
      userId: testUserId,
      session: { ...firstMoreContext.session },
      callbackData: 'search:more'
    });

    await handleSearchMorePointers(secondMoreContext);

    expect(secondMoreContext.reply).toHaveBeenCalledTimes(3);
    const finalAllShownMessage = secondMoreContext.reply.mock.calls[2][0];
    expect(finalAllShownMessage).toContain('Показаны все найденные указатели (12)');
  });

  it('должен поддерживать поиск на других языках с языковым модификатором', async () => {
    await PointerEn.create({
      number: 301,
      text: 'Silence is the greatest revelation',
      source: 'Lao Tzu',
      isActive: true
    });

    const englishUserContext = createMockContext({
      userId: 44332211,
      text: '/f_en Lao Tzu'
    });

    await handleSearchPointers(englishUserContext);

    expect(englishUserContext.reply).toHaveBeenCalledTimes(1);
    const replyText = englishUserContext.reply.mock.calls[0][0];
    expect(replyText).toContain('Silence is the greatest revelation');
    expect(replyText).toContain('Lao Tzu');
  });
});
