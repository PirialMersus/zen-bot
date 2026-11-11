import { Markup } from 'telegraf';
import { BUTTONS } from '../constants/buttons.js';
import { UI, getUi } from '../constants/ui.js';
import Reminder from '../models/Reminder.js';
import User from '../models/User.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import {
  getPointerByNumber,
  findPointersByText,
  countPointersByText,
  isPointerInFavorites
} from '../services/pointers.js';
import { resolveUserLanguage } from '../middlewares/activity.js';
import { buildPointerInlineKeyboard, formatPointerText } from './pointers.js';

const collectAllButtonValues = buttonObject =>
  Object.values(buttonObject).flatMap(item => (typeof item === 'object' && item !== null ? Object.values(item) : [item]));

const allKnownNavigationButtons = [
  ...collectAllButtonValues(BUTTONS),
  ...collectAllButtonValues(UI)
];

export const handleAdminActiveUsers = async ctx => {
  if (String(ctx.from?.id) !== process.env.CREATOR_ID) return;

  const millisecondsInOneDay = 24 * 60 * 60 * 1000;
  const oneDayAgoDate = new Date(Date.now() - millisecondsInOneDay);
  const sevenDaysAgoDate = new Date(Date.now() - 7 * millisecondsInOneDay);

  const [
    usersWithActiveReminders,
    usersWithFavoritePointersCount,
    activeUsersPastDayCount,
    activeUsersPastWeekCount,
    totalUsersCount
  ] = await Promise.all([
    Reminder.distinct('userId', { isActive: true }),
    User.countDocuments({ 'favoritePointers.0': { $exists: true } }),
    User.countDocuments({ lastActivityAt: { $gte: oneDayAgoDate } }),
    User.countDocuments({ lastActivityAt: { $gte: sevenDaysAgoDate } }),
    User.countDocuments()
  ]);

  const activeRemindersUsersCount = usersWithActiveReminders.length;

  const responseText = [
    '👥 <b>Статистика пользователей</b>',
    '',
    `• С активными напоминаниями: <b>${activeRemindersUsersCount}</b>`,
    `• С избранным: <b>${usersWithFavoritePointersCount}</b>`,
    `• Активность за 24 часа: <b>${activeUsersPastDayCount}</b>`,
    `• Активность за 7 дней: <b>${activeUsersPastWeekCount}</b>`,
    `• Всего пользователей: <b>${totalUsersCount}</b>`
  ].join('\n');

  await ctx.reply(responseText, { parse_mode: 'HTML' });
};

export const handleAdminBroadcastStart = async ctx => {
  if (String(ctx.from?.id) !== process.env.CREATOR_ID) return;

  ctx.session ??= {};
  ctx.session.adminBroadcastStep = 'AWAITING_MESSAGE';
  ctx.session.broadcastSourceChatId = null;
  ctx.session.broadcastSourceMessageId = null;

  const promptText = [
    '📢 <b>Режим создания рассылки</b>',
    '',
    'Отправьте сообщение любого формата (текст, фото, видео, голосовое, кружок или аудио).',
    '',
    'К сообщению будет прикреплена кнопка «✍️ Ответить» для обратной связи.'
  ].join('\n');

  await ctx.reply(promptText, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('❌ Отмена', 'broadcast:cancel')]
    ])
  });
};

export const handleAdminBroadcastCancel = async ctx => {
  if (String(ctx.from?.id) !== process.env.CREATOR_ID) return;

  await ctx.answerCbQuery().catch(() => {});

  if (ctx.session) {
    ctx.session.adminBroadcastStep = null;
    ctx.session.broadcastSourceChatId = null;
    ctx.session.broadcastSourceMessageId = null;
  }

  await ctx.editMessageText('❌ Создание рассылки отменено.').catch(() => {});
};

export const handleAdminBroadcastMessage = async ctx => {
  if (String(ctx.from?.id) !== process.env.CREATOR_ID) return false;
  if (ctx.session?.adminBroadcastStep !== 'AWAITING_MESSAGE') return false;

  const incomingText = ctx.message?.text;
  if (incomingText) {
    const isNavigationButton = allKnownNavigationButtons.includes(incomingText);

    if (isNavigationButton) {
      ctx.session.adminBroadcastStep = null;
      ctx.session.broadcastSourceChatId = null;
      ctx.session.broadcastSourceMessageId = null;
      return false;
    }
  }

  ctx.session.broadcastSourceChatId = ctx.chat.id;
  ctx.session.broadcastSourceMessageId = ctx.message.message_id;
  ctx.session.adminBroadcastStep = 'AWAITING_CONFIRMATION';

  const previewConfirmationText = [
    '📢 <b>Подтверждение рассылки</b>',
    '',
    'Выше показано сообщение, которое получат все пользователи.',
    'К нему будет добавлена кнопка «✍️ Ответить».',
    '',
    'Отправить сообщение всем пользователям?'
  ].join('\n');

  await ctx.reply(previewConfirmationText, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Да, разослать', 'broadcast:confirm'),
        Markup.button.callback('❌ Отмена', 'broadcast:cancel')
      ]
    ])
  });

  return true;
};

export const handleAdminBroadcastConfirm = async ctx => {
  if (String(ctx.from?.id) !== process.env.CREATOR_ID) return;
  if (ctx.session?.adminBroadcastStep !== 'AWAITING_CONFIRMATION') {
    await ctx.answerCbQuery('Рассылка не ожидает подтверждения').catch(() => {});
    return;
  }

  const sourceChatIdentifier = ctx.session.broadcastSourceChatId;
  const sourceMessageIdentifier = ctx.session.broadcastSourceMessageId;

  if (!sourceChatIdentifier || !sourceMessageIdentifier) {
    await ctx.answerCbQuery('Исходное сообщение не найдено').catch(() => {});
    return;
  }

  await ctx.answerCbQuery('Запуск рассылки...').catch(() => {});
  await ctx.editMessageText('🚀 Рассылка началась. По завершении придет отчет.').catch(() => {});

  ctx.session.adminBroadcastStep = null;
  ctx.session.broadcastSourceChatId = null;
  ctx.session.broadcastSourceMessageId = null;

  const allTelegramUsers = await User.find(
    { telegramId: { $exists: true, $ne: null } },
    { telegramId: 1 }
  ).lean().catch(() => []);

  const totalRecipientsCount = allTelegramUsers.length;
  let successfulDeliveriesCount = 0;
  let failedDeliveriesCount = 0;

  const feedbackInlineKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('✍️ Ответить', 'feedback:start')]
  ]);

  for (const recipientUser of allTelegramUsers) {
    try {
      await ctx.telegram.copyMessage(
        recipientUser.telegramId,
        sourceChatIdentifier,
        sourceMessageIdentifier,
        {
          reply_markup: feedbackInlineKeyboard.reply_markup
        }
      );
      successfulDeliveriesCount++;
    } catch {
      failedDeliveriesCount++;
    }

    await new Promise(resolveTimer => setTimeout(resolveTimer, 40));
  }

  const broadcastReportText = [
    '📊 <b>Отчет о рассылке</b>',
    '',
    `• Всего пользователей: <b>${totalRecipientsCount}</b>`,
    `• Успешно доставлено: <b>${successfulDeliveriesCount}</b>`,
    `• Ошибок отправки: <b>${failedDeliveriesCount}</b>`
  ].join('\n');

  await ctx.reply(broadcastReportText, { parse_mode: 'HTML' });
};

export const handleFeedbackStart = async ctx => {
  ctx.session ??= {};
  ctx.session.feedbackAwaiting = true;

  await ctx.answerCbQuery().catch(() => {});

  const promptText = [
    '✍️ <b>Обратная связь</b>',
    '',
    'Напишите ваш ответ одним сообщением (можно отправить текст, фото или видео).'
  ].join('\n');

  await ctx.reply(promptText, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('❌ Отмена', 'feedback:cancel')]
    ])
  });
};

export const handleFeedbackCancel = async ctx => {
  await ctx.answerCbQuery().catch(() => {});

  if (ctx.session) {
    ctx.session.feedbackAwaiting = false;
  }

  await ctx.editMessageText('Отправка ответа отменена.').catch(() => {});
};

export const handleFeedbackMessage = async ctx => {
  if (!ctx.session?.feedbackAwaiting) return false;

  const incomingMessageText = ctx.message?.text;
  if (incomingMessageText) {
    const isNavigationButton = allKnownNavigationButtons.includes(incomingMessageText);

    if (isNavigationButton) {
      ctx.session.feedbackAwaiting = false;
      return false;
    }
  }

  const senderFirstName = ctx.from?.first_name || '';
  const senderLastName = ctx.from?.last_name || '';
  const senderFullName = [senderFirstName, senderLastName].filter(Boolean).join(' ') || 'Пользователь';
  const senderUsernameString = ctx.from?.username ? `@${ctx.from.username}` : 'нет username';
  const senderTelegramIdentifier = ctx.from?.id;

  const adminNotificationHeader = [
    '📬 <b>Новый ответ на рассылку!</b>',
    '',
    `От: <b>${escapeHtml(senderFullName)}</b> (${escapeHtml(senderUsernameString)})`,
    `ID: <code>${escapeHtml(senderTelegramIdentifier)}</code>`
  ].join('\n');

  const administratorTelegramIdentifier = process.env.CREATOR_ID;

  await ctx.telegram.sendMessage(administratorTelegramIdentifier, adminNotificationHeader, {
    parse_mode: 'HTML'
  }).catch(() => {});

  await ctx.telegram.copyMessage(
    administratorTelegramIdentifier,
    ctx.chat.id,
    ctx.message.message_id
  ).catch(() => {});

  ctx.session.feedbackAwaiting = false;

  await ctx.reply(
    '✅ Твоё сообщение передано администратору. Большое спасибо за обратную связь!'
  );

  return true;
};

export const handleAdminGetPointerByNumber = async ctx => {
  if (String(ctx.from?.id) !== process.env.CREATOR_ID) return false;

  const rawIncomingMessageText = ctx.message?.text || '';
  const trimmedLowerCasedText = rawIncomingMessageText.trim().toLowerCase();

  const isExplicitPointerCommand = /^(?:\/p(?:ointer)?(?:_(?:en|ru|uk|es))?|(?:получить\s+)?(?:pointer|указатель|вказівник|puntero))(?:\s+(?:en|ru|uk|es))?(?:\s+\d+|\s*$)/i.test(trimmedLowerCasedText);
  if (!isExplicitPointerCommand) {
    return false;
  }

  let targetPointerLanguage = 'ru';
  const languageModifierMatch = trimmedLowerCasedText.match(/(?:^|\s|_)(en|ru|uk|es)(?:\s|$)/i);
  if (languageModifierMatch) {
    targetPointerLanguage = languageModifierMatch[1].toLowerCase();
  } else if (ctx.state?.userLanguage === 'en' || ctx.state?.userLanguage === 'uk' || ctx.state?.userLanguage === 'es') {
    targetPointerLanguage = ctx.state.userLanguage;
  }

  let requestedPointerNumber = null;
  const numberDigitsMatch = rawIncomingMessageText.match(/\d+/);
  if (numberDigitsMatch) {
    requestedPointerNumber = parseInt(numberDigitsMatch[0], 10);
  }

  if (!requestedPointerNumber) {
    await ctx.reply('⚠️ Укажите номер указателя. Пример: /p 42 или получить pointer 42');
    return true;
  }

  const foundPointerRecord = await getPointerByNumber(requestedPointerNumber, targetPointerLanguage);

  if (!foundPointerRecord) {
    await ctx.reply(`❌ Указатель #${requestedPointerNumber} (${targetPointerLanguage.toUpperCase()}) не найден в базе.`);
    return true;
  }

  const formattedPointerMessage = formatPointerText(foundPointerRecord);

  ctx.session ??= {};
  ctx.session.lastPointerText = foundPointerRecord.text;
  ctx.session.lastPointerId = String(foundPointerRecord._id);

  const isFavorite = await isPointerInFavorites(ctx.from?.id, foundPointerRecord._id);

  await ctx.reply(
    formattedPointerMessage,
    buildPointerInlineKeyboard(targetPointerLanguage, isFavorite, foundPointerRecord._id, 'random')
  );

  return true;
};

export const handleAdminSearchPointers = async ctx => {
  if (String(ctx.from?.id) !== process.env.CREATOR_ID) return false;

  const rawIncomingMessageText = ctx.message?.text || '';
  const trimmedLowerCasedText = rawIncomingMessageText.trim().toLowerCase();

  let targetPointerLanguage = 'ru';
  const languageModifierMatch = trimmedLowerCasedText.match(/(?:^|\s|_)(en|ru|uk|es)(?:\s|$)/i);
  if (languageModifierMatch) {
    targetPointerLanguage = languageModifierMatch[1].toLowerCase();
  } else if (ctx.state?.userLanguage === 'en' || ctx.state?.userLanguage === 'uk' || ctx.state?.userLanguage === 'es') {
    targetPointerLanguage = ctx.state.userLanguage;
  }

  let extractedSearchPhrase = rawIncomingMessageText
    .replace(/^\/(?:find|search|f)(?:_(?:en|ru|uk|es))?/i, '')
    .replace(/^(?:найти|поиск|знайти|пошук|buscar)(?:\s+указатель|\s+pointer|\s+вказівник|\s+puntero)?/i, '')
    .trim();

  extractedSearchPhrase = extractedSearchPhrase
    .replace(/^(?:en|ru|uk|es)\s+/i, '')
    .replace(/\s+(?:en|ru|uk|es)$/i, '')
    .trim();

  if (!extractedSearchPhrase) {
    await ctx.reply('⚠️ Укажите текст для поиска. Пример: /find тишина или /find en stillness');
    return true;
  }

  const maximumReturnedPointersCount = 10;
  const [totalFoundCount, foundPointersList] = await Promise.all([
    countPointersByText(extractedSearchPhrase, targetPointerLanguage),
    findPointersByText(extractedSearchPhrase, targetPointerLanguage, maximumReturnedPointersCount)
  ]);

  if (totalFoundCount === 0 || foundPointersList.length === 0) {
    await ctx.reply(`❌ Указатели с текстом «${extractedSearchPhrase}» (${targetPointerLanguage.toUpperCase()}) не найдены.`);
    return true;
  }

  ctx.session ??= {};

  for (const singlePointerRecord of foundPointersList) {
    const formattedPointerMessage = formatPointerText(singlePointerRecord);
    ctx.session.lastPointerText = singlePointerRecord.text;
    ctx.session.lastPointerId = String(singlePointerRecord._id);

    const isFavorite = await isPointerInFavorites(ctx.from?.id, singlePointerRecord._id);

    await ctx.reply(
      formattedPointerMessage,
      buildPointerInlineKeyboard(targetPointerLanguage, isFavorite, singlePointerRecord._id, 'random')
    );
  }

  if (totalFoundCount > foundPointersList.length) {
    await ctx.reply(
      `ℹ️ Найдено всего: ${totalFoundCount}. Показаны первые ${foundPointersList.length}. Уточните поисковую фразу для более точного совпадения.`
    );
  }

  return true;
};
