import { cleanupUser } from './cleanupUser.js';
import { logError } from '../utils/logger.js';
import { isPointerInFavorites } from './pointers.js';
import { buildReminderPointerInlineKeyboard } from '../keyboard/pointers.js';
import { registerDeletionTimer } from './deletionTimers.js';

const IS_DEV = process.env.NODE_ENV === 'development';
const CREATOR_ID = Number(process.env.CREATOR_ID);

export const getDeleteAfterSeconds = reminder => {
  if (IS_DEV && Number(reminder.userId) === CREATOR_ID) return 60;
  return reminder.deleteAfterSeconds ?? null;
};

export const getPointerTagForLanguage = language => {
  const languageTags = {
    en: 'stillness',
    uk: 'тиша',
    es: 'silencio',
    ru: 'тишина'
  };
  return languageTags[language] || 'тишина';
};

const getPushTitle = language => {
  const pushTitles = {
    en: 'Reminder',
    uk: 'Нагадування',
    es: 'Recordatorio',
    ru: 'Напоминание'
  };
  return pushTitles[language] || pushTitles.ru;
};

const getAutoDeleteFooter = (deleteAfterSeconds, language) => {
  if (!deleteAfterSeconds) return '';
  const footers = {
    en: `\n\n<i>(auto-delete in ${deleteAfterSeconds} sec)</i>`,
    uk: `\n\n<i>(автовидалення через ${deleteAfterSeconds} сек)</i>`,
    es: `\n\n<i>(autoeliminación en ${deleteAfterSeconds} seg)</i>`,
    ru: `\n\n<i>(автоудаление через ${deleteAfterSeconds} сек)</i>`
  };
  return footers[language] || footers.ru;
};

const getMediaFallbackCaption = (mediaType, language) => {
  const fallbackCaptions = {
    photo: {
      en: '📷 Photo',
      es: '📷 Foto',
      uk: '📷 Фотографія',
      ru: '📷 Фотография'
    },
    video: {
      en: '🎬 Video',
      es: '🎬 Video',
      uk: '🎬 Відео',
      ru: '🎬 Видео'
    }
  };
  return fallbackCaptions[mediaType]?.[language] || fallbackCaptions[mediaType]?.ru || '';
};

export const sendPushNotification = async (pushTokens, text, soundId, title = 'Напоминание') => {
  const messages = pushTokens
    .filter(token => token && token.startsWith('ExponentPushToken'))
    .map(token => ({
      to: token,
      sound: 'default',
      title,
      body: text,
      data: { soundId: soundId || 'default' }
    }));

  if (!messages.length) return false;

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(messages)
  });

  if (!response.ok) {
    throw new Error(`Expo Push API error: ${response.status}`);
  }

  return true;
};

const scheduleMessageDeletion = (bot, chatId, messageId, deleteAfterSeconds) => {
  if (!deleteAfterSeconds || !messageId) return;
  setTimeout(() => {
    bot.telegram.deleteMessage(chatId, messageId).catch(() => {});
  }, deleteAfterSeconds * 1000);
};

export const deliverReminder = async ({
  bot,
  reminder,
  user,
  userLanguage,
  currentPointer,
  messageText
}) => {
  const isPointerMessage = Boolean(currentPointer);
  const deleteAfterSeconds = getDeleteAfterSeconds(reminder);
  const footer = (deleteAfterSeconds && !isPointerMessage)
    ? getAutoDeleteFooter(deleteAfterSeconds, userLanguage)
    : '';

  const useApp = user?.notificationChannel === 'app' && user?.pushTokens?.length > 0;
  const pushTitle = getPushTitle(userLanguage);

  if (reminder.photoFileId) {
    const photoCaption = reminder.caption ? `${reminder.caption}${footer}` : (footer ? footer.trim() : '');
    if (useApp) {
      const fallbackCaption = getMediaFallbackCaption('photo', userLanguage);
      await sendPushNotification(user.pushTokens, reminder.caption || fallbackCaption, reminder.soundId, pushTitle);
    } else {
      const sentMessage = await bot.telegram.sendPhoto(
        reminder.chatId,
        reminder.photoFileId,
        photoCaption ? { caption: photoCaption, parse_mode: 'HTML' } : {}
      );
      scheduleMessageDeletion(bot, reminder.chatId, sentMessage?.message_id, deleteAfterSeconds);
    }
    return;
  }

  if (reminder.videoFileId) {
    const videoCaption = reminder.caption ? `${reminder.caption}${footer}` : (footer ? footer.trim() : '');
    if (useApp) {
      const fallbackCaption = getMediaFallbackCaption('video', userLanguage);
      await sendPushNotification(user.pushTokens, reminder.caption || fallbackCaption, reminder.soundId, pushTitle);
    } else {
      const sentMessage = await bot.telegram.sendVideo(
        reminder.chatId,
        reminder.videoFileId,
        videoCaption ? { caption: videoCaption, parse_mode: 'HTML' } : {}
      );
      scheduleMessageDeletion(bot, reminder.chatId, sentMessage?.message_id, deleteAfterSeconds);
    }
    return;
  }

  if (useApp) {
    await sendPushNotification(user.pushTokens, messageText, reminder.soundId, pushTitle);
    return;
  }

  if (isPointerMessage) {
    const isFavorite = await isPointerInFavorites(reminder.userId, currentPointer._id);
    const reminderKeyboard = buildReminderPointerInlineKeyboard({
      pointerId: currentPointer._id,
      isFavorite,
      deleteAfterSeconds,
      language: userLanguage
    });

    const sentMessage = await bot.telegram.sendMessage(
      reminder.chatId,
      messageText,
      { parse_mode: 'HTML', ...(reminderKeyboard || {}) }
    );

    if (deleteAfterSeconds && sentMessage) {
      registerDeletionTimer(reminder.chatId, sentMessage.message_id, deleteAfterSeconds, async () => {
        await bot.telegram.deleteMessage(reminder.chatId, sentMessage.message_id).catch(() => {});
      });
    }
    return;
  }

  const sentMessage = await bot.telegram.sendMessage(
    reminder.chatId,
    messageText + footer,
    { parse_mode: 'HTML' }
  );

  scheduleMessageDeletion(bot, reminder.chatId, sentMessage?.message_id, deleteAfterSeconds);
};

export const handleDeliveryError = async ({ error, reminder }) => {
  const errorCode = error?.response?.error_code;

  logError(error, {
    scope: 'sendMessage',
    code: errorCode,
    reminderId: reminder._id,
    userId: reminder.userId,
    chatId: reminder.chatId
  });

  if (errorCode === 403) {
    await cleanupUser(reminder.userId).catch(() => {});
  }

  if (errorCode === 400) {
    reminder.isActive = false;
    await reminder.save().catch(() => {});
  }
};
