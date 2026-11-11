import { Markup } from 'telegraf';
import { DateTime } from 'luxon';
import Reminder from '../models/Reminder.js';
import User from '../models/User.js';
import { getTexts, isDoNotDeleteText, COMBINED_AUTO_DELETE_MAP } from '../constants/texts.js';
import { getUi, UI } from '../constants/ui.js';
import { DEFAULT_TIMEZONE } from '../constants/timezones.js';
import { getRemindersKeyboard } from '../keyboard/reminders.js';
import { reminderTextKeyboard } from '../keyboard/reminderText.js';
import { getIntervalKeyboard } from '../keyboard/intervals.js';
import { getDeleteAfterKeyboard } from '../keyboard/deleteAfter.js';
import { mainKeyboard } from '../keyboard/main.js';
import { resolveUserLanguage } from '../middlewares/activity.js';
import { countUserFavoritePointers } from '../services/pointers.js';
import { previewText } from '../utils/text.js';
import {
  formatInterval,
  formatNextRunTime,
  formatReminderMessageText,
  getReminderMessageKeyboard,
  buildRemindersListPayload
} from '../services/remindersFormat.js';

export {
  previewText,
  formatInterval,
  formatNextRunTime,
  formatReminderMessageText,
  getReminderMessageKeyboard,
  buildRemindersListPayload
};

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

    const subtitle = userLanguage === 'en'
      ? '✍️ Type text, choose from suggestions or send 📷 photo / 🎬 video'
      : userLanguage === 'uk'
        ? '✍️ Введіть текст, виберіть із запропонованих або надішліть 📷 фото / 🎬 відео'
        : userLanguage === 'es'
          ? '✍️ Escribe el texto, elige una sugerencia o envía 📷 foto / 🎬 video'
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
  ctx.session ??= {};
  ctx.session.reminderStep = null;
  ctx.session.creatingReminder = null;
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
  const photoFallbackText = userLanguage === 'en' ? '📷 Photo' : (userLanguage === 'es' ? '📷 Foto' : (userLanguage === 'uk' ? '📷 Фотографія' : '📷 Фотография'));
  const photoPrefix = userLanguage === 'en' ? '📷 Photo' : (userLanguage === 'es' ? '📷 Foto' : '📷 Фото');
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
  const videoPrefix = userLanguage === 'en' ? '🎬 Video' : (userLanguage === 'es' ? '🎬 Video' : (userLanguage === 'uk' ? '🎬 Відео' : '🎬 Видео'));
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

  if (isDoNotDeleteText(incomingText)) {
    secondsValue = null;
  } else if (COMBINED_AUTO_DELETE_MAP[incomingText] !== undefined) {
    secondsValue = COMBINED_AUTO_DELETE_MAP[incomingText];
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
    isFavoritePointer: Boolean(data.isFavoritePointer),
    nextRunAt: new Date(
      now.getTime() + data.intervalMinutes * 60 * 1000
    )
  });

  const intervalLabel = formatInterval(data.intervalMinutes, userLanguage);

  const deleteAfterLabel = userLanguage === 'en'
    ? (data.deleteAfterSeconds === null
      ? 'do not delete'
      : `in ${data.deleteAfterSeconds} sec`)
    : userLanguage === 'uk'
      ? (data.deleteAfterSeconds === null
        ? 'не видаляється'
        : `через ${data.deleteAfterSeconds} сек`)
      : userLanguage === 'es'
        ? (data.deleteAfterSeconds === null
          ? 'no eliminar'
          : `en ${data.deleteAfterSeconds} seg`)
        : (data.deleteAfterSeconds === null
          ? 'не удаляется'
          : `через ${data.deleteAfterSeconds} сек`);

  const autoDeletePrefix = userLanguage === 'en'
    ? 'auto-delete'
    : (userLanguage === 'uk' ? 'автовидалення' : (userLanguage === 'es' ? 'autoeliminación' : 'автоудаление'));

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

  const [reminders, user] = await Promise.all([
    Reminder.find({ userId: String(ctx.from.id) }).sort({ createdAt: 1 }),
    User.findOne({ telegramId: ctx.from.id })
  ]);

  if (!reminders.length) {
    await ctx.reply(texts.REMINDERS.NONE, getRemindersKeyboard(userLanguage));
    return;
  }

  const userTimezone = user?.timezone || DEFAULT_TIMEZONE;

  if (reminders.length === 1) {
    const singleReminder = reminders[0];
    await ctx.reply(
      formatReminderMessageText(singleReminder, '1', userLanguage, userTimezone),
      {
        parse_mode: 'HTML',
        ...getReminderMessageKeyboard(singleReminder, userLanguage, false)
      }
    );
    return;
  }

  const { text, keyboard } = buildRemindersListPayload(reminders, userLanguage, userTimezone);

  await ctx.reply(text, {
    parse_mode: 'HTML',
    ...keyboard
  });
};

export const handleReminderListCallback = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);

  await ctx.answerCbQuery().catch(() => {});

  const [reminders, user] = await Promise.all([
    Reminder.find({ userId: String(ctx.from.id) }).sort({ createdAt: 1 }),
    User.findOne({ telegramId: ctx.from.id })
  ]);

  if (!reminders.length) {
    await ctx.editMessageText(texts.REMINDERS.NONE).catch(async () => {
      await ctx.reply(texts.REMINDERS.NONE).catch(() => {});
    });
    return;
  }

  const userTimezone = user?.timezone || DEFAULT_TIMEZONE;
  const { text, keyboard } = buildRemindersListPayload(reminders, userLanguage, userTimezone);

  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    ...keyboard
  }).catch(async () => {
    await ctx.reply(text, {
      parse_mode: 'HTML',
      ...keyboard
    }).catch(() => {});
  });
};

export const handleViewReminder = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const reminderId = ctx.callbackQuery.data.replace('reminder:view:', '');

  await ctx.answerCbQuery().catch(() => {});

  const [reminderItem, allUserReminders, user] = await Promise.all([
    Reminder.findById(reminderId),
    Reminder.find({ userId: String(ctx.from.id) }).sort({ createdAt: 1 }),
    User.findOne({ telegramId: ctx.from.id })
  ]);

  if (!reminderItem) {
    const notFoundMessage = userLanguage === 'en'
      ? 'Reminder not found'
      : (userLanguage === 'uk' ? 'Нагадування не знайдено' : (userLanguage === 'es' ? 'Recordatorio no encontrado' : 'Напоминание не найдено'));
    await ctx.answerCbQuery(notFoundMessage).catch(() => {});
    return handleReminderListCallback(ctx);
  }

  const indexNumber = allUserReminders.findIndex(item => String(item._id) === String(reminderItem._id)) + 1;
  const userTimezone = user?.timezone || DEFAULT_TIMEZONE;

  await ctx.editMessageText(
    formatReminderMessageText(reminderItem, indexNumber > 0 ? String(indexNumber) : '1', userLanguage, userTimezone),
    {
      parse_mode: 'HTML',
      ...getReminderMessageKeyboard(reminderItem, userLanguage, true)
    }
  ).catch(() => {});
};

export const handleRequestAction = async (ctx, type) => {
  const userLanguage = await resolveUserLanguage(ctx);
  const reminderIdentifier = ctx.callbackQuery.data.split(':')[1];
  const reminderItem = await Reminder.findById(reminderIdentifier);

  const notFoundMessage = userLanguage === 'en'
    ? 'Reminder not found'
    : (userLanguage === 'uk' ? 'Нагадування не знайдено' : (userLanguage === 'es' ? 'Recordatorio no encontrado' : 'Напоминание не найдено'));
  if (!reminderItem) return ctx.answerCbQuery(notFoundMessage).catch(() => {});

  if (type === 'pause' || type === 'resume') {
    reminderItem.isActive = !reminderItem.isActive;
    await reminderItem.save();

    const [allUserReminders, user] = await Promise.all([
      Reminder.find({ userId: String(ctx.from.id) }).sort({ createdAt: 1 }),
      User.findOne({ telegramId: ctx.from.id })
    ]);

    const indexNumber = allUserReminders.findIndex(item => String(item._id) === String(reminderItem._id)) + 1;
    const userTimezone = user?.timezone || DEFAULT_TIMEZONE;

    await ctx.editMessageText(
      formatReminderMessageText(reminderItem, indexNumber > 0 ? String(indexNumber) : '1', userLanguage, userTimezone),
      {
        parse_mode: 'HTML',
        ...getReminderMessageKeyboard(reminderItem, userLanguage, true)
      }
    ).catch(() => {});

    const statusChangedAlert = userLanguage === 'en'
      ? 'Status updated'
      : (userLanguage === 'uk' ? 'Статус змінено' : (userLanguage === 'es' ? 'Estado actualizado' : 'Статус изменен'));
    return ctx.answerCbQuery(statusChangedAlert).catch(() => {});
  }

  if (type === 'delete') {
    const confirmDeleteButtonLabel = userLanguage === 'en'
      ? '🗑 Confirm'
      : (userLanguage === 'uk' ? '🗑 Підтвердити' : (userLanguage === 'es' ? '🗑 Confirmar' : '🗑 Подтвердить'));
    const cancelDeleteButtonLabel = userLanguage === 'en'
      ? '❌ Cancel'
      : (userLanguage === 'uk' ? '❌ Скасувати' : (userLanguage === 'es' ? '❌ Cancelar' : '❌ Отмена'));

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

  if (callbackDataString === 'confirm:no') {
    await ctx.answerCbQuery().catch(() => {});
    await ctx.deleteMessage().catch(() => {});
    return;
  }

  const [, actionType, reminderIdentifier] = callbackDataString.split(':');
  const userLanguage = await resolveUserLanguage(ctx);

  if (actionType === 'cancel') {
    await ctx.answerCbQuery().catch(() => {});
    const [reminderItem, allUserReminders, user] = await Promise.all([
      Reminder.findById(reminderIdentifier),
      Reminder.find({ userId: String(ctx.from.id) }).sort({ createdAt: 1 }),
      User.findOne({ telegramId: ctx.from.id })
    ]);

    if (reminderItem) {
      const indexNumber = allUserReminders.findIndex(item => String(item._id) === String(reminderItem._id)) + 1;
      const userTimezone = user?.timezone || DEFAULT_TIMEZONE;

      await ctx.editMessageReplyMarkup(
        getReminderMessageKeyboard(reminderItem, userLanguage, true).reply_markup
      ).catch(() => {});
    }
    return;
  }

  if (actionType === 'delete') {
    await Reminder.findByIdAndDelete(reminderIdentifier);
    const deleteAlertText = userLanguage === 'en'
      ? 'Reminder deleted'
      : (userLanguage === 'uk' ? 'Нагадування видалено' : (userLanguage === 'es' ? 'Recordatorio eliminado' : 'Напоминание удалено'));
    await ctx.answerCbQuery(deleteAlertText).catch(() => {});
    return handleReminderListCallback(ctx);
  }
};
