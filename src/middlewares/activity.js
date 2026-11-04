import Activity from '../models/Activity.js';
import User from '../models/User.js';

const notifyAdministratorAboutNewUser = async (ctx, telegramId) => {
  const administratorTelegramIdentifier = process.env.CREATOR_ID;
  if (!administratorTelegramIdentifier) return;
  if (String(telegramId) === String(administratorTelegramIdentifier)) return;

  const userFirstName = ctx.from?.first_name || '';
  const userLastName = ctx.from?.last_name || '';
  const userFullName = [userFirstName, userLastName].filter(Boolean).join(' ') || 'Без имени';
  const usernameString = ctx.from?.username ? `@${ctx.from.username}` : 'нет username';
  const userLanguageCode = ctx.from?.language_code || 'не указан';

  const alertMessageText = [
    '👤 <b>Новый пользователь в боте!</b>',
    '',
    `Имя: <b>${userFullName}</b>`,
    `Аккаунт: ${usernameString}`,
    `ID: <code>${telegramId}</code>`,
    `Язык: <code>${userLanguageCode}</code>`
  ].join('\n');

  if (ctx.telegram?.sendMessage) {
    await ctx.telegram.sendMessage(administratorTelegramIdentifier, alertMessageText, {
      parse_mode: 'HTML'
    }).catch(() => {});
  }
};

export const activityMiddleware = async (ctx, next) => {
  const telegramId =
    ctx.from?.id ||
    ctx.callbackQuery?.from?.id ||
    ctx.message?.from?.id;

  if (!telegramId) return next();

  const now = new Date();

  const existingUserRecord = await User.findOne({ telegramId }).lean().catch(() => null);

  if (!existingUserRecord) {
    await notifyAdministratorAboutNewUser(ctx, telegramId);
  }

  await User.updateOne(
    { telegramId },
    {
      $set: {
        lastActivityAt: now,
        lastSeenAt: now,
        firstName: ctx.from?.first_name || null,
        lastName: ctx.from?.last_name || null,
        username: ctx.from?.username || null
      }
    },
    { upsert: true }
  ).catch(() => {});

  await Activity.create({
    telegramId,
    type: ctx.callbackQuery ? 'callback' : 'message'
  }).catch(() => {});

  return next();
};
