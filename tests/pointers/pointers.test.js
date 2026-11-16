import { describe, expect, it } from 'vitest';
import { TEXTS } from '../../src/constants/texts.js';
import {
  handleNextPointer,
  handlePointer,
  handlePointerToReminder
} from '../../src/handlers/pointers.js';
import { REMINDER_STEP } from '../../src/handlers/reminders.js';
import { Pointer } from '../../src/models/Pointer.js';
import { getNextPointerForUser, toggleFavoritePointer } from '../../src/services/pointers.js';
import { createMockContext } from '../helpers/mockContext.js';

describe('Указатели (Pointers)', () => {
  it('должен сообщать, если в базе нет доступных указателей', async () => {
    const mockContext = createMockContext();

    await handlePointer(mockContext);

    expect(mockContext.reply).toHaveBeenCalledWith(TEXTS.POINTERS.EMPTY);
  });

  it('должен отправлять текст указателя и сохранять его в сессию', async () => {
    await Pointer.create({
      text: 'Внимание на дыхании',
      source: 'Будда',
      isActive: true
    });

    const mockContext = createMockContext();

    await handlePointer(mockContext);

    expect(mockContext.reply).toHaveBeenCalled();
    expect(mockContext.session.lastPointerText).toBe('Внимание на дыхании');
  });

  it('должен выдавать следующий указатель при вызове handleNextPointer текстом', async () => {
    await Pointer.create({
      text: 'Наблюдай за мыслями',
      isActive: true
    });

    const mockContext = createMockContext();

    await handleNextPointer(mockContext);

    expect(mockContext.reply).toHaveBeenCalled();
    expect(mockContext.session.lastPointerText).toBe('Наблюдай за мыслями');
  });

  it('должен плавно редактировать сообщение при нажатии inline-кнопки Следующий', async () => {
    await Pointer.create({
      text: 'Покой внутри тебя',
      isActive: true
    });

    const callbackMockContext = createMockContext({
      callbackData: 'pointer:next'
    });

    await handleNextPointer(callbackMockContext);

    expect(callbackMockContext.answerCbQuery).toHaveBeenCalled();
    expect(callbackMockContext.editMessageText).toHaveBeenCalled();
    expect(callbackMockContext.session.lastPointerText).toBe('Покой внутри тебя');
  });

  it('должен переводить текущий указатель в режим создания напоминания', async () => {
    const mockContext = createMockContext({
      session: {
        lastPointerText: 'Кто свидетель происходящего?'
      }
    });

    await handlePointerToReminder(mockContext);

    expect(mockContext.session.reminderStep).toBe(REMINDER_STEP.INTERVAL);
    expect(mockContext.session.creatingReminder).toEqual({
      text: 'Кто свидетель происходящего?',
      fromPointer: true
    });
    expect(mockContext.reply).toHaveBeenCalled();
  });
});

describe('getNextPointerForUser — фильтрация по тегу тишина', () => {
  it('должен возвращать только указатели с тегом тишина, когда передан этот фильтр', async () => {
    await Pointer.create({ text: 'Тишина 1', tags: ['тишина'], isActive: true });
    await Pointer.create({ text: 'Без тега', tags: [], isActive: true });
    await Pointer.create({ text: 'Другой тег', tags: ['практика'], isActive: true });

    const pointer = await getNextPointerForUser(777001, 'тишина');

    expect(pointer).not.toBeNull();
    expect(pointer.tags).toContain('тишина');
  });

  it('не должен возвращать указатели без тега тишина при фильтрации', async () => {
    await Pointer.create({ text: 'Только без тишины', tags: ['практика'], isActive: true });

    const pointer = await getNextPointerForUser(777002, 'тишина');

    expect(pointer).toBeNull();
  });

  it('должен возвращать все активные указатели без фильтра по тегу', async () => {
    await Pointer.create({ text: 'Любой активный', tags: ['практика'], isActive: true });
    await Pointer.create({ text: 'С тишиной', tags: ['тишина'], isActive: true });

    const pointer = await getNextPointerForUser(777003);

    expect(pointer).not.toBeNull();
  });

  it('не должен смешивать шаффл-очереди пользователей с разными фильтрами', async () => {
    await Pointer.create({ text: 'Тишина А', tags: ['тишина'], isActive: true });
    await Pointer.create({ text: 'Тишина Б', tags: ['тишина'], isActive: true });
    await Pointer.create({ text: 'Без тега 1', tags: [], isActive: true });
    await Pointer.create({ text: 'Без тега 2', tags: [], isActive: true });

    const pointerWithFilter = await getNextPointerForUser(777004, 'тишина');
    const pointerWithoutFilter = await getNextPointerForUser(777005);

    expect(pointerWithFilter.tags).toContain('тишина');
    expect(pointerWithoutFilter).not.toBeNull();
  });
});

describe('getNextPointerForUser — показ избранного в конце круга', () => {
  it('должен выдавать указатели из избранного в конце круга, а затем начинать новый круг', async () => {
    const userId = 888101;
    const pointerOne = await Pointer.create({ text: 'Первый указатель', isActive: true });
    const pointerTwo = await Pointer.create({ text: 'Второй указатель', isActive: true });
    const pointerThree = await Pointer.create({ text: 'Третий указатель', isActive: true });

    await toggleFavoritePointer(userId, pointerOne._id);

    const firstRoundPointers = [
      await getNextPointerForUser(userId),
      await getNextPointerForUser(userId),
      await getNextPointerForUser(userId)
    ];

    const firstRoundTexts = firstRoundPointers.map(item => item.text);
    expect(firstRoundTexts).toHaveLength(3);
    expect(firstRoundTexts).toContain('Первый указатель');
    expect(firstRoundTexts).toContain('Второй указатель');
    expect(firstRoundTexts).toContain('Третий указатель');

    const finalePointer = await getNextPointerForUser(userId);
    expect(String(finalePointer._id)).toBe(String(pointerOne._id));
    expect(finalePointer.text).toBe('Первый указатель');

    const secondRoundPointers = [
      await getNextPointerForUser(userId),
      await getNextPointerForUser(userId),
      await getNextPointerForUser(userId)
    ];
    const secondRoundTexts = secondRoundPointers.map(item => item.text);
    expect(secondRoundTexts).toContain('Первый указатель');
    expect(secondRoundTexts).toContain('Второй указатель');
    expect(secondRoundTexts).toContain('Третий указатель');

    const secondFinalePointer = await getNextPointerForUser(userId);
    expect(String(secondFinalePointer._id)).toBe(String(pointerOne._id));
  });

  it('должен проходить по нескольким указателям из избранного в конце круга', async () => {
    const userId = 888102;
    const pointerAlpha = await Pointer.create({ text: 'Альфа', isActive: true });
    const pointerBeta = await Pointer.create({ text: 'Бета', isActive: true });

    await toggleFavoritePointer(userId, pointerAlpha._id);
    await toggleFavoritePointer(userId, pointerBeta._id);

    const mainRoundPointers = [
      await getNextPointerForUser(userId),
      await getNextPointerForUser(userId)
    ];
    expect(mainRoundPointers.map(p => p.text).sort()).toEqual(['Альфа', 'Бета']);

    const finalePointers = [
      await getNextPointerForUser(userId),
      await getNextPointerForUser(userId)
    ];
    const finaleTexts = finalePointers.map(p => p.text).sort();
    expect(finaleTexts).toEqual(['Альфа', 'Бета']);

    const newRoundFirstPointer = await getNextPointerForUser(userId);
    expect(['Альфа', 'Бета']).toContain(newRoundFirstPointer.text);
  });

  it('должен сразу переходить к новому кругу, если у пользователя нет избранного', async () => {
    const userId = 888103;
    await Pointer.create({ text: 'Один', isActive: true });
    await Pointer.create({ text: 'Два', isActive: true });

    const firstRound = [
      await getNextPointerForUser(userId),
      await getNextPointerForUser(userId)
    ];
    expect(firstRound.map(p => p.text).sort()).toEqual(['Два', 'Один']);

    const secondRoundFirst = await getNextPointerForUser(userId);
    expect(['Два', 'Один']).toContain(secondRoundFirst.text);
  });

  it('должен учитывать фильтр по тегам для финала избранного', async () => {
    const userId = 888104;
    const silenceFavorite = await Pointer.create({ text: 'Тишина любимая', tags: ['тишина'], isActive: true });
    const otherFavorite = await Pointer.create({ text: 'Обычная любимая', tags: ['другое'], isActive: true });
    const silenceRegular = await Pointer.create({ text: 'Тишина обычная', tags: ['тишина'], isActive: true });

    await toggleFavoritePointer(userId, silenceFavorite._id);
    await toggleFavoritePointer(userId, otherFavorite._id);

    const mainTaggedRound = [
      await getNextPointerForUser(userId, 'тишина'),
      await getNextPointerForUser(userId, 'тишина')
    ];
    const mainTaggedTexts = mainTaggedRound.map(p => p.text);
    expect(mainTaggedTexts).toContain('Тишина любимая');
    expect(mainTaggedTexts).toContain('Тишина обычная');
    expect(mainTaggedTexts).not.toContain('Обычная любимая');

    const finaleTaggedPointer = await getNextPointerForUser(userId, 'тишина');
    expect(finaleTaggedPointer.text).toBe('Тишина любимая');

    const newTaggedRoundPointer = await getNextPointerForUser(userId, 'тишина');
    expect(['Тишина любимая', 'Тишина обычная']).toContain(newTaggedRoundPointer.text);
  });
});
