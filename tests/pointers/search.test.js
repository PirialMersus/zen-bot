import { describe, expect, it } from 'vitest';
import { Pointer, PointerEn } from '../../src/models/Pointer.js';
import {
  handleSearchPointers,
  handleSearchMorePointers,
  handleSearchQueryInput,
  handleCancelSearch
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

  it('должен выводить подсказку с примером при вызове /f или /find без поискового запроса', async () => {
    const regularUserId = 12345678;
    const mockContextF = createMockContext({
      userId: regularUserId,
      text: '/f'
    });

    const executionResultF = await handleSearchPointers(mockContextF);

    expect(executionResultF).toBe(true);
    expect(mockContextF.reply).toHaveBeenCalled();

    const replyMessageF = mockContextF.reply.mock.calls[0][0];
    expect(replyMessageF).toContain('Укажите текст для поиска или автора');
    expect(replyMessageF).toContain('/find (или /f) Будда или /find [отрывок указателя]');

    const mockContextFind = createMockContext({
      userId: regularUserId,
      text: '/find'
    });

    const executionResultFind = await handleSearchPointers(mockContextFind);

    expect(executionResultFind).toBe(true);
    expect(mockContextFind.reply).toHaveBeenCalled();

    const replyMessageFind = mockContextFind.reply.mock.calls[0][0];
    expect(replyMessageFind).toContain('/find (или /f) Будда или /find [отрывок указателя]');
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

  it('должен переводить в режим ожидания и выполнять поиск по следующему текстовому сообщению', async () => {
    await Pointer.create({
      number: 401,
      text: 'Дыхание растворяется в бесконечности',
      source: 'Пападжи',
      isActive: true
    });

    const initialUserId = 99887766;
    const initialContext = createMockContext({
      userId: initialUserId,
      text: '/f'
    });

    const initialResult = await handleSearchPointers(initialContext);
    expect(initialResult).toBe(true);
    expect(initialContext.session.isWaitingForSearchQuery).toBe(true);

    const followUpContext = createMockContext({
      userId: initialUserId,
      text: 'Пападжи',
      session: { ...initialContext.session }
    });

    const followUpResult = await handleSearchQueryInput(followUpContext);
    expect(followUpResult).toBe(true);
    expect(followUpContext.session.isWaitingForSearchQuery).toBe(false);
    expect(followUpContext.reply).toHaveBeenCalled();

    const resultMessage = followUpContext.reply.mock.calls[0][0];
    expect(resultMessage).toContain('Дыхание растворяется в бесконечности');
    expect(resultMessage).toContain('Пападжи');
  });

  it('должен сбрасывать режим ожидания поиска при вводе команды или навигационной кнопки', async () => {
    const testUserId = 77665544;
    const commandContext = createMockContext({
      userId: testUserId,
      text: '/start',
      session: { isWaitingForSearchQuery: true }
    });

    const commandResult = await handleSearchQueryInput(commandContext);
    expect(commandResult).toBe(false);
    expect(commandContext.session.isWaitingForSearchQuery).toBe(false);

    const buttonContext = createMockContext({
      userId: testUserId,
      text: '⚙️ Настройки',
      session: { isWaitingForSearchQuery: true }
    });

    const buttonResult = await handleSearchQueryInput(buttonContext);
    expect(buttonResult).toBe(false);
    expect(buttonContext.session.isWaitingForSearchQuery).toBe(false);
  });

  it('должен поддерживать поиск через команду /find', async () => {
    await Pointer.create({
      number: 105,
      text: 'Истина находится прямо перед тобой',
      source: 'Лао-цзы',
      isActive: true
    });

    const searchContext = createMockContext({
      userId: 99887766,
      text: '/find Лао-цзы'
    });

    const executionResult = await handleSearchPointers(searchContext);

    expect(executionResult).toBe(true);
    expect(searchContext.reply).toHaveBeenCalledTimes(1);

    const replyText = searchContext.reply.mock.calls[0][0];
    expect(replyText).toContain('Истина находится прямо перед тобой');
    expect(replyText).toContain('Лао-цзы');
  });

  it('должен предлагать повторить ввод и показывать кнопку отмены при отсутствии результатов', async () => {
    const testUserId = 88776655;
    const initialSearchContext = createMockContext({
      userId: testUserId,
      text: '/f несуществующий_текст_123'
    });

    const executionResult = await handleSearchPointers(initialSearchContext);
    expect(executionResult).toBe(true);
    expect(initialSearchContext.session.isWaitingForSearchQuery).toBe(true);
    expect(initialSearchContext.session.lastFailedSearchQuery).toBe('несуществующий_текст_123');
    expect(initialSearchContext.reply).toHaveBeenCalledTimes(1);

    const replyText = initialSearchContext.reply.mock.calls[0][0];
    const replyOptions = initialSearchContext.reply.mock.calls[0][1];
    expect(replyText).toContain('не найдены');
    expect(replyText).toContain('Попробуйте ввести другой текст');

    const inlineKeyboard = replyOptions.reply_markup.inline_keyboard.flat();
    expect(inlineKeyboard[0].callback_data).toBe('search:cancel');
    expect(inlineKeyboard[0].text).toContain('Завершить поиск');
  });

  it('должен выдавать уточняющие рекомендации при повторном вводе того же несуществующего запроса', async () => {
    const testUserId = 88776656;
    const firstSearchContext = createMockContext({
      userId: testUserId,
      text: '/f абракадабра'
    });

    await handleSearchPointers(firstSearchContext);
    expect(firstSearchContext.session.lastFailedSearchQuery).toBe('абракадабра');

    const repeatSearchContext = createMockContext({
      userId: testUserId,
      text: 'АБРАКАДАБРА',
      session: { ...firstSearchContext.session }
    });

    const repeatResult = await handleSearchQueryInput(repeatSearchContext);
    expect(repeatResult).toBe(true);
    expect(repeatSearchContext.session.isWaitingForSearchQuery).toBe(true);
    expect(repeatSearchContext.reply).toHaveBeenCalledTimes(1);

    const repeatReplyText = repeatSearchContext.reply.mock.calls[0][0];
    expect(repeatReplyText).toContain('по-прежнему ничего не найдено');
    expect(repeatReplyText).toContain('ввести только основу слова');
  });

  it('должен корректно завершать поиск и возвращать клавиатуру меню при нажатии кнопки отмены', async () => {
    const testUserId = 88776657;
    const cancelContext = createMockContext({
      userId: testUserId,
      callbackData: 'search:cancel',
      session: {
        isWaitingForSearchQuery: true,
        searchLanguage: 'ru',
        lastFailedSearchQuery: 'ошибка'
      }
    });

    await handleCancelSearch(cancelContext);

    expect(cancelContext.session.isWaitingForSearchQuery).toBe(false);
    expect(cancelContext.session.searchLanguage).toBeNull();
    expect(cancelContext.session.lastFailedSearchQuery).toBeNull();
    expect(cancelContext.answerCbQuery).toHaveBeenCalled();
    expect(cancelContext.deleteMessage).toHaveBeenCalled();
    expect(cancelContext.reply).toHaveBeenCalledTimes(1);

    const replyText = cancelContext.reply.mock.calls[0][0];
    expect(replyText).toBe('Поиск завершён.');
  });

  it('должен сбрасывать состояние ожидания и ошибку при успешном поиске после неудачного', async () => {
    await Pointer.create({
      number: 106,
      text: 'Спокойствие ума рождает ясность',
      source: 'Дзен Мастер',
      isActive: true
    });

    const testUserId = 88776658;
    const failedSearchContext = createMockContext({
      userId: testUserId,
      text: '/f несуществующий'
    });

    await handleSearchPointers(failedSearchContext);
    expect(failedSearchContext.session.isWaitingForSearchQuery).toBe(true);

    const successfulInputContext = createMockContext({
      userId: testUserId,
      text: 'Спокойствие',
      session: { ...failedSearchContext.session }
    });

    const successResult = await handleSearchQueryInput(successfulInputContext);
    expect(successResult).toBe(true);
    expect(successfulInputContext.session.isWaitingForSearchQuery).toBe(false);
    expect(successfulInputContext.session.lastFailedSearchQuery).toBeNull();
    expect(successfulInputContext.reply).toHaveBeenCalled();
  });
});
