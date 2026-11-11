import { Markup } from 'telegraf';
import { DateTime } from 'luxon';
import { getTexts } from '../constants/texts.js';
import { getUi } from '../constants/ui.js';
import { previewText } from '../utils/text.js';

const REMINDERS_FORMAT_LOCALIZATIONS = {
  ru: {
    intervalDay: 'Раз в день ⌛',
    intervalHour: 'Каждый час ⌛',
    intervalMinutes: minutes => `Каждые ${minutes} мин ⌛`,
    todayAt: time => `сегодня в ${time}`,
    tomorrowAt: time => `завтра в ${time}`,
    autoDeleteNever: '(автоудаление: не удаляется)',
    autoDeleteSeconds: seconds => `(автоудаление: через ${seconds} сек)`,
    photo: '📷 Фотография',
    photoWithCaption: '📷 Фото',
    video: '🎬 Видео',
    nextRun: '🕒 Следующее',
    pause: '⏸️ Приостановить',
    resume: '▶️ Возобновить',
    delete: '🗑 Удалить',
    backToList: '⬅️ Ко всем напоминаниям',
    headerTitle: '📋 <b>Ваши напоминания:</b>',
    hintFooter: '<i>Нажмите на номер ниже для управления напоминанием 👇</i>'
  },
  en: {
    intervalDay: 'Once a day ⌛',
    intervalHour: 'Every hour ⌛',
    intervalMinutes: minutes => `Every ${minutes} min ⌛`,
    todayAt: time => `today at ${time}`,
    tomorrowAt: time => `tomorrow at ${time}`,
    autoDeleteNever: '(auto-delete: do not delete)',
    autoDeleteSeconds: seconds => `(auto-delete: in ${seconds} sec)`,
    photo: '📷 Photo',
    photoWithCaption: '📷 Photo',
    video: '🎬 Video',
    nextRun: '🕒 Next run',
    pause: '⏸️ Pause',
    resume: '▶️ Resume',
    delete: '🗑 Delete',
    backToList: '⬅️ All reminders',
    headerTitle: '📋 <b>Your reminders:</b>',
    hintFooter: '<i>Tap a number below to manage a reminder 👇</i>'
  },
  uk: {
    intervalDay: 'Раз на день ⌛',
    intervalHour: 'Щогодини ⌛',
    intervalMinutes: minutes => `Кожні ${minutes} хв ⌛`,
    todayAt: time => `сьогодні о ${time}`,
    tomorrowAt: time => `завтра о ${time}`,
    autoDeleteNever: '(автовидалення: не видаляється)',
    autoDeleteSeconds: seconds => `(автовидалення: через ${seconds} сек)`,
    photo: '📷 Фотографія',
    photoWithCaption: '📷 Фото',
    video: '🎬 Відео',
    nextRun: '🕒 Наступне',
    pause: '⏸️ Призупинити',
    resume: '▶️ Відновити',
    delete: '🗑 Видалити',
    backToList: '⬅️ До всіх нагадувань',
    headerTitle: '📋 <b>Ваші нагадування:</b>',
    hintFooter: '<i>Натисніть на номер нижче для керування нагадуванням 👇</i>'
  },
  es: {
    intervalDay: 'Una vez al día ⌛',
    intervalHour: 'Cada hora ⌛',
    intervalMinutes: minutes => `Cada ${minutes} min ⌛`,
    todayAt: time => `hoy a las ${time}`,
    tomorrowAt: time => `mañana a las ${time}`,
    autoDeleteNever: '(autoeliminación: no eliminar)',
    autoDeleteSeconds: seconds => `(autoeliminación: en ${seconds} seg)`,
    photo: '📷 Foto',
    photoWithCaption: '📷 Foto',
    video: '🎬 Video',
    nextRun: '🕒 Siguiente',
    pause: '⏸️ Pausar',
    resume: '▶️ Reanudar',
    delete: '🗑 Eliminar',
    backToList: '⬅️ A todos los recordatorios',
    headerTitle: '📋 <b>Tus recordatorios:</b>',
    hintFooter: '<i>Toca un número abajo para gestionar el recordatorio 👇</i>'
  }
};

const resolveFormatLocalization = language =>
  REMINDERS_FORMAT_LOCALIZATIONS[language] || REMINDERS_FORMAT_LOCALIZATIONS.ru;

export const formatInterval = (minutes, language = 'ru') => {
  const formatLocalization = resolveFormatLocalization(language);
  if (minutes === 1440) return formatLocalization.intervalDay;
  if (minutes === 60) return formatLocalization.intervalHour;
  return formatLocalization.intervalMinutes(minutes);
};

export const formatNextRunTime = (nextRunDate, userTimezone = 'Europe/Minsk', language = 'ru') => {
  if (!nextRunDate) return '';

  const formatLocalization = resolveFormatLocalization(language);
  const targetDate = DateTime.fromJSDate(nextRunDate).setZone(userTimezone);
  const now = DateTime.now().setZone(userTimezone);
  const timeString = targetDate.toFormat('HH:mm');

  if (targetDate.hasSame(now, 'day')) {
    return formatLocalization.todayAt(timeString);
  }

  if (targetDate.hasSame(now.plus({ days: 1 }), 'day')) {
    return formatLocalization.tomorrowAt(timeString);
  }

  return `${targetDate.toFormat('dd.MM')} ${timeString}`;
};

export const formatReminderMessageText = (reminderItem, indexNumberString, language = 'ru', userTimezone = 'Europe/Minsk') => {
  const texts = getTexts(language);
  const ui = getUi(language);
  const formatLocalization = resolveFormatLocalization(language);
  const status = reminderItem.isActive ? texts.STATUS.ACTIVE : texts.STATUS.PAUSED;

  const autoDeleteLabel = reminderItem.deleteAfterSeconds === null
    ? formatLocalization.autoDeleteNever
    : formatLocalization.autoDeleteSeconds(reminderItem.deleteAfterSeconds);

  let displayText = reminderItem.text;
  if (reminderItem.isFavoritePointer) {
    displayText = ui.REMINDER_FAVORITE;
  } else if (reminderItem.isRandomPointer) {
    displayText = ui.REMINDER_RANDOM;
  } else if (reminderItem.photoFileId) {
    displayText = reminderItem.caption
      ? `${formatLocalization.photoWithCaption}: «${reminderItem.caption}»`
      : formatLocalization.photo;
  } else if (reminderItem.videoFileId) {
    displayText = reminderItem.caption
      ? `${formatLocalization.video}: «${reminderItem.caption}»`
      : formatLocalization.video;
  }

  const nextRunString = reminderItem.isActive && reminderItem.nextRunAt
    ? formatNextRunTime(reminderItem.nextRunAt, userTimezone, language)
    : null;

  const nextRunLine = nextRunString ? `\n<i>${formatLocalization.nextRun}: ${nextRunString}</i>` : '';

  return `<b>${indexNumberString}.</b> ${status}

<i>${formatInterval(reminderItem.intervalMinutes, language)}</i>
<i>${autoDeleteLabel}</i>${nextRunLine}

«${displayText}»`;
};

export const getReminderMessageKeyboard = (reminderItem, language = 'ru', showBackToList = true) => {
  const formatLocalization = resolveFormatLocalization(language);

  const actionRow = [
    reminderItem.isActive
      ? Markup.button.callback(formatLocalization.pause, `pause:${reminderItem.id}`)
      : Markup.button.callback(formatLocalization.resume, `resume:${reminderItem.id}`),
    Markup.button.callback(formatLocalization.delete, `delete:${reminderItem.id}`)
  ];

  const rows = [actionRow];
  if (showBackToList) {
    rows.push([Markup.button.callback(formatLocalization.backToList, 'reminder:list')]);
  }

  return Markup.inlineKeyboard(rows);
};

export const buildRemindersListPayload = (reminders, userLanguage = 'ru', userTimezone = 'Europe/Minsk') => {
  const texts = getTexts(userLanguage);
  const ui = getUi(userLanguage);
  const formatLocalization = resolveFormatLocalization(userLanguage);

  if (!reminders || reminders.length === 0) {
    return {
      text: texts.REMINDERS.NONE,
      keyboard: null
    };
  }

  const lines = reminders.map((reminderItem, index) => {
    const indexNumber = index + 1;
    const statusIcon = reminderItem.isActive ? '🟢' : '⏸️';

    let displayText = reminderItem.text;
    if (reminderItem.isFavoritePointer) {
      displayText = ui.REMINDER_FAVORITE;
    } else if (reminderItem.isRandomPointer) {
      displayText = ui.REMINDER_RANDOM;
    } else if (reminderItem.photoFileId) {
      displayText = reminderItem.caption
        ? `${formatLocalization.photoWithCaption}: «${reminderItem.caption}»`
        : formatLocalization.photo;
    } else if (reminderItem.videoFileId) {
      displayText = reminderItem.caption
        ? `${formatLocalization.video}: «${reminderItem.caption}»`
        : formatLocalization.video;
    }

    const shortText = previewText(displayText);
    const intervalLabel = formatInterval(reminderItem.intervalMinutes, userLanguage);

    const nextRunTime = reminderItem.isActive && reminderItem.nextRunAt
      ? formatNextRunTime(reminderItem.nextRunAt, userTimezone, userLanguage)
      : null;

    const nextRunSuffix = nextRunTime ? ` • 🕒 ${nextRunTime}` : '';

    return `<b>${indexNumber}.</b> ${statusIcon} «${shortText}»\n   <i>${intervalLabel}${nextRunSuffix}</i>`;
  });

  const fullText = `${formatLocalization.headerTitle}\n\n${lines.join('\n\n')}\n\n${formatLocalization.hintFooter}`;

  const buttons = reminders.map((reminderItem, index) => {
    const label = String(index + 1);
    return Markup.button.callback(label, `reminder:view:${reminderItem.id}`);
  });

  const keyboardRows = [];
  const chunkSize = 5;
  for (let i = 0; i < buttons.length; i += chunkSize) {
    keyboardRows.push(buttons.slice(i, i + chunkSize));
  }

  return {
    text: fullText,
    keyboard: Markup.inlineKeyboard(keyboardRows)
  };
};
