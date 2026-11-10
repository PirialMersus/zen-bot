import { describe, expect, it } from 'vitest';
import { TEXTS, getTexts } from '../../src/constants/texts.js';
import { BUTTONS, getButtons } from '../../src/constants/buttons.js';
import { UI, getUi } from '../../src/constants/ui.js';
import { handleStart } from '../../src/handlers/menu.js';
import { handleBack } from '../../src/handlers/back.js';
import {
  handleCreateReminder,
  handleDeleteAfterInput,
  handleDeleteAfterPreset,
  handleIntervalInput,
  handleIntervalPreset,
  handleMyReminders,
  handleReminderText,
  handleRequestAction,
  handleConfirmAction,
  handleViewReminder,
  REMINDER_STEP
} from '../../src/handlers/reminders.js';
import {
  handleSettings,
  handleTimezoneMenu,
  handleTimezoneRegion,
  handleTimezoneSet,
  handleLanguageMenu,
  handleLanguageSet
} from '../../src/handlers/settings/quietHours.js';
import {
  handlePointer,
  handleNextPointer,
  handlePointerToReminder
} from '../../src/handlers/pointers.js';
import { resolveUserLanguage } from '../../src/middlewares/activity.js';
import { getNextPointerForUser } from '../../src/services/pointers.js';
import { PointerEn, PointerEs } from '../../src/models/Pointer.js';
import Reminder from '../../src/models/Reminder.js';
import User from '../../src/models/User.js';
import { createMockContext } from '../helpers/mockContext.js';

describe('Покрытие всех переводов и целостность мультиязычности (i18n Coverage)', () => {
  it('должен гарантировать полную симметрию ключей в TEXTS между ru и en', () => {
    const collectObjectLeafKeys = (sourceObject, currentPrefix = '') => {
      let accumulatedKeyPaths = [];
      for (const objectKey of Object.keys(sourceObject)) {
        if (objectKey === 'INTERVALS') continue;
        const completePath = currentPrefix ? `${currentPrefix}.${objectKey}` : objectKey;
        if (typeof sourceObject[objectKey] === 'object' && sourceObject[objectKey] !== null) {
          accumulatedKeyPaths = accumulatedKeyPaths.concat(collectObjectLeafKeys(sourceObject[objectKey], completePath));
        } else {
          accumulatedKeyPaths.push(completePath);
        }
      }
      return accumulatedKeyPaths.sort();
    };

    const russianLeafKeys = collectObjectLeafKeys(TEXTS.ru);
    const englishLeafKeys = collectObjectLeafKeys(TEXTS.en);
    const ukrainianLeafKeys = collectObjectLeafKeys(TEXTS.uk);
    const spanishLeafKeys = collectObjectLeafKeys(TEXTS.es);

    expect(englishLeafKeys).toEqual(russianLeafKeys);
    expect(ukrainianLeafKeys).toEqual(russianLeafKeys);
    expect(spanishLeafKeys).toEqual(russianLeafKeys);

    expect(TEXTS.ru.INTERVALS.OPTIONS.length).toBe(TEXTS.en.INTERVALS.OPTIONS.length);
    expect(TEXTS.uk.INTERVALS.OPTIONS.length).toBe(TEXTS.ru.INTERVALS.OPTIONS.length);
    expect(TEXTS.es.INTERVALS.OPTIONS.length).toBe(TEXTS.ru.INTERVALS.OPTIONS.length);
    expect(Object.keys(TEXTS.ru.INTERVALS.MAP).length).toBe(Object.keys(TEXTS.en.INTERVALS.MAP).length);
    expect(Object.keys(TEXTS.uk.INTERVALS.MAP).length).toBe(Object.keys(TEXTS.ru.INTERVALS.MAP).length);
    expect(Object.keys(TEXTS.es.INTERVALS.MAP).length).toBe(Object.keys(TEXTS.ru.INTERVALS.MAP).length);
  });

  it('должен гарантировать полную симметрию ключей в BUTTONS и UI между ru, en, uk и es', () => {
    const russianButtonKeys = Object.keys(BUTTONS.ru).sort();
    const englishButtonKeys = Object.keys(BUTTONS.en).sort();
    const ukrainianButtonKeys = Object.keys(BUTTONS.uk).sort();
    const spanishButtonKeys = Object.keys(BUTTONS.es).sort();
    expect(englishButtonKeys).toEqual(russianButtonKeys);
    expect(ukrainianButtonKeys).toEqual(russianButtonKeys);
    expect(spanishButtonKeys).toEqual(russianButtonKeys);

    const russianUiKeys = Object.keys(UI.ru).sort();
    const englishUiKeys = Object.keys(UI.en).sort();
    const ukrainianUiKeys = Object.keys(UI.uk).sort();
    const spanishUiKeys = Object.keys(UI.es).sort();
    expect(englishUiKeys).toEqual(russianUiKeys);
    expect(ukrainianUiKeys).toEqual(russianUiKeys);
    expect(spanishUiKeys).toEqual(russianUiKeys);
  });

  it('должен гарантировать отсутствие пустых или undefined переводов в словарях', () => {
    const verifyNoEmptyValuesInObject = inspectedObject => {
      for (const [dictionaryKey, dictionaryValue] of Object.entries(inspectedObject)) {
        expect(dictionaryValue).not.toBeUndefined();
        expect(dictionaryValue).not.toBeNull();
        if (typeof dictionaryValue === 'string') {
          expect(dictionaryValue.trim().length).toBeGreaterThan(0);
        } else if (typeof dictionaryValue === 'object') {
          verifyNoEmptyValuesInObject(dictionaryValue);
        }
      }
    };

    verifyNoEmptyValuesInObject(TEXTS.ru);
    verifyNoEmptyValuesInObject(TEXTS.en);
    verifyNoEmptyValuesInObject(TEXTS.uk);
    verifyNoEmptyValuesInObject(TEXTS.es);
    verifyNoEmptyValuesInObject(BUTTONS.ru);
    verifyNoEmptyValuesInObject(BUTTONS.en);
    verifyNoEmptyValuesInObject(BUTTONS.uk);
    verifyNoEmptyValuesInObject(BUTTONS.es);
    verifyNoEmptyValuesInObject(UI.ru);
    verifyNoEmptyValuesInObject(UI.en);
    verifyNoEmptyValuesInObject(UI.uk);
    verifyNoEmptyValuesInObject(UI.es);
  });

  it('должен возвращать русский словарь по умолчанию при передаче неподдерживаемого языка', () => {
    expect(getTexts('fr')).toBe(TEXTS.ru);
    expect(getTexts(undefined)).toBe(TEXTS.ru);
    expect(getButtons('de')).toBe(BUTTONS.ru);
    expect(getButtons(null)).toBe(BUTTONS.ru);
    expect(getUi('it')).toBe(UI.ru);
  });

  it('должен возвращать украинские словари при передаче языка uk', () => {
    expect(getTexts('uk')).toBe(TEXTS.uk);
    expect(getButtons('uk')).toBe(BUTTONS.uk);
    expect(getUi('uk')).toBe(UI.uk);
  });

  it('должен возвращать испанские словари при передаче языка es', () => {
    expect(getTexts('es')).toBe(TEXTS.es);
    expect(getButtons('es')).toBe(BUTTONS.es);
    expect(getUi('es')).toBe(UI.es);
  });

  it('должен отправлять украиноязычное приветствие в handleStart для пользователя с украинским языком', async () => {
    const ukrainianUserId = 88771199;
    await User.create({ telegramId: ukrainianUserId, language: 'uk' });

    const mockContext = createMockContext({ userId: ukrainianUserId });
    await handleStart(mockContext);

    expect(mockContext.reply).toHaveBeenCalled();
    const [welcomeText, replyOptions] = mockContext.reply.mock.calls[0];
    expect(welcomeText).toBe(TEXTS.uk.MENU.START);

    const keyboardButtonsFlattened = replyOptions.reply_markup.keyboard.flat();
    expect(keyboardButtonsFlattened).toContain(BUTTONS.uk.REMINDERS);
    expect(keyboardButtonsFlattened).toContain(BUTTONS.uk.POINTER);
    expect(keyboardButtonsFlattened).toContain(BUTTONS.uk.SETTINGS);
    expect(keyboardButtonsFlattened).toContain(BUTTONS.uk.SUPPORT);
  });

  it('должен отправлять англоязычное приветствие в handleStart для пользователя с английским языком', async () => {
    const englishUserId = 88771122;
    await User.create({ telegramId: englishUserId, language: 'en' });

    const mockContext = createMockContext({ userId: englishUserId });
    await handleStart(mockContext);

    expect(mockContext.reply).toHaveBeenCalled();
    const [welcomeText, replyOptions] = mockContext.reply.mock.calls[0];
    expect(welcomeText).toBe(TEXTS.en.MENU.START);

    const keyboardButtonsFlattened = replyOptions.reply_markup.keyboard.flat();
    expect(keyboardButtonsFlattened).toContain(BUTTONS.en.REMINDERS);
    expect(keyboardButtonsFlattened).toContain(BUTTONS.en.POINTER);
    expect(keyboardButtonsFlattened).toContain(BUTTONS.en.SETTINGS);
    expect(keyboardButtonsFlattened).toContain(BUTTONS.en.SUPPORT);
  });

  it('должен возвращать английское главное меню в handleBack для пользователя с английским языком', async () => {
    const englishUserId = 88771133;
    await User.create({ telegramId: englishUserId, language: 'en' });

    const mockContext = createMockContext({
      userId: englishUserId,
      session: { reminderStep: null }
    });

    await handleBack(mockContext);

    expect(mockContext.reply).toHaveBeenCalled();
    const [mainMenuText] = mockContext.reply.mock.calls[0];
    expect(mainMenuText).toBe(TEXTS.en.MENU.MAIN);
  });

  it('должен проводить весь цикл создания напоминания на английском языке', async () => {
    const englishUserId = 88771144;
    await User.create({ telegramId: englishUserId, language: 'en' });

    const initialCreationContext = createMockContext({ userId: englishUserId });
    await handleCreateReminder(initialCreationContext);

    expect(initialCreationContext.reply).toHaveBeenCalled();
    const [askTextPrompt, askTextOptions] = initialCreationContext.reply.mock.calls[0];
    expect(askTextPrompt).toContain(TEXTS.en.REMINDERS.ASK_TEXT);
    const textStepButtons = askTextOptions.reply_markup.keyboard.flat();
    expect(textStepButtons).toContain(UI.en.REMINDER_RANDOM);
    expect(textStepButtons).toContain(BUTTONS.en.BACK);

    const textInputContext = createMockContext({
      userId: englishUserId,
      session: initialCreationContext.session,
      text: 'Stay present and breathe'
    });
    await handleReminderText(textInputContext);

    expect(textInputContext.reply).toHaveBeenCalled();
    const [askIntervalPrompt, askIntervalOptions] = textInputContext.reply.mock.calls[0];
    expect(askIntervalPrompt).toContain(TEXTS.en.REMINDERS.ASK_INTERVAL);
    const intervalButtons = askIntervalOptions.reply_markup.keyboard.flat();
    expect(intervalButtons).toContain(UI.en.INTERVAL_5);
    expect(intervalButtons).toContain(UI.en.INTERVAL_15);
    expect(intervalButtons).toContain(UI.en.INTERVAL_60);
    expect(intervalButtons).toContain(UI.en.INTERVAL_1440);
    expect(intervalButtons).toContain(BUTTONS.en.BACK);

    const presetIntervalContext = createMockContext({
      userId: englishUserId,
      session: textInputContext.session
    });
    await handleIntervalPreset(presetIntervalContext, 15);

    expect(presetIntervalContext.reply).toHaveBeenCalled();
    const [askDeleteAfterPrompt, askDeleteAfterOptions] = presetIntervalContext.reply.mock.calls[0];
    expect(askDeleteAfterPrompt).toContain(TEXTS.en.REMINDERS.ASK_DELETE_AFTER);
    const deleteAfterButtons = askDeleteAfterOptions.reply_markup.keyboard.flat();
    expect(deleteAfterButtons).toContain('10 sec');
    expect(deleteAfterButtons).toContain('30 sec');
    expect(deleteAfterButtons).toContain('1 min');
    expect(deleteAfterButtons).toContain('Do not delete');
    expect(deleteAfterButtons).toContain(BUTTONS.en.BACK);

    const finishCreationContext = createMockContext({
      userId: englishUserId,
      session: presetIntervalContext.session,
      text: '30 sec'
    });
    await handleDeleteAfterPreset(finishCreationContext);

    expect(finishCreationContext.reply).toHaveBeenCalledTimes(2);
    const [previewMessageText] = finishCreationContext.reply.mock.calls[0];
    expect(previewMessageText).toContain('auto-delete: in 30 sec');
    expect(previewMessageText).toContain('Every 15 min ⌛');
    expect(previewMessageText).toContain('Stay present and breathe');

    const [doneMessageText] = finishCreationContext.reply.mock.calls[1];
    expect(doneMessageText).toContain(TEXTS.en.REMINDERS.CREATED);

    const createdReminder = await Reminder.findOne({ userId: String(englishUserId) });
    expect(createdReminder).not.toBeNull();
    expect(createdReminder.intervalMinutes).toBe(15);
    expect(createdReminder.deleteAfterSeconds).toBe(30);
  });

  it('должен выводить локализованные ошибки валидации при некорректном ручном вводе на английском', async () => {
    const englishUserId = 88771155;
    await User.create({ telegramId: englishUserId, language: 'en' });

    const invalidIntervalContext = createMockContext({
      userId: englishUserId,
      session: {
        reminderStep: REMINDER_STEP.INTERVAL,
        creatingReminder: { text: 'Mindfulness' }
      },
      text: 'not_a_number'
    });
    await handleIntervalInput(invalidIntervalContext);

    expect(invalidIntervalContext.reply).toHaveBeenCalledWith(TEXTS.en.REMINDERS.MIN_INTERVAL);

    const invalidDeleteAfterContext = createMockContext({
      userId: englishUserId,
      session: {
        reminderStep: REMINDER_STEP.AUTO_DELETE,
        creatingReminder: { text: 'Mindfulness', intervalMinutes: 30 }
      },
      text: 'wrong_seconds'
    });
    await handleDeleteAfterInput(invalidDeleteAfterContext);

    expect(invalidDeleteAfterContext.reply).toHaveBeenCalledWith(TEXTS.en.REMINDERS.INVALID_SECONDS);
  });

  it('должен отображать список напоминаний и кнопки действий на английском языке', async () => {
    const englishUserId = 88771166;
    await User.create({ telegramId: englishUserId, language: 'en' });

    const emptyListContext = createMockContext({ userId: englishUserId });
    await handleMyReminders(emptyListContext);

    expect(emptyListContext.reply).toHaveBeenCalled();
    const [emptyListPrompt, emptyListOptions] = emptyListContext.reply.mock.calls[0];
    expect(emptyListPrompt).toBe(TEXTS.en.REMINDERS.NONE);
    const emptyListButtons = emptyListOptions.reply_markup.keyboard.flat();
    expect(emptyListButtons).toContain(UI.en.REMINDER_CREATE);
    expect(emptyListButtons).toContain(UI.en.REMINDER_MY);
    expect(emptyListButtons).toContain(BUTTONS.en.BACK);

    const createdReminderRecord = await Reminder.create({
      userId: String(englishUserId),
      chatId: englishUserId,
      text: 'Observe thoughts without judgement',
      intervalMinutes: 60,
      deleteAfterSeconds: null,
      isActive: true
    });

    const populatedListContext = createMockContext({ userId: englishUserId });
    await handleMyReminders(populatedListContext);

    expect(populatedListContext.reply).toHaveBeenCalled();
    const [singleReminderText, singleReminderOptions] = populatedListContext.reply.mock.calls[0];
    expect(singleReminderText).toContain(TEXTS.en.STATUS.ACTIVE);
    expect(singleReminderText).toContain('Every hour ⌛');
    expect(singleReminderText).toContain('(auto-delete: do not delete)');
    expect(singleReminderText).toContain('Observe thoughts without judgement');

    const inlineActionButtons = singleReminderOptions.reply_markup.inline_keyboard.flat();
    const actionButtonsTextList = inlineActionButtons.map(buttonItem => buttonItem.text);
    expect(actionButtonsTextList).toContain('⏸️ Pause');
    expect(actionButtonsTextList).toContain('🗑 Delete');

    const pauseActionContext = createMockContext({
      userId: englishUserId,
      callbackData: `pause:${createdReminderRecord._id}`
    });
    await handleRequestAction(pauseActionContext, 'pause');

    expect(pauseActionContext.answerCbQuery).toHaveBeenCalledWith('Status updated');

    const deleteActionContext = createMockContext({
      userId: englishUserId,
      callbackData: `delete:${createdReminderRecord._id}`
    });
    await handleRequestAction(deleteActionContext, 'delete');

    expect(deleteActionContext.editMessageReplyMarkup).toHaveBeenCalled();
    const deleteMarkupArgument = deleteActionContext.editMessageReplyMarkup.mock.calls[0][0];
    const deleteConfirmButtons = deleteMarkupArgument.inline_keyboard.flat().map(buttonItem => buttonItem.text);
    expect(deleteConfirmButtons).toContain('🗑 Confirm');
    expect(deleteConfirmButtons).toContain('❌ Cancel');
  });

  it('должен отображать меню настроек и выбор часового пояса на английском языке', async () => {
    const englishUserId = 88771177;
    await User.create({
      telegramId: englishUserId,
      language: 'en',
      timezone: 'Europe/London',
      quietHours: { enabled: true, start: 23, end: 8 }
    });

    const settingsContext = createMockContext({ userId: englishUserId });
    await handleSettings(settingsContext);

    expect(settingsContext.reply).toHaveBeenCalled();
    const [settingsMessageText, settingsMessageOptions] = settingsContext.reply.mock.calls[0];
    expect(settingsMessageText).toContain(TEXTS.en.MENU.SETTINGS);

    const settingsButtons = settingsMessageOptions.reply_markup.inline_keyboard.flat().map(buttonItem => buttonItem.text);
    expect(settingsButtons).toContain(BUTTONS.en.QUIET_OFF);
    expect(settingsButtons.some(buttonText => buttonText.includes(BUTTONS.en.TIMEZONE))).toBe(true);
    expect(settingsButtons.some(buttonText => buttonText.includes(BUTTONS.en.LANGUAGE))).toBe(true);
    expect(settingsButtons).toContain(BUTTONS.en.BACK);

    const timezoneMenuContext = createMockContext({
      userId: englishUserId,
      callbackData: 'settings:timezone'
    });
    await handleTimezoneMenu(timezoneMenuContext);

    expect(timezoneMenuContext.reply).toHaveBeenCalled();
    const [regionPromptText, regionOptions] = timezoneMenuContext.reply.mock.calls[0];
    expect(regionPromptText).toContain('Select region');
    const regionButtons = regionOptions.reply_markup.inline_keyboard.flat().map(buttonItem => buttonItem.text);
    expect(regionButtons).toContain(BUTTONS.en.BACK);

    const timezoneRegionContext = createMockContext({
      userId: englishUserId,
      callbackData: 'timezone:region:europe'
    });
    await handleTimezoneRegion(timezoneRegionContext);

    expect(timezoneRegionContext.reply).toHaveBeenCalled();
    const [cityPromptText, cityOptions] = timezoneRegionContext.reply.mock.calls[0];
    expect(cityPromptText).toContain('Select city');
    const cityButtons = cityOptions.reply_markup.inline_keyboard.flat().map(buttonItem => buttonItem.text);
    expect(cityButtons).toContain(BUTTONS.en.BACK);

    const timezoneSetContext = createMockContext({
      userId: englishUserId,
      callbackData: 'timezone:set:Europe/London'
    });
    await handleTimezoneSet(timezoneSetContext);

    expect(timezoneSetContext.reply).toHaveBeenCalled();
    const [timezoneConfirmationText] = timezoneSetContext.reply.mock.calls[0];
    expect(timezoneConfirmationText).toContain('Timezone set:');
    expect(timezoneConfirmationText).toContain('Europe/London');
  });

  it('должен переключать язык на русский и отправлять подтверждение на русском', async () => {
    const testedUserId = 88771188;
    await User.create({ telegramId: testedUserId, language: 'en' });

    const languageSetContext = createMockContext({
      userId: testedUserId,
      callbackData: 'settings:language:set:ru'
    });

    await handleLanguageSet(languageSetContext);

    expect(languageSetContext.reply).toHaveBeenCalled();
    const [switchedLanguagePrompt, switchedOptions] = languageSetContext.reply.mock.calls[0];
    expect(switchedLanguagePrompt).toBe(TEXTS.ru.SETTINGS.LANGUAGE_CHANGED);
    const mainButtons = switchedOptions.reply_markup.keyboard.flat();
    expect(mainButtons).toContain(BUTTONS.ru.REMINDERS);
    expect(mainButtons).toContain(BUTTONS.ru.POINTER);

    const userInDatabase = await User.findOne({ telegramId: testedUserId });
    expect(userInDatabase.language).toBe('ru');
  });

  it('должен выдавать английские указатели с английскими кнопками в handlePointer и handleNextPointer', async () => {
    const englishUserId = 88771199;
    await User.create({ telegramId: englishUserId, language: 'en' });

    await PointerEn.create({
      number: 1,
      text: 'You are the awareness behind the thoughts',
      source: 'Eckhart Tolle',
      isActive: true
    });

    const pointerContext = createMockContext({ userId: englishUserId });
    await handlePointer(pointerContext);

    expect(pointerContext.reply).toHaveBeenCalled();
    const [pointerReplyText, pointerOptions] = pointerContext.reply.mock.calls[0];
    expect(pointerReplyText).toContain('You are the awareness behind the thoughts');
    expect(pointerReplyText).toContain('Eckhart Tolle');

    const inlineButtons = pointerOptions.reply_markup.inline_keyboard.flat().map(buttonItem => buttonItem.text);
    expect(inlineButtons).toContain(UI.en.POINTER_TO_REMINDER);
    expect(inlineButtons).toContain(UI.en.POINTER_NEXT);

    const nextPointerContext = createMockContext({
      userId: englishUserId,
      callbackData: 'pointer:next'
    });
    await handleNextPointer(nextPointerContext);

    expect(nextPointerContext.editMessageText).toHaveBeenCalled();
    const [editedPointerText, editedOptions] = nextPointerContext.editMessageText.mock.calls[0];
    expect(editedPointerText).toContain('You are the awareness behind the thoughts');

    const editedButtons = editedOptions.reply_markup.inline_keyboard.flat().map(buttonItem => buttonItem.text);
    expect(editedButtons).toContain(UI.en.POINTER_TO_REMINDER);
    expect(editedButtons).toContain(UI.en.POINTER_NEXT);
  });

  it('должен переводить указатель в напоминание на английском языке через handlePointerToReminder', async () => {
    const englishUserId = 88771200;
    await User.create({ telegramId: englishUserId, language: 'en' });

    const pointerToReminderContext = createMockContext({
      userId: englishUserId,
      session: {
        lastPointerText: 'Observe the present moment'
      }
    });

    await handlePointerToReminder(pointerToReminderContext);

    expect(pointerToReminderContext.reply).toHaveBeenCalled();
    const [askIntervalMessage, intervalOptions] = pointerToReminderContext.reply.mock.calls[0];
    expect(askIntervalMessage).toContain(TEXTS.en.REMINDERS.ASK_INTERVAL);
    expect(askIntervalMessage).toContain(TEXTS.en.REMINDERS.ASK_INTERVAL_HINT);
    expect(askIntervalMessage).toContain('Observe the present moment');

    const intervalButtons = intervalOptions.reply_markup.keyboard.flat();
    expect(intervalButtons).toContain(UI.en.INTERVAL_5);
    expect(intervalButtons).toContain(UI.en.INTERVAL_60);
    expect(intervalButtons).toContain(BUTTONS.en.BACK);
  });

  it('должен отправлять текст службы заботы на английском языке', async () => {
    const englishUserId = 88771201;
    await User.create({ telegramId: englishUserId, language: 'en' });

    const supportContext = createMockContext({ userId: englishUserId });
    const userLanguage = await resolveUserLanguage(supportContext);
    const texts = getTexts(userLanguage);

    await supportContext.reply(texts.SUPPORT);

    expect(supportContext.reply).toHaveBeenCalledWith(TEXTS.en.SUPPORT);
  });

  it('должен автоматически сопоставлять тег тишина с тегом stillness для англоязычного пользователя в планировщике', async () => {
    const englishUserId = 88771202;
    await User.create({ telegramId: englishUserId, language: 'en' });

    await PointerEn.create({
      number: 10,
      text: 'Silence is the language of the heart',
      tags: ['stillness'],
      isActive: true
    });

    const pointerResult = await getNextPointerForUser(englishUserId, 'тишина');

    expect(pointerResult).not.toBeNull();
    expect(pointerResult.tags).toContain('stillness');
    expect(pointerResult.text).toBe('Silence is the language of the heart');
  });

  it('должен безопасно обрабатывать попытку установки неподдерживаемого языка', async () => {
    const testUserId = 88771203;
    await User.create({ telegramId: testUserId, language: 'ru' });

    const unsupportedLanguageContext = createMockContext({
      userId: testUserId,
      callbackData: 'settings:language:set:fr'
    });

    await handleLanguageSet(unsupportedLanguageContext);

    const userInDb = await User.findOne({ telegramId: testUserId });
    expect(userInDb.language).toBe('ru');
  });

  it('должен отправлять испаноязычное приветствие в handleStart для пользователя с испанским языком', async () => {
    const spanishUserId = 88771301;
    await User.create({ telegramId: spanishUserId, language: 'es' });

    const mockContext = createMockContext({ userId: spanishUserId });
    await handleStart(mockContext);

    expect(mockContext.reply).toHaveBeenCalled();
    const [welcomeText, replyOptions] = mockContext.reply.mock.calls[0];
    expect(welcomeText).toBe(TEXTS.es.MENU.START);

    const keyboardButtonsFlattened = replyOptions.reply_markup.keyboard.flat();
    expect(keyboardButtonsFlattened).toContain(BUTTONS.es.REMINDERS);
    expect(keyboardButtonsFlattened).toContain(BUTTONS.es.POINTER);
    expect(keyboardButtonsFlattened).toContain(BUTTONS.es.SETTINGS);
    expect(keyboardButtonsFlattened).toContain(BUTTONS.es.SUPPORT);
  });

  it('должен возвращать испанское главное меню в handleBack для пользователя с испанским языком', async () => {
    const spanishUserId = 88771302;
    await User.create({ telegramId: spanishUserId, language: 'es' });

    const mockContext = createMockContext({
      userId: spanishUserId,
      session: { reminderStep: null }
    });

    await handleBack(mockContext);

    expect(mockContext.reply).toHaveBeenCalled();
    const [mainMenuText] = mockContext.reply.mock.calls[0];
    expect(mainMenuText).toBe(TEXTS.es.MENU.MAIN);
  });

  it('должен проводить весь цикл создания напоминания на испанском языке', async () => {
    const spanishUserId = 88771303;
    await User.create({ telegramId: spanishUserId, language: 'es' });

    const initialCreationContext = createMockContext({ userId: spanishUserId });
    await handleCreateReminder(initialCreationContext);

    expect(initialCreationContext.reply).toHaveBeenCalled();
    const [askTextPrompt, askTextOptions] = initialCreationContext.reply.mock.calls[0];
    expect(askTextPrompt).toContain(TEXTS.es.REMINDERS.ASK_TEXT);
    const textStepButtons = askTextOptions.reply_markup.keyboard.flat();
    expect(textStepButtons).toContain(UI.es.REMINDER_RANDOM);
    expect(textStepButtons).toContain(BUTTONS.es.BACK);

    const textInputContext = createMockContext({
      userId: spanishUserId,
      session: initialCreationContext.session,
      text: 'Permanece presente y respira'
    });
    await handleReminderText(textInputContext);

    expect(textInputContext.reply).toHaveBeenCalled();
    const [askIntervalPrompt, askIntervalOptions] = textInputContext.reply.mock.calls[0];
    expect(askIntervalPrompt).toContain(TEXTS.es.REMINDERS.ASK_INTERVAL);
    const intervalButtons = askIntervalOptions.reply_markup.keyboard.flat();
    expect(intervalButtons).toContain(UI.es.INTERVAL_5);
    expect(intervalButtons).toContain(UI.es.INTERVAL_15);
    expect(intervalButtons).toContain(UI.es.INTERVAL_60);
    expect(intervalButtons).toContain(UI.es.INTERVAL_1440);
    expect(intervalButtons).toContain(BUTTONS.es.BACK);

    const presetIntervalContext = createMockContext({
      userId: spanishUserId,
      session: textInputContext.session
    });
    await handleIntervalPreset(presetIntervalContext, 15);

    expect(presetIntervalContext.reply).toHaveBeenCalled();
    const [askDeleteAfterPrompt, askDeleteAfterOptions] = presetIntervalContext.reply.mock.calls[0];
    expect(askDeleteAfterPrompt).toContain(TEXTS.es.REMINDERS.ASK_DELETE_AFTER);
    const deleteAfterButtons = askDeleteAfterOptions.reply_markup.keyboard.flat();
    expect(deleteAfterButtons).toContain('10 seg');
    expect(deleteAfterButtons).toContain('30 seg');
    expect(deleteAfterButtons).toContain('1 min');
    expect(deleteAfterButtons).toContain('No eliminar');
    expect(deleteAfterButtons).toContain(BUTTONS.es.BACK);

    const finishCreationContext = createMockContext({
      userId: spanishUserId,
      session: presetIntervalContext.session,
      text: '30 seg'
    });
    await handleDeleteAfterPreset(finishCreationContext);

    expect(finishCreationContext.reply).toHaveBeenCalledTimes(2);
    const [previewMessageText] = finishCreationContext.reply.mock.calls[0];
    expect(previewMessageText).toContain('autoeliminación: en 30 seg');
    expect(previewMessageText).toContain('Cada 15 min ⌛');
    expect(previewMessageText).toContain('Permanece presente y respira');

    const [doneMessageText] = finishCreationContext.reply.mock.calls[1];
    expect(doneMessageText).toContain(TEXTS.es.REMINDERS.CREATED);

    const createdReminder = await Reminder.findOne({ userId: String(spanishUserId) });
    expect(createdReminder).not.toBeNull();
    expect(createdReminder.intervalMinutes).toBe(15);
    expect(createdReminder.deleteAfterSeconds).toBe(30);
  });

  it('должен выводить локализованные ошибки валидации при некорректном ручном вводе на испанском', async () => {
    const spanishUserId = 88771304;
    await User.create({ telegramId: spanishUserId, language: 'es' });

    const invalidIntervalContext = createMockContext({
      userId: spanishUserId,
      session: {
        reminderStep: REMINDER_STEP.INTERVAL,
        creatingReminder: { text: 'Atención plena' }
      },
      text: 'no_es_un_numero'
    });
    await handleIntervalInput(invalidIntervalContext);

    expect(invalidIntervalContext.reply).toHaveBeenCalledWith(TEXTS.es.REMINDERS.MIN_INTERVAL);

    const invalidDeleteAfterContext = createMockContext({
      userId: spanishUserId,
      session: {
        reminderStep: REMINDER_STEP.AUTO_DELETE,
        creatingReminder: { text: 'Atención plena', intervalMinutes: 30 }
      },
      text: 'segundos_erroneos'
    });
    await handleDeleteAfterInput(invalidDeleteAfterContext);

    expect(invalidDeleteAfterContext.reply).toHaveBeenCalledWith(TEXTS.es.REMINDERS.INVALID_SECONDS);
  });

  it('должен отображать список напоминаний и кнопки действий на испанском языке', async () => {
    const spanishUserId = 88771305;
    await User.create({ telegramId: spanishUserId, language: 'es' });

    const emptyListContext = createMockContext({ userId: spanishUserId });
    await handleMyReminders(emptyListContext);

    expect(emptyListContext.reply).toHaveBeenCalled();
    const [emptyListPrompt, emptyListOptions] = emptyListContext.reply.mock.calls[0];
    expect(emptyListPrompt).toBe(TEXTS.es.REMINDERS.NONE);
    const emptyListButtons = emptyListOptions.reply_markup.keyboard.flat();
    expect(emptyListButtons).toContain(UI.es.REMINDER_CREATE);
    expect(emptyListButtons).toContain(UI.es.REMINDER_MY);
    expect(emptyListButtons).toContain(BUTTONS.es.BACK);

    const createdReminderRecord = await Reminder.create({
      userId: String(spanishUserId),
      chatId: spanishUserId,
      text: 'Observa los pensamientos sin juzgar',
      intervalMinutes: 60,
      deleteAfterSeconds: null,
      isActive: true
    });

    const populatedListContext = createMockContext({ userId: spanishUserId });
    await handleMyReminders(populatedListContext);

    expect(populatedListContext.reply).toHaveBeenCalled();
    const [singleReminderText, singleReminderOptions] = populatedListContext.reply.mock.calls[0];
    expect(singleReminderText).toContain(TEXTS.es.STATUS.ACTIVE);
    expect(singleReminderText).toContain('Cada hora ⌛');
    expect(singleReminderText).toContain('(autoeliminación: no eliminar)');
    expect(singleReminderText).toContain('Observa los pensamientos sin juzgar');

    const inlineActionButtons = singleReminderOptions.reply_markup.inline_keyboard.flat();
    const actionButtonsTextList = inlineActionButtons.map(buttonItem => buttonItem.text);
    expect(actionButtonsTextList).toContain('⏸️ Pausar');
    expect(actionButtonsTextList).toContain('🗑 Eliminar');

    const pauseActionContext = createMockContext({
      userId: spanishUserId,
      callbackData: `pause:${createdReminderRecord._id}`
    });
    await handleRequestAction(pauseActionContext, 'pause');

    expect(pauseActionContext.answerCbQuery).toHaveBeenCalledWith('Estado actualizado');

    const deleteActionContext = createMockContext({
      userId: spanishUserId,
      callbackData: `delete:${createdReminderRecord._id}`
    });
    await handleRequestAction(deleteActionContext, 'delete');

    expect(deleteActionContext.editMessageReplyMarkup).toHaveBeenCalled();
    const deleteMarkupArgument = deleteActionContext.editMessageReplyMarkup.mock.calls[0][0];
    const deleteConfirmButtons = deleteMarkupArgument.inline_keyboard.flat().map(buttonItem => buttonItem.text);
    expect(deleteConfirmButtons).toContain('🗑 Confirmar');
    expect(deleteConfirmButtons).toContain('❌ Cancelar');
  });

  it('должен отображать меню настроек и выбор часового пояса на испанском языке', async () => {
    const spanishUserId = 88771306;
    await User.create({
      telegramId: spanishUserId,
      language: 'es',
      timezone: 'Europe/Madrid',
      quietHours: { enabled: true, start: 23, end: 8 }
    });

    const settingsContext = createMockContext({ userId: spanishUserId });
    await handleSettings(settingsContext);

    expect(settingsContext.reply).toHaveBeenCalled();
    const [settingsMessageText, settingsMessageOptions] = settingsContext.reply.mock.calls[0];
    expect(settingsMessageText).toContain(TEXTS.es.MENU.SETTINGS);

    const settingsButtons = settingsMessageOptions.reply_markup.inline_keyboard.flat().map(buttonItem => buttonItem.text);
    expect(settingsButtons).toContain(BUTTONS.es.QUIET_OFF);
    expect(settingsButtons.some(buttonText => buttonText.includes(BUTTONS.es.TIMEZONE))).toBe(true);
    expect(settingsButtons.some(buttonText => buttonText.includes(BUTTONS.es.LANGUAGE))).toBe(true);
    expect(settingsButtons).toContain(BUTTONS.es.BACK);

    const timezoneMenuContext = createMockContext({
      userId: spanishUserId,
      callbackData: 'settings:timezone'
    });
    await handleTimezoneMenu(timezoneMenuContext);

    expect(timezoneMenuContext.reply).toHaveBeenCalled();
    const [regionPromptText, regionOptions] = timezoneMenuContext.reply.mock.calls[0];
    expect(regionPromptText).toContain('Selecciona región');
    const regionButtons = regionOptions.reply_markup.inline_keyboard.flat().map(buttonItem => buttonItem.text);
    expect(regionButtons).toContain(BUTTONS.es.BACK);

    const timezoneRegionContext = createMockContext({
      userId: spanishUserId,
      callbackData: 'timezone:region:europe'
    });
    await handleTimezoneRegion(timezoneRegionContext);

    expect(timezoneRegionContext.reply).toHaveBeenCalled();
    const [cityPromptText, cityOptions] = timezoneRegionContext.reply.mock.calls[0];
    expect(cityPromptText).toContain('Selecciona ciudad');
    const cityButtons = cityOptions.reply_markup.inline_keyboard.flat().map(buttonItem => buttonItem.text);
    expect(cityButtons).toContain(BUTTONS.es.BACK);

    const timezoneSetContext = createMockContext({
      userId: spanishUserId,
      callbackData: 'timezone:set:Europe/Madrid'
    });
    await handleTimezoneSet(timezoneSetContext);

    expect(timezoneSetContext.reply).toHaveBeenCalled();
    const [timezoneConfirmationText] = timezoneSetContext.reply.mock.calls[0];
    expect(timezoneConfirmationText).toContain('Zona horaria establecida:');
    expect(timezoneConfirmationText).toContain('Europe/Madrid');
  });

  it('должен переключать язык на испанский и отправлять подтверждение на испанском', async () => {
    const testedUserId = 88771307;
    await User.create({ telegramId: testedUserId, language: 'ru' });

    const languageSetContext = createMockContext({
      userId: testedUserId,
      callbackData: 'settings:language:set:es'
    });

    await handleLanguageSet(languageSetContext);

    expect(languageSetContext.reply).toHaveBeenCalled();
    const [switchedLanguagePrompt, switchedOptions] = languageSetContext.reply.mock.calls[0];
    expect(switchedLanguagePrompt).toBe(TEXTS.es.SETTINGS.LANGUAGE_CHANGED);
    const mainButtons = switchedOptions.reply_markup.keyboard.flat();
    expect(mainButtons).toContain(BUTTONS.es.REMINDERS);
    expect(mainButtons).toContain(BUTTONS.es.POINTER);

    const userInDatabase = await User.findOne({ telegramId: testedUserId });
    expect(userInDatabase.language).toBe('es');
  });

  it('должен выдавать испанские указатели с испанскими кнопками в handlePointer и handleNextPointer', async () => {
    const spanishUserId = 88771308;
    await User.create({ telegramId: spanishUserId, language: 'es' });

    await PointerEs.create({
      number: 1,
      text: 'Tú eres la conciencia detrás de los pensamientos',
      source: 'Eckhart Tolle',
      isActive: true
    });

    const pointerContext = createMockContext({ userId: spanishUserId });
    await handlePointer(pointerContext);

    expect(pointerContext.reply).toHaveBeenCalled();
    const [pointerReplyText, pointerOptions] = pointerContext.reply.mock.calls[0];
    expect(pointerReplyText).toContain('Tú eres la conciencia detrás de los pensamientos');
    expect(pointerReplyText).toContain('Eckhart Tolle');

    const inlineButtons = pointerOptions.reply_markup.inline_keyboard.flat().map(buttonItem => buttonItem.text);
    expect(inlineButtons).toContain(UI.es.POINTER_TO_REMINDER);
    expect(inlineButtons).toContain(UI.es.POINTER_NEXT);

    const nextPointerContext = createMockContext({
      userId: spanishUserId,
      callbackData: 'pointer:next'
    });
    await handleNextPointer(nextPointerContext);

    expect(nextPointerContext.editMessageText).toHaveBeenCalled();
    const [editedPointerText, editedOptions] = nextPointerContext.editMessageText.mock.calls[0];
    expect(editedPointerText).toContain('Tú eres la conciencia detrás de los pensamientos');

    const editedButtons = editedOptions.reply_markup.inline_keyboard.flat().map(buttonItem => buttonItem.text);
    expect(editedButtons).toContain(UI.es.POINTER_TO_REMINDER);
    expect(editedButtons).toContain(UI.es.POINTER_NEXT);
  });

  it('должен переводить указатель в напоминание на испанском языке через handlePointerToReminder', async () => {
    const spanishUserId = 88771309;
    await User.create({ telegramId: spanishUserId, language: 'es' });

    const pointerToReminderContext = createMockContext({
      userId: spanishUserId,
      session: {
        lastPointerText: 'Observa el momento presente'
      }
    });

    await handlePointerToReminder(pointerToReminderContext);

    expect(pointerToReminderContext.reply).toHaveBeenCalled();
    const [askIntervalMessage, intervalOptions] = pointerToReminderContext.reply.mock.calls[0];
    expect(askIntervalMessage).toContain(TEXTS.es.REMINDERS.ASK_INTERVAL);
    expect(askIntervalMessage).toContain(TEXTS.es.REMINDERS.ASK_INTERVAL_HINT);
    expect(askIntervalMessage).toContain('Observa el momento presente');

    const intervalButtons = intervalOptions.reply_markup.keyboard.flat();
    expect(intervalButtons).toContain(UI.es.INTERVAL_5);
    expect(intervalButtons).toContain(UI.es.INTERVAL_60);
    expect(intervalButtons).toContain(BUTTONS.es.BACK);
  });

  it('должен отправлять текст службы заботы на испанском языке', async () => {
    const spanishUserId = 88771310;
    await User.create({ telegramId: spanishUserId, language: 'es' });

    const supportContext = createMockContext({ userId: spanishUserId });
    const userLanguage = await resolveUserLanguage(supportContext);
    const texts = getTexts(userLanguage);

    await supportContext.reply(texts.SUPPORT);

    expect(supportContext.reply).toHaveBeenCalledWith(TEXTS.es.SUPPORT);
  });

  it('должен автоматически сопоставлять тег тишина с тегом silencio для испаноязычного пользователя в планировщике', async () => {
    const spanishUserId = 88771311;
    await User.create({ telegramId: spanishUserId, language: 'es' });

    await PointerEs.create({
      number: 10,
      text: 'El silencio es el lenguaje del corazón',
      tags: ['silencio'],
      isActive: true
    });

    const pointerResult = await getNextPointerForUser(spanishUserId, 'тишина');

    expect(pointerResult).not.toBeNull();
    expect(pointerResult.tags).toContain('silencio');
    expect(pointerResult.text).toBe('El silencio es el lenguaje del corazón');
  });
});
