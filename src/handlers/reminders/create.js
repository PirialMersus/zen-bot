import { calculateDailyNextRun } from '../../services/scheduler.js';
import Reminder from '../../models/Reminder.js';
import User from '../../models/User.js';
import { getTexts, isDoNotDeleteText, COMBINED_AUTO_DELETE_MAP } from '../../constants/texts.js';
import { UI } from '../../constants/ui.js';
import { DEFAULT_TIMEZONE } from '../../constants/timezones.js';
import { reminderTextKeyboard } from '../../keyboard/reminderText.js';
import { getIntervalKeyboard } from '../../keyboard/intervals.js';
import { getDeleteAfterKeyboard } from '../../keyboard/deleteAfter.js';
import { mainKeyboard } from '../../keyboard/main.js';
import { resolveUserLanguage } from '../../middlewares/activity.js';
import { countUserFavoritePointers } from '../../services/pointers.js';
import { previewText } from '../../utils/text.js';
import { formatInterval, formatAutoDelete } from '../../services/remindersFormat.js';

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
  ],
  uk: [
    'Не втягуйся 🧘',
    'У цьому тілі нікого немає 🤯'
  ],
  es: [
    'No te involucres 🧘',
    'No hay nadie en este cuerpo 🤯'
  ]
};

const normalizeText = text =>
  text.replace(/^«|»$/g, '').trim();

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
    ].slice(0, 2);

    await ctx.reply(
      `${texts.REMINDERS.ASK_TEXT}\n\n${texts.REMINDERS.ASK_TEXT_SUBTITLE}`,
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

export const handleCreateReminder = async ctx => {
  ctx.session ??= {};
  ctx.session.isSettingCustomQuietHours = null;
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
  const texts = getTexts(userLanguage);
  const largestPhoto = photoArray[photoArray.length - 1];
  const caption = ctx.message.caption ? ctx.message.caption.trim() : null;

  ctx.session.creatingReminder.photoFileId = largestPhoto.file_id;
  ctx.session.creatingReminder.caption = caption;

  const photoFallbackText = texts.REMINDERS.PHOTO_FALLBACK;
  const photoPrefix = texts.REMINDERS.PHOTO_PREFIX;
  ctx.session.creatingReminder.text = caption ? `${photoPrefix}: ${caption}` : photoFallbackText;
  ctx.session.creatingReminder.isRandomPointer = false;

  ctx.session.reminderStep = REMINDER_STEP.INTERVAL;
  await renderReminderStep(ctx);
  return true;
};

export const handleReminderVideo = async ctx => {
  if (ctx.session?.reminderStep !== REMINDER_STEP.TEXT) return;

  const video = ctx.message.video || ctx.message.video_note;
  if (!video) return;

  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  const caption = ctx.message.caption ? ctx.message.caption.trim() : null;

  ctx.session.creatingReminder.videoFileId = video.file_id;
  ctx.session.creatingReminder.caption = caption;
  const videoPrefix = texts.REMINDERS.VIDEO_PREFIX;
  ctx.session.creatingReminder.text = caption ? `${videoPrefix}: ${caption}` : videoPrefix;
  ctx.session.creatingReminder.isRandomPointer = false;

  ctx.session.reminderStep = REMINDER_STEP.INTERVAL;
  await renderReminderStep(ctx);
  return true;
};

export const handleReminderText = async ctx => {
  if (ctx.session?.reminderStep !== REMINDER_STEP.TEXT) return false;

  let incomingText = ctx.message.text;

  if (incomingText && incomingText.length > 4000) {
    const userLanguage = await resolveUserLanguage(ctx);
    const texts = getTexts(userLanguage);
    await ctx.reply(texts.REMINDERS.TEXT_TOO_LONG);
    return true;
  }

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
    incomingText === UI.uk.REMINDER_RANDOM ||
    incomingText === UI.es.REMINDER_RANDOM ||
    incomingText === UI.REMINDER_RANDOM ||
    incomingText === '🎲 Случайный указатель' ||
    incomingText === '🎲 Random pointer' ||
    incomingText === '🎲 Випадковий вказівник' ||
    incomingText === '🎲 Puntero aleatorio';

  const isFavoritePointerCommand =
    incomingText === UI.ru.REMINDER_FAVORITE ||
    incomingText === UI.en.REMINDER_FAVORITE ||
    incomingText === UI.uk.REMINDER_FAVORITE ||
    incomingText === UI.es.REMINDER_FAVORITE ||
    incomingText === UI.REMINDER_FAVORITE;

  if (isFavoritePointerCommand) {
    const favoriteCount = await countUserFavoritePointers(ctx.from.id);
    if (!favoriteCount) {
      const userLanguage = await resolveUserLanguage(ctx);
      const texts = getTexts(userLanguage);
      await ctx.reply(texts.POINTERS.FAVORITE_REMINDER_EMPTY);
      return;
    }
    ctx.session.creatingReminder.isFavoritePointer = true;
    ctx.session.creatingReminder.isRandomPointer = false;
    ctx.session.creatingReminder.text = incomingText;
  } else if (isRandomPointerCommand) {
    ctx.session.creatingReminder.isRandomPointer = true;
    ctx.session.creatingReminder.isFavoritePointer = false;
    ctx.session.creatingReminder.text = incomingText;
  } else {
    ctx.session.creatingReminder.text = incomingText;
    ctx.session.creatingReminder.isRandomPointer = false;
    ctx.session.creatingReminder.isFavoritePointer = false;
  }

  ctx.session.reminderStep = REMINDER_STEP.INTERVAL;
  await renderReminderStep(ctx);
  return true;
};

export const handleIntervalPreset = async (ctx, minutes) => {
  if (ctx.session?.reminderStep !== REMINDER_STEP.INTERVAL) return;

  ctx.session.creatingReminder.intervalMinutes = minutes;
  ctx.session.reminderStep = REMINDER_STEP.AUTO_DELETE;
  await renderReminderStep(ctx);
};

export const handleIntervalInput = async ctx => {
  if (ctx.session?.reminderStep !== REMINDER_STEP.INTERVAL) return false;

  const rawText = ctx.message.text ? ctx.message.text.trim() : '';
  const timeFormatMatch = rawText.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);

  if (timeFormatMatch) {
    const hours = timeFormatMatch[1].padStart(2, '0');
    const minutes = timeFormatMatch[2].padStart(2, '0');
    const targetTime = `${hours}:${minutes}`;

    ctx.session.creatingReminder.type = 'daily';
    ctx.session.creatingReminder.targetTime = targetTime;
    ctx.session.creatingReminder.intervalMinutes = 1440;
    ctx.session.reminderStep = REMINDER_STEP.AUTO_DELETE;
    await renderReminderStep(ctx);
    return true;
  }

  const minutes = Number(rawText);
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);

  if (!Number.isInteger(minutes) || minutes < 1) {
    await ctx.reply(texts.REMINDERS.MIN_INTERVAL);
    return true;
  }

  ctx.session.creatingReminder.type = 'interval';
  ctx.session.creatingReminder.targetTime = null;
  ctx.session.creatingReminder.intervalMinutes = minutes;
  ctx.session.reminderStep = REMINDER_STEP.AUTO_DELETE;
  await renderReminderStep(ctx);
  return true;
};

export const handleDeleteAfterPreset = async (ctx, presetSeconds = undefined) => {
  if (ctx.session?.reminderStep !== REMINDER_STEP.AUTO_DELETE) return;

  let secondsValue = presetSeconds;

  if (secondsValue === undefined && ctx.message?.text) {
    const incomingText = ctx.message.text;
    if (isDoNotDeleteText(incomingText)) {
      secondsValue = null;
    } else if (COMBINED_AUTO_DELETE_MAP[incomingText] !== undefined) {
      secondsValue = COMBINED_AUTO_DELETE_MAP[incomingText];
    }
  }

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

  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 86400) {
    await ctx.reply(texts.REMINDERS.INVALID_SECONDS);
    return true;
  }

  ctx.session.creatingReminder.deleteAfterSeconds = seconds;
  ctx.session.reminderStep = null;

  await finalizeReminder(ctx);
  return true;
};

export const saveLastReminderText = async (ctx, text) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return;

  const isSpecialPointerCommand =
    text === UI.ru.REMINDER_RANDOM ||
    text === UI.en.REMINDER_RANDOM ||
    text === UI.uk.REMINDER_RANDOM ||
    text === UI.es.REMINDER_RANDOM ||
    text === UI.REMINDER_RANDOM ||
    text === '🎲 Случайный указатель' ||
    text === '🎲 Random pointer' ||
    text === '🎲 Випадковий вказівник' ||
    text === '🎲 Puntero aleatorio' ||
    text === UI.ru.REMINDER_FAVORITE ||
    text === UI.en.REMINDER_FAVORITE ||
    text === UI.uk.REMINDER_FAVORITE ||
    text === UI.es.REMINDER_FAVORITE ||
    text === UI.REMINDER_FAVORITE;

  if (isSpecialPointerCommand) return;

  const clean = normalizeText(text);
  const userLanguage = user.language || 'ru';
  const defaultTexts = DEFAULT_REMINDER_TEXTS_BY_LANGUAGE[userLanguage] || DEFAULT_REMINDER_TEXTS_BY_LANGUAGE.ru;

  const stored = user.lastReminderTexts?.length
    ? user.lastReminderTexts
    : defaultTexts;

  const userTexts = stored
    .filter(item => !defaultTexts.includes(item))
    .filter(item => item !== clean);

  const nextUserTexts = [clean, ...userTexts].slice(0, 2);

  user.lastReminderTexts = [
    ...nextUserTexts,
    ...defaultTexts
  ];

  await user.save();
};

export const finalizeReminder = async ctx => {
  const data = ctx.session.creatingReminder;
  const now = new Date();
  const cleanText = normalizeText(data.text);
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);

  let nextRunDate;
  if (data.type === 'daily' && data.targetTime) {
    const user = await User.findOne({ telegramId: ctx.from.id });
    const userTimezone = user?.timezone || DEFAULT_TIMEZONE;
    nextRunDate = calculateDailyNextRun(data.targetTime, userTimezone, now);
  } else {
    nextRunDate = new Date(now.getTime() + data.intervalMinutes * 60 * 1000);
  }

  await Reminder.create({
    userId: ctx.from.id,
    chatId: ctx.chat.id,
    text: cleanText,
    type: data.type || 'interval',
    targetTime: data.targetTime || null,
    photoFileId: data.photoFileId || null,
    videoFileId: data.videoFileId || null,
    caption: data.caption || null,
    intervalMinutes: data.intervalMinutes,
    deleteAfterSeconds: data.deleteAfterSeconds,
    isActive: true,
    isRandomPointer: Boolean(data.isRandomPointer),
    isFavoritePointer: Boolean(data.isFavoritePointer),
    nextRunAt: nextRunDate
  });

  const intervalLabel = formatInterval(data, userLanguage);
  const autoDeleteLabel = formatAutoDelete(data.deleteAfterSeconds, userLanguage);

  await ctx.reply(
    `<i>${intervalLabel}</i>
<i>${autoDeleteLabel}</i>

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
