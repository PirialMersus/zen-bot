import { mainKeyboard } from '../keyboard/main.js';
import { getTexts } from '../constants/texts.js';
import { REMINDER_STEP, renderReminderStep } from './reminders.js';
import { resolveUserLanguage } from '../middlewares/activity.js';

export const handleBack = async (ctx) => {
  ctx.session ??= {};
  ctx.session.isSettingCustomQuietHours = null;

  const step = ctx.session.reminderStep;
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);

  if (!step) {
    await ctx.reply(texts.MENU.MAIN, mainKeyboard(ctx, userLanguage));
    return;
  }

  if (step === REMINDER_STEP.AUTO_DELETE) {
    ctx.session.reminderStep = REMINDER_STEP.INTERVAL;
    await renderReminderStep(ctx);
    return;
  }

  if (step === REMINDER_STEP.INTERVAL) {
    ctx.session.reminderStep = REMINDER_STEP.TEXT;
    await renderReminderStep(ctx);
    return;
  }

  if (step === REMINDER_STEP.TEXT) {
    ctx.session.creatingReminder = null;
    ctx.session.reminderStep = null;
    await ctx.reply(texts.MENU.MAIN, mainKeyboard(ctx, userLanguage));
  }
};

export const handleCancel = async (ctx) => {
  ctx.session ??= {};
  ctx.session.isSettingCustomQuietHours = null;
  ctx.session.creatingReminder = null;
  ctx.session.reminderStep = null;
  ctx.session.feedbackAwaiting = false;
  ctx.session.adminBroadcastStep = null;

  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  await ctx.reply(texts.MENU.MAIN, mainKeyboard(ctx, userLanguage));
};
