import { describe, expect, it } from 'vitest';
import { TEXTS } from '../../src/constants/texts.js';
import {
  handleNextPointer,
  handlePointer,
  handlePointerToReminder
} from '../../src/handlers/pointers.js';
import { REMINDER_STEP } from '../../src/handlers/reminders.js';
import { Pointer } from '../../src/models/Pointer.js';
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
