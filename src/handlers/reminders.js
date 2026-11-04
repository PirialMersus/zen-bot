import { Markup } from 'telegraf';
import Reminder from '../models/Reminder.js';
import User from '../models/User.js';
import { getTexts } from '../constants/texts.js';
import { getUi, UI } from '../constants/ui.js';
import { getRemindersKeyboard } from '../keyboard/reminders.js';
import { reminderTextKeyboard } from '../keyboard/reminderText.js';
import { getIntervalKeyboard } from '../keyboard/intervals.js';
import { getDeleteAfterKeyboard } from '../keyboard/deleteAfter.js';
import { mainKeyboard } from '../keyboard/main.js';
import { resolveUserLanguage } from '../middlewares/activity.js';

export const REMINDER_STEP = {
  TEXT: 'TEXT',
  INTERVAL: 'INTERVAL',
  AUTO_DELETE: 'AUTO_DELETE'
};

const DEFAULT_REMINDER_TEXTS_BY_LANGUAGE = {
  ru: [
    'Не вовлекайся 🧘',
    'В этом теле никого нет 🤯'
  ],
  en: [
    'Do not get involved 🧘',
    'There is no one in this body 🤯'
  ]
};

const normalizeText = text =>
  text.replace(/^«|»$/g, '').trim();

const formatInterval = (minutes, language = 'ru') => {
  if (language === 'en') {
    if (minutes === 1440) return 'Once a day ⌛';
    if (minutes === 60) return 'Every hour ⌛';
    return `Every ${minutes} min ⌛`;
  }
  if (minutes === 1440) return 'Раз в день ⌛';
  if (minutes === 60) return 'Каждый час ⌛';
  return `Каждые ${minutes} мин ⌛`;
};

const formatReminderMessageText = (reminderItem, indexNumberString, language = 'ru') => {
  const texts = getTexts(language);
  const ui = getUi(language);
  const status = reminderItem.isActive ? texts.STATUS.ACTIVE : texts.STATUS.PAUSED;

  const autoDeleteLabel = language === 'en'
    ? (reminderItem.deleteAfterSeconds === null
      ? '(auto-delete: do not delete)'
      : `(auto-delete: in ${reminderItem.deleteAfterSeconds} sec)`)
    : (reminderItem.deleteAfterSeconds === null
      ? '(автоудаление: не удаляется)'
      : `(автоудаление: через ${reminderItem.deleteAfterSeconds} сек)`);

  let displayText = reminderItem.text;
  if (reminderItem.isRandomPointer) {
    displayText = ui.REMINDER_RANDOM;
  } else if (reminderItem.photoFileId) {
    const photoPrefix = language === 'en' ? '📷 Photo' : '📷 Фотография';
    const photoWithCaptionPrefix = language === 'en' ? '📷 Photo' : '📷 Фото';
    displayText = reminderItem.caption ? `${photoWithCaptionPrefix}: «${reminderItem.caption}»` : photoPrefix;
  } else if (reminderItem.videoFileId) {
    const videoPrefix = language === 'en' ? '🎬 Video' : '🎬 Видео';
    displayText = reminderItem.caption ? `${videoPrefix}: «${reminderItem.caption}»` : videoPrefix;
  }

  return `<b>${indexNumberString}.</b> ${status}

<i>${formatInterval(reminderItem.intervalMinutes, language)}</i>
<i>${autoDeleteLabel}</i>

«${displayText}»`;
};

const getReminderMessageKeyboard = (reminderItem, language = 'ru') => {
  const pauseLabel = language === 'en' ? '⏸ Pause' : '⏸ Приостановить';
  const resumeLabel = language === 'en' ? '▶️ Resume' : '▶️ Возобновить';
  const deleteLabel = language === 'en' ? '🗑 Delete' : '🗑 Удалить';

  return Markup.inlineKeyboard([
    [
      reminderItem.isActive
        ? Markup.button.callback(pauseLabel, `pause:${reminderItem.id}`)
        : Markup.button.callback(resumeLabel, `resume:${reminderItem.id}`),
      Markup.button.callback(deleteLabel, `delete:${reminderItem.id}`)
    ]
  ]);
};

export const previewText = text => {
  if (!text) return '';
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
};

export const renderReminderStep = async ctx => {
  const step = ctx.session.reminderStep;
  const data = ctx.session.creatingReminder;
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  const defaultTexts = DEFAULT_REMINDER_TEXTS_BY_LANGUAGE[userLanguage] || DEFAULT_REMINDER_TEXTS_BY_LANGUAGE.ru;

  if (step === REMINDER_STEP.TEXT) {
    const user = await User.findOne({ telegramId: ctx.from.id });

    const storedTexts = user?.lastReminderTexts?.length
      ? user.lastReminderTexts
      : [];

    const suggestedTexts = [
      ...storedTexts.filter(item => !defaultTexts.includes(item)),
      ...defaultTexts
    ].slice(0, 4);

    const subtitle = userLanguage === 'en'
      ? '✍️ Type text, choose from suggestions or send 📷 photo / 🎬 video'
      : '✍️ Введите текст, выберите из предложенных или отправьте 📷 фото / 🎬 видео';

    await ctx.reply(
      `${texts.REMINDERS.ASK_TEXT}\n\n${subtitle}`,
      reminderTextKeyboard(suggestedTexts, userLanguage)
    );
    return;
  }

  if (step === REMINDER_STEP.INTERVAL) {
    await ctx.reply(
      `<i>${texts.REMINDERS.ASK_INTERVAL}</i>

«${previewText(data.text)}»

<i>${texts.REMINDERS.ASK_INTERVAL_HINT}</i>`,
      { parse_mode: 'HTML', ...getIntervalKeyboard(userLanguage) }
    );
    return;
  }

  if (step === REMINDER_STEP.AUTO_DELETE) {
    await ctx.reply(
      `<i>${texts.REMINDERS.ASK_DELETE_AFTER}</i>

«${previewText(data.text)}»

<i>${texts.REMINDERS.ASK_DELETE_AFTER_HINT}</i>`,
      { parse_mode: 'HTML', ...getDeleteAfterKeyboard(userLanguage) }
    );
  }
};

export const handleReminders = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  await ctx.reply(texts.MENU.REMINDERS, getRemindersKeyboard(userLanguage));
};

export const handleCreateReminder = async ctx => {
  ctx.session ??= {};
  ctx.session.creatingReminder = {
    deleteAfterSeconds: 10
  };
  ctx.session.reminderStep = REMINDER_STEP.TEXT;
  await renderReminderStep(ctx);
};

export const handleReminderPhoto = async ctx => {
  if (ctx.session?.reminderStep !== REMINDER_STEP.TEXT) return;

  const photoArray = ctx.message.photo;
  if (!photoArray || !photoArray.length) return;

  const userLanguage = await resolveUserLanguage(ctx);
  const largestPhoto = photoArray[photoArray.length - 1];
  const caption = ctx.message.caption ? ctx.message.caption.trim() : null;

  ctx.session.creatingReminder.photoFileId = largestPhoto.file_id;
  ctx.session.creatingReminder.caption = caption;
  const photoFallbackText = userLanguage === 'en' ? '📷 Photo' : '📷 Фотография';
  const photoPrefix = userLanguage === 'en' ? '📷 Photo' : '📷 Фото';
  ctx.session.creatingReminder.text = caption ? `${photoPrefix}: ${caption}` : photoFallbackText;
  ctx.session.creatingReminder.isRandomPointer = false;

  ctx.session.reminderStep = REMINDER_STEP.INTERVAL;
  await renderReminderStep(ctx);
};

export const handleReminderVideo = async ctx => {
  if (ctx.session?.reminderStep !== REMINDER_STEP.TEXT) return;

  const video = ctx.message.video || ctx.message.video_note;
  if (!video) return;

  const userLanguage = await resolveUserLanguage(ctx);
  const caption = ctx.message.caption ? ctx.message.caption.trim() : null;

  ctx.session.creatingReminder.videoFileId = video.file_id;
  ctx.session.creatingReminder.caption = caption;
  const videoPrefix = userLanguage === 'en' ? '🎬 Video' : '🎬 Видео';
  ctx.session.creatingReminder.text = caption ? `${videoPrefix}: ${caption}` : videoPrefix;
  ctx.session.creatingReminder.isRandomPointer = false;

  ctx.session.reminderStep = REMINDER_STEP.INTERVAL;
  await renderReminderStep(ctx);
};

export const handleReminderText = async ctx => {
  if (ctx.session?.reminderStep !== REMINDER_STEP.TEXT) return;

  let incomingText = ctx.message.text;

  if (incomingText.endsWith('…')) {
    const user = await User.findOne({ telegramId: ctx.from.id });
    const fullMatch = user?.lastReminderTexts?.find(item =>
      item.startsWith(incomingText.slice(0, -1))
    );
    if (fullMatch) incomingText = fullMatch;
  }

  const isRandomPointerCommand =
    incomingText === UI.ru.REMINDER_RANDOM ||
    incomingText === UI.en.REMINDER_RANDOM ||
    incomingText === UI.REMINDER_RANDOM;

  if (isRandomPointerCommand) {
    ctx.session.creatingReminder.isRandomPointer = true;
    ctx.session.creatingReminder.text = incomingText;
  } else {
    ctx.session.creatingReminder.text = incomingText;
    ctx.session.creatingReminder.isRandomPointer = false;
  }

  ctx.session.reminderStep = REMINDER_STEP.INTERVAL;
  await renderReminderStep(ctx);
};

export const handleIntervalPreset = async (ctx, minutes) => {
  if (ctx.session?.reminderStep !== REMINDER_STEP.INTERVAL) return;

  ctx.session.creatingReminder.intervalMinutes = minutes;
  ctx.session.reminderStep = REMINDER_STEP.AUTO_DELETE;
  await renderReminderStep(ctx);
};

export const handleIntervalInput = async ctx => {
  if (ctx.session?.reminderStep !== REMINDER_STEP.INTERVAL) return false;

  const minutes = Number(ctx.message.text);
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);

  if (!Number.isInteger(minutes) || minutes < 1) {
    await ctx.reply(texts.REMINDERS.MIN_INTERVAL);
    return true;
  }

  ctx.session.creatingReminder.intervalMinutes = minutes;
  ctx.session.reminderStep = REMINDER_STEP.AUTO_DELETE;
  await renderReminderStep(ctx);
  return true;
};

export const handleDeleteAfterPreset = async ctx => {
  if (ctx.session?.reminderStep !== REMINDER_STEP.AUTO_DELETE) return;

  const incomingText = ctx.message.text;

  let secondsValue;

  if (incomingText === '10 сек' || incomingText === '10 sec') secondsValue = 10;
  if (incomingText === '30 сек' || incomingText === '30 sec') secondsValue = 30;
  if (incomingText === '1 мин' || incomingText === '1 min') secondsValue = 60;
  if (incomingText === 'Не удалять' || incomingText === 'Do not delete') secondsValue = null;

  if (secondsValue === undefined) return;

  ctx.session.creatingReminder.deleteAfterSeconds = secondsValue;
  ctx.session.reminderStep = null;

  await finalizeReminder(ctx);
};

export const handleDeleteAfterInput = async ctx => {
  if (ctx.session?.reminderStep !== REMINDER_STEP.AUTO_DELETE) return false;

  const seconds = Number(ctx.message.text);
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);

  if (!Number.isInteger(seconds) || seconds < 1) {
    await ctx.reply(texts.REMINDERS.INVALID_SECONDS);
    return true;
  }

  ctx.session.creatingReminder.deleteAfterSeconds = seconds;
  ctx.session.reminderStep = null;

  await finalizeReminder(ctx);
  return true;
};

const saveLastReminderText = async (ctx, text) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return;

  const isRandomPointerCommand =
    text === UI.ru.REMINDER_RANDOM ||
    text === UI.en.REMINDER_RANDOM ||
    text === UI.REMINDER_RANDOM;

  if (isRandomPointerCommand) return;

  const clean = normalizeText(text);
  const userLanguage = user.language || 'ru';
  const defaultTexts = DEFAULT_REMINDER_TEXTS_BY_LANGUAGE[userLanguage] || DEFAULT_REMINDER_TEXTS_BY_LANGUAGE.ru;

  const stored = user.lastReminderTexts?.length
    ? user.lastReminderTexts
    : defaultTexts;

  const userTexts = stored
    .filter(item => !defaultTexts.includes(item))
    .filter(item => item !== clean);

  const nextUserTexts = [clean, ...userTexts].slice(
    0,
    4 - defaultTexts.length
  );

  user.lastReminderTexts = [
    ...nextUserTexts,
    ...defaultTexts
  ];

  await user.save();
};

const finalizeReminder = async ctx => {
  const data = ctx.session.creatingReminder;
  const now = new Date();
  const cleanText = normalizeText(data.text);
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);

  await Reminder.create({
    userId: String(ctx.from.id),
    chatId: ctx.chat.id,
    text: cleanText,
    photoFileId: data.photoFileId || null,
    videoFileId: data.videoFileId || null,
    caption: data.caption || null,
    intervalMinutes: data.intervalMinutes,
    deleteAfterSeconds: data.deleteAfterSeconds,
    isActive: true,
    isRandomPointer: Boolean(data.isRandomPointer),
    nextRunAt: new Date(
      now.getTime() + data.intervalMinutes * 60 * 1000
    )
  });

  const intervalLabel = formatInterval(data.intervalMinutes, userLanguage);

  const deleteAfterLabel = userLanguage === 'en'
    ? (data.deleteAfterSeconds === null
      ? 'do not delete'
      : `in ${data.deleteAfterSeconds} sec`)
    : (data.deleteAfterSeconds === null
      ? 'не удаляется'
      : `через ${data.deleteAfterSeconds} сек`);

  const autoDeletePrefix = userLanguage === 'en' ? 'auto-delete' : 'автоудаление';

  await ctx.reply(
    `<i>${intervalLabel}</i>
<i>(${autoDeletePrefix}: ${deleteAfterLabel})</i>

«${cleanText}»`,
    { parse_mode: 'HTML' }
  );

  if (!data.photoFileId && !data.videoFileId) {
    await saveLastReminderText(ctx, cleanText);
  }

  ctx.session.creatingReminder = null;
  ctx.session.reminderStep = null;

  await ctx.reply(
    `<i>${texts.REMINDERS.CREATED}</i>`,
    { parse_mode: 'HTML', ...mainKeyboard(ctx, userLanguage) }
  );
};

export const handleMyReminders = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);

  const reminders = await Reminder.find({
    userId: String(ctx.from.id)
  }).sort({ createdAt: 1 });

  if (!reminders.length) {
    await ctx.reply(texts.REMINDERS.NONE, getRemindersKeyboard(userLanguage));
    return;
  }

  for (let index = 0; index < reminders.length; index++) {
    const reminderItem = reminders[index];
    await ctx.reply(
      formatReminderMessageText(reminderItem, index + 1, userLanguage),
      {
        parse_mode: 'HTML',
        ...getReminderMessageKeyboard(reminderItem, userLanguage)
      }
    );
  }
};

export const handleRequestAction = async (ctx, type) => {
  const userLanguage = await resolveUserLanguage(ctx);
  const reminderIdentifier = ctx.callbackQuery.data.split(':')[1];
  const reminderItem = await Reminder.findById(reminderIdentifier);

  const notFoundMessage = userLanguage === 'en' ? 'Reminder not found' : 'Напоминание не найдено';
  if (!reminderItem) return ctx.answerCbQuery(notFoundMessage).catch(() => {});

  if (type === 'pause' || type === 'resume') {
    reminderItem.isActive = !reminderItem.isActive;
    await reminderItem.save();

    const originalText = ctx.callbackQuery.message?.text || '';
    const matchIndex = originalText.match(/^(\d+)\./);
    const indexStr = matchIndex ? matchIndex[1] : '?';

    await ctx.editMessageText(
      formatReminderMessageText(reminderItem, indexStr, userLanguage),
      {
        parse_mode: 'HTML',
        ...getReminderMessageKeyboard(reminderItem, userLanguage)
      }
    ).catch(() => {});

    const statusChangedAlert = userLanguage === 'en' ? 'Status updated' : 'Статус изменен';
    return ctx.answerCbQuery(statusChangedAlert).catch(() => {});
  }

  if (type === 'delete') {
    const confirmDeleteButtonLabel = userLanguage === 'en' ? '🗑 Confirm delete' : '🗑 Подтвердить удаление';
    const cancelDeleteButtonLabel = userLanguage === 'en' ? '❌ Cancel' : '❌ Отмена';

    await ctx.editMessageReplyMarkup(
      Markup.inlineKeyboard([
        [
          Markup.button.callback(confirmDeleteButtonLabel, `confirm:delete:${reminderIdentifier}`),
          Markup.button.callback(cancelDeleteButtonLabel, `confirm:cancel:${reminderIdentifier}`)
        ]
      ]).reply_markup
    ).catch(() => {});

    return ctx.answerCbQuery().catch(() => {});
  }
};

export const handleConfirmAction = async ctx => {
  const callbackDataString = ctx.callbackQuery.data;
  await ctx.answerCbQuery().catch(() => {});

  if (callbackDataString === 'confirm:no') {
    await ctx.deleteMessage().catch(() => {});
    return;
  }

  const [, actionType, reminderIdentifier] = callbackDataString.split(':');
  const userLanguage = await resolveUserLanguage(ctx);

  if (actionType === 'cancel') {
    const reminderItem = await Reminder.findById(reminderIdentifier);
    if (reminderItem) {
      await ctx.editMessageReplyMarkup(getReminderMessageKeyboard(reminderItem, userLanguage).reply_markup).catch(() => {});
    }
    return;
  }

  if (actionType === 'delete') {
    await Reminder.findByIdAndDelete(reminderIdentifier);
    await ctx.deleteMessage().catch(() => {});
    return;
  }
};
