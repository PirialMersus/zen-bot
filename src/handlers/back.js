// src/handlers/back.js
import { mainKeyboard } from '../keyboard/main.js';
import { intervalKeyboard } from '../keyboard/intervals.js';
import { TEXTS } from '../constants/texts.js';

export const handleBack = async ctx => {
  ctx.session ??= {};
  const step = ctx.session?.reminderStep;

  if (!step) {
    ctx.session.creatingReminder = null;
    ctx.session.waitingCustomInterval = false;
    await ctx.reply(TEXTS.MENU.MAIN, mainKeyboard(ctx));
    return;
  }

  if (step === 'CUSTOM_INTERVAL') {
    ctx.session.waitingCustomInterval = false;
    ctx.session.reminderStep = 'INTERVAL';
    await ctx.reply(TEXTS.REMINDERS.ASK_INTERVAL, intervalKeyboard);
    return;
  }

  if (step === 'INTERVAL') {
    ctx.session.creatingReminder.intervalMinutes = null;
    ctx.session.reminderStep = 'TEXT';
    await ctx.reply(TEXTS.REMINDERS.ASK_TEXT);
    return;
  }

  if (step === 'TEXT') {
    ctx.session.creatingReminder = null;
    ctx.session.reminderStep = null;
    await ctx.reply(TEXTS.MENU.MAIN, mainKeyboard(ctx));
  }
};
