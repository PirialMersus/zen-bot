import { describe, expect, it } from 'vitest';
import { TEXTS } from '../../src/constants/texts.js';
import {
  handleNextPointer,
  handlePointer,
  handlePointerToReminder
} from '../../src/handlers/pointers.js';
import { REMINDER_STEP } from '../../src/handlers/reminders.js';
import { Pointer } from '../../src/models/Pointer.js';
import { getNextPointerForUser } from '../../src/services/pointers.js';
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
