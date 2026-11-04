import { Markup } from 'telegraf';
import { BUTTONS } from '../constants/buttons.js';
import { UI } from '../constants/ui.js';
import Reminder from '../models/Reminder.js';
import User from '../models/User.js';

export const handleAdminActiveUsers = async ctx => {
  if (String(ctx.from?.id) !== process.env.CREATOR_ID) return;

  const millisecondsInOneDay = 24 * 60 * 60 * 1000;
  const oneDayAgoDate = new Date(Date.now() - millisecondsInOneDay);
  const sevenDaysAgoDate = new Date(Date.now() - 7 * millisecondsInOneDay);

  const [
    usersWithActiveReminders,
    activeUsersPastDayCount,
    activeUsersPastWeekCount,
    totalUsersCount
  ] = await Promise.all([
    Reminder.distinct('userId', { isActive: true }),
    User.countDocuments({ lastActivityAt: { $gte: oneDayAgoDate } }),
    User.countDocuments({ lastActivityAt: { $gte: sevenDaysAgoDate } }),
    User.countDocuments()
  ]);

  const activeRemindersUsersCount = usersWithActiveReminders.length;

  const responseText = [
    '👥 <b>Статистика пользователей</b>',
    '',
    `• С активными напоминаниями: <b>${activeRemindersUsersCount}</b>`,
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
    const isNavigationButton =
      Object.values(BUTTONS).includes(incomingText) ||
      Object.values(UI).includes(incomingText);

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

  const totalRegisteredUsersCount = await User.countDocuments();

  const confirmationText = [
    '📢 <b>Подтверждение рассылки</b>',
    '',
    'Сообщение принято к отправке.',
    `Получателей: <b>${totalRegisteredUsersCount}</b> чел.`,
    '',
    'Запустить рассылку всем пользователям?'
  ].join('\n');

  await ctx.reply(confirmationText, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback('🚀 Отправить всем', 'broadcast:confirm'),
        Markup.button.callback('❌ Отмена', 'broadcast:cancel')
      ]
    ])
  });

  return true;
};

export const handleAdminBroadcastConfirm = async ctx => {
  if (String(ctx.from?.id) !== process.env.CREATOR_ID) return;
  if (ctx.session?.adminBroadcastStep !== 'AWAITING_CONFIRMATION') return;

  const sourceChatIdentifier = ctx.session.broadcastSourceChatId;
  const sourceMessageIdentifier = ctx.session.broadcastSourceMessageId;

  if (!sourceChatIdentifier || !sourceMessageIdentifier) {
    await ctx.answerCbQuery('Ошибка: исходное сообщение не найдено').catch(() => {});
    return;
  }

  await ctx.answerCbQuery('Рассылка запущена').catch(() => {});
  await ctx.editMessageText(
    '⏳ <b>Идет рассылка сообщений...</b>\nПожалуйста, подождите завершения.',
    { parse_mode: 'HTML' }
  ).catch(() => {});

  ctx.session.adminBroadcastStep = null;
  ctx.session.broadcastSourceChatId = null;
  ctx.session.broadcastSourceMessageId = null;

  const allRegisteredUsers = await User.find({}, { telegramId: 1 });
  let successfullyDeliveredCount = 0;
  let deliveryFailuresCount = 0;

  for (const userRecord of allRegisteredUsers) {
    if (!userRecord.telegramId) continue;
    try {
      await ctx.telegram.copyMessage(
        userRecord.telegramId,
        sourceChatIdentifier,
        sourceMessageIdentifier,
        {
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('✍️ Ответить', 'feedback:start')]
          ]).reply_markup
        }
      );
      successfullyDeliveredCount += 1;
    } catch (deliveryError) {
      deliveryFailuresCount += 1;
    }

    await new Promise(resolveTimer => setTimeout(resolveTimer, 40));
  }

  const broadcastReportText = [
    '✅ <b>Рассылка успешно завершена!</b>',
    '',
    `• Доставлено: <b>${successfullyDeliveredCount}</b>`,
    `• Не доставлено (бот заблокирован): <b>${deliveryFailuresCount}</b>`
  ].join('\n');

  await ctx.reply(broadcastReportText, { parse_mode: 'HTML' });
};

export const handleFeedbackStart = async ctx => {
  await ctx.answerCbQuery().catch(() => {});
  ctx.session ??= {};
  ctx.session.feedbackAwaiting = true;

  const feedbackPromptText = [
    '✍️ <b>Обратная связь</b>',
    '',
    'Напишите ваш ответ или отправьте голосовое сообщение, видео, кружок, фото или документ.',
    '',
    'Ваше сообщение будет напрямую передано создателю бота.'
  ].join('\n');

  await ctx.reply(
    feedbackPromptText,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('❌ Отмена', 'feedback:cancel')]
      ])
    }
  );
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
    const isNavigationButton =
      Object.values(BUTTONS).includes(incomingMessageText) ||
      Object.values(UI).includes(incomingMessageText);

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
    `От: <b>${senderFullName}</b> (${senderUsernameString})`,
    `ID: <code>${senderTelegramIdentifier}</code>`
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
    '✅ Ваше сообщение передано администратору. Большое спасибо за обратную связь!'
  );

  return true;
};

