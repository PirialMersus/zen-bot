import { getTexts } from '../constants/texts.js';
import { mainKeyboard } from '../keyboard/main.js';
import { handleGetAuthCode } from './auth.js';
import { resolveUserLanguage } from '../middlewares/activity.js';

export const handleStart = async ctx => {
  ctx.session ??= {};
  ctx.session.reminderStep = null;
  ctx.session.creatingReminder = null;
  ctx.session.isSettingCustomQuietHours = null;

  const startPayload = ctx.startPayload;

  if (startPayload === 'getcode') {
    await handleGetAuthCode(ctx);
    return;
  }

  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);

  await ctx.reply(texts.MENU.START, mainKeyboard(ctx, userLanguage));
};
