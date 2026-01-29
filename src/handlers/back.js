// src/handlers/back.js
import { mainKeyboard } from '../keyboard/main.js';
import { TEXTS } from '../constants/texts.js';
import { REMINDER_STEP } from './reminders.js';
import { renderReminderStep } from './reminders.js';

export const handleBack = async ctx => {
  ctx.session ??= {};

  const step = ctx.session.reminderStep;

  if (!step) {
    await ctx.reply(TEXTS.MENU.MAIN, mainKeyboard(ctx));
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
    await ctx.reply(TEXTS.MENU.MAIN, mainKeyboard(ctx));
  }
};
