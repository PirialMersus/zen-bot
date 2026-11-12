import { describe, expect, it, beforeEach } from 'vitest';
import { handleStart } from '../../src/handlers/menu.js';
import { handleBack } from '../../src/handlers/back.js';
import { handlePointersMenu, handleNextPointer } from '../../src/handlers/pointers.js';
import {
  handleReminders,
  handleCreateReminder,
  handleReminderText,
  handleIntervalPreset,
  handleMyReminders,
  REMINDER_STEP
} from '../../src/handlers/reminders.js';
import { handleSettings } from '../../src/handlers/settings/general.js';
import { handleLanguageMenu } from '../../src/handlers/settings/language.js';
import { handleUnknownMessage } from '../../src/handlers/fallback.js';
import { Pointer } from '../../src/models/Pointer.js';
import Reminder from '../../src/models/Reminder.js';
import User from '../../src/models/User.js';
import { createMockContext } from '../helpers/mockContext.js';
import { BUTTONS } from '../../src/constants/buttons.js';
import { UI } from '../../src/constants/ui.js';
import { clearUserCache } from '../../src/middlewares/activity.js';

describe('Контракты пользовательского интерфейса (UI Contracts & Flow Integrity)', () => {
  beforeEach(async () => {
    clearUserCache();
    await Pointer.deleteMany({});
    await Reminder.deleteMany({});
    await User.deleteMany({});
  });

  describe('Контракт меню указателей (Pointers UI)', () => {
    it('должен отправлять сообщение-якорь с нижней клавиатурой и карточку с inline-кнопками, не удаляя якорь', async () => {
      await Pointer.create({
        number: 1,
        text: 'Осознай дыхание прямо сейчас.',
        source: 'Дзен',
        isActive: true,
        tags: ['тишина']
      });

      const mockContext = createMockContext({ userId: 1001 });

      await handlePointersMenu(mockContext);

      expect(mockContext.reply).toHaveBeenCalledTimes(2);

      const firstCallArgs = mockContext.reply.mock.calls[0];
      const anchorMessageText = firstCallArgs[0];
      const anchorKeyboardOptions = firstCallArgs[1];

      expect(anchorMessageText).toContain('Указатели');
      expect(anchorKeyboardOptions).toBeDefined();
      expect(anchorKeyboardOptions.reply_markup).toBeDefined();
      expect(anchorKeyboardOptions.reply_markup.keyboard).toBeDefined();

      const flattenedButtons = anchorKeyboardOptions.reply_markup.keyboard.flat().map(btn => btn.text || btn);
      expect(flattenedButtons).toContain(UI.ru.POINTER_RANDOM);
      expect(flattenedButtons).toContain(UI.ru.POINTER_FAVORITE);
      expect(flattenedButtons).toContain(BUTTONS.ru.BACK);

      expect(mockContext.deleteMessage).not.toHaveBeenCalled();

      const secondCallArgs = mockContext.reply.mock.calls[1];
      const cardMessageText = secondCallArgs[0];
      const cardKeyboardOptions = secondCallArgs[1];

      expect(cardMessageText).toContain('Осознай дыхание прямо сейчас.');
      expect(cardKeyboardOptions).toBeDefined();
      expect(cardKeyboardOptions.reply_markup).toBeDefined();
      expect(cardKeyboardOptions.reply_markup.inline_keyboard).toBeDefined();

      const inlineButtons = cardKeyboardOptions.reply_markup.inline_keyboard.flat().map(btn => btn.text);
      expect(inlineButtons).toContain(UI.ru.POINTER_TO_REMINDER);
      expect(inlineButtons).toContain(UI.ru.POINTER_NEXT);
      expect(inlineButtons).toContain(UI.ru.POINTER_FAV_ADD);
    });

    it('при клике на Следующий должен обновлять карточку через editMessageText без удаления и без сброса нижней клавиатуры', async () => {
      await Pointer.create({
        number: 1,
        text: 'Первый указатель',
        isActive: true,
        tags: ['тишина']
      });
      await Pointer.create({
        number: 2,
        text: 'Второй указатель',
        isActive: true,
        tags: ['тишина']
      });

      const callbackContext = createMockContext({
        userId: 1002,
        callbackData: 'pointer:next:random'
      });

      await handleNextPointer(callbackContext);

      expect(callbackContext.editMessageText).toHaveBeenCalledTimes(1);
      expect(callbackContext.deleteMessage).not.toHaveBeenCalled();

      const editCallArgs = callbackContext.editMessageText.mock.calls[0];
      const updatedText = editCallArgs[0];
      const updatedOptions = editCallArgs[1];

      expect(typeof updatedText).toBe('string');
      expect(updatedOptions.reply_markup).toBeDefined();
      expect(updatedOptions.reply_markup.inline_keyboard).toBeDefined();
      expect(updatedOptions.reply_markup.remove_keyboard).toBeUndefined();
    });
  });

  describe('Контракт главного меню и навигации (Main Menu UI)', () => {
    it('handleStart должен отправлять постоянную нижнюю клавиатуру главного меню', async () => {
      const mockContext = createMockContext({ userId: 2001 });

      await handleStart(mockContext);

      expect(mockContext.reply).toHaveBeenCalledTimes(1);
      const [, keyboardOptions] = mockContext.reply.mock.calls[0];

      expect(keyboardOptions.reply_markup).toBeDefined();
      expect(keyboardOptions.reply_markup.keyboard).toBeDefined();

      const mainButtons = keyboardOptions.reply_markup.keyboard.flat().map(btn => btn.text || btn);
      expect(mainButtons).toContain(BUTTONS.ru.POINTER);
      expect(mainButtons).toContain(BUTTONS.ru.REMINDERS);
      expect(mainButtons).toContain(BUTTONS.ru.SETTINGS);
      expect(mainButtons).toContain(BUTTONS.ru.SUPPORT);
    });

    it('handleBack без активного шага должен возвращать в главное меню с сохранением главной клавиатуры', async () => {
      const mockContext = createMockContext({
        userId: 2002,
        session: { reminderStep: null }
      });

      await handleBack(mockContext);

      expect(mockContext.reply).toHaveBeenCalledTimes(1);
      const [, keyboardOptions] = mockContext.reply.mock.calls[0];

      const mainButtons = keyboardOptions.reply_markup.keyboard.flat().map(btn => btn.text || btn);
      expect(mainButtons).toContain(BUTTONS.ru.POINTER);
      expect(mainButtons).toContain(BUTTONS.ru.REMINDERS);
    });
  });

  describe('Контракт меню и мастера напоминаний (Reminders UI Flow)', () => {
    it('handleReminders должен отправлять нижнюю клавиатуру напоминаний с кнопками Создать, Список и Назад', async () => {
      const mockContext = createMockContext({ userId: 3001 });

      await handleReminders(mockContext);

      expect(mockContext.reply).toHaveBeenCalledTimes(1);
      const [, keyboardOptions] = mockContext.reply.mock.calls[0];

      expect(keyboardOptions.reply_markup).toBeDefined();
      expect(keyboardOptions.reply_markup.keyboard).toBeDefined();

      const reminderButtons = keyboardOptions.reply_markup.keyboard.flat().map(btn => btn.text || btn);
      expect(reminderButtons).toContain(UI.ru.REMINDER_CREATE);
      expect(reminderButtons).toContain(UI.ru.REMINDER_MY);
      expect(reminderButtons).toContain(BUTTONS.ru.BACK);
      expect(mockContext.deleteMessage).not.toHaveBeenCalled();
    });

    it('полный пошаговый сценарий создания напоминания должен на каждом шаге сохранять клавиатуру навигации', async () => {
      const wizardContext = createMockContext({ userId: 3002 });

      await handleCreateReminder(wizardContext);

      expect(wizardContext.session.reminderStep).toBe(REMINDER_STEP.TEXT);
      expect(wizardContext.reply).toHaveBeenCalledTimes(1);
      const [, textStepKeyboard] = wizardContext.reply.mock.calls[0];
      const textButtons = textStepKeyboard.reply_markup.keyboard.flat().map(btn => btn.text || btn);
      expect(textButtons).toContain(BUTTONS.ru.BACK);

      wizardContext.message = { text: 'Пить воду регулярно' };
      await handleReminderText(wizardContext);

      expect(wizardContext.session.reminderStep).toBe(REMINDER_STEP.INTERVAL);
      expect(wizardContext.reply).toHaveBeenCalledTimes(2);
      const [, intervalStepKeyboard] = wizardContext.reply.mock.calls[1];
      const intervalButtons = intervalStepKeyboard.reply_markup.keyboard.flat().map(btn => btn.text || btn);
      expect(intervalButtons).toContain(UI.ru.INTERVAL_5);
      expect(intervalButtons).toContain(UI.ru.INTERVAL_15);
      expect(intervalButtons).toContain(UI.ru.INTERVAL_60);
      expect(intervalButtons).toContain(UI.ru.INTERVAL_1440);
      expect(intervalButtons).toContain(BUTTONS.ru.BACK);

      await handleIntervalPreset(wizardContext, 60);

      expect(wizardContext.session.reminderStep).toBe(REMINDER_STEP.AUTO_DELETE);
      expect(wizardContext.reply).toHaveBeenCalledTimes(3);
      const [, autoDeleteStepKeyboard] = wizardContext.reply.mock.calls[2];
      const autoDeleteButtons = autoDeleteStepKeyboard.reply_markup.keyboard.flat().map(btn => btn.text || btn);
      expect(autoDeleteButtons.length).toBeGreaterThan(0);
      expect(autoDeleteButtons).toContain(BUTTONS.ru.BACK);
    });

    it('handleMyReminders при наличии напоминания должен выводить карточку с инлайн-кнопками управления', async () => {
      await Reminder.create({
        userId: 3003,
        chatId: 3003,
        text: 'Медитировать 10 минут',
        intervalMinutes: 60,
        isActive: true
      });

      const listContext = createMockContext({ userId: 3003 });

      await handleMyReminders(listContext);

      expect(listContext.reply).toHaveBeenCalledTimes(1);
      const [replyText, replyOptions] = listContext.reply.mock.calls[0];

      expect(replyText).toContain('Медитировать 10 минут');
      expect(replyOptions.reply_markup).toBeDefined();
      expect(replyOptions.reply_markup.inline_keyboard).toBeDefined();

      const inlineActionButtons = replyOptions.reply_markup.inline_keyboard.flat().map(btn => btn.text);
      expect(inlineActionButtons.some(text => text.includes('Приостановить'))).toBe(true);
      expect(inlineActionButtons.some(text => text.includes('Удалить'))).toBe(true);
    });

    it('handleMyReminders при наличии нескольких напоминаний должен формировать список со всеми напоминаниями', async () => {
      await Reminder.create([
        { userId: 3004, chatId: 3004, text: 'Первое напоминание', intervalMinutes: 60, isActive: true },
        { userId: 3004, chatId: 3004, text: 'Второе напоминание', intervalMinutes: 120, isActive: true }
      ]);

      const multipleListContext = createMockContext({ userId: 3004 });

      await handleMyReminders(multipleListContext);

      expect(multipleListContext.reply).toHaveBeenCalledTimes(1);
      const [replyText, replyOptions] = multipleListContext.reply.mock.calls[0];

      expect(replyText).toContain('1.');
      expect(replyText).toContain('2.');
      expect(replyText).toContain('Первое напоминание');
      expect(replyText).toContain('Второе напоминание');
      expect(replyText).not.toContain('У тебя нет напоминаний');
      expect(replyOptions.reply_markup.inline_keyboard.length).toBeGreaterThan(0);
    });
  });

  describe('Контракт меню настроек (Settings UI)', () => {
    it('handleSettings должен отдавать инлайн-меню со всеми разделами настроек', async () => {
      const settingsContext = createMockContext({ userId: 4001 });

      await handleSettings(settingsContext);

      expect(settingsContext.reply).toHaveBeenCalledTimes(1);
      const [, settingsOptions] = settingsContext.reply.mock.calls[0];

      expect(settingsOptions.reply_markup).toBeDefined();
      expect(settingsOptions.reply_markup.inline_keyboard).toBeDefined();

      const callbacks = settingsOptions.reply_markup.inline_keyboard.flat().map(btn => btn.callback_data);
      expect(callbacks).toContain('settings:timezone');
      expect(callbacks).toContain('settings:language');
      expect(callbacks).toContain('settings:quiet_hours:menu');
    });

    it('handleLanguageMenu должен отображать инлайн-кнопки всех 4 поддерживаемых языков', async () => {
      const languageContext = createMockContext({ userId: 4002 });

      await handleLanguageMenu(languageContext);

      expect(languageContext.reply).toHaveBeenCalledTimes(1);
      const [, languageOptions] = languageContext.reply.mock.calls[0];

      const callbacks = languageOptions.reply_markup.inline_keyboard.flat().map(btn => btn.callback_data);
      expect(callbacks).toContain('settings:language:set:ru');
      expect(callbacks).toContain('settings:language:set:en');
      expect(callbacks).toContain('settings:language:set:uk');
      expect(callbacks).toContain('settings:language:set:es');
      expect(callbacks).toContain('settings:language:back');
    });
  });

  describe('Контракт Fallback на неизвестный ввод (Unknown Message UI Safety)', () => {
    it('handleUnknownMessage обязан восстанавливать пользователю главное меню с нижней клавиатурой', async () => {
      const fallbackContext = createMockContext({
        userId: 5001,
        message: { text: 'случайный неизвестный текст' }
      });

      await handleUnknownMessage(fallbackContext);

      expect(fallbackContext.reply).toHaveBeenCalledTimes(1);
      const [responseText, responseOptions] = fallbackContext.reply.mock.calls[0];

      expect(responseText).toContain('Я не понял это сообщение');
      expect(responseOptions.reply_markup).toBeDefined();
      expect(responseOptions.reply_markup.keyboard).toBeDefined();

      const restoredButtons = responseOptions.reply_markup.keyboard.flat().map(btn => btn.text || btn);
      expect(restoredButtons).toContain(BUTTONS.ru.POINTER);
      expect(restoredButtons).toContain(BUTTONS.ru.REMINDERS);
      expect(restoredButtons).toContain(BUTTONS.ru.SETTINGS);
      expect(restoredButtons).toContain(BUTTONS.ru.SUPPORT);
    });
  });
});
