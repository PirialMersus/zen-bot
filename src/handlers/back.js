// src/handlers/back.js
import { mainKeyboard } from '../keyboard/main.js';
import { TEXTS } from '../constants/texts.js';

export const handleBack = async ctx => {
  const r = ctx.session?.creatingReminder;

  if (!r) {
    await ctx.reply(TEXTS.MENU.MAIN, mainKeyboard);
    return;
  }

  if (r.fromPointer) {
    ctx.session.creatingReminder = null;
    ctx.session.waitingCustomInterval = false;
    ctx.session.confirmAction = null;
    await ctx.reply(TEXTS.MENU.MAIN, mainKeyboard);
    return;
  }

  if (r.text && !r.intervalMinutes) {
    r.text = null;
    await ctx.reply(TEXTS.REMINDERS.ASK_TEXT);
    return;
  }

  if (r.intervalMinutes) {
    r.intervalMinutes = null;
    await ctx.reply(TEXTS.REMINDERS.ASK_INTERVAL);
    return;
  }

  ctx.session.creatingReminder = null;
  await ctx.reply(TEXTS.MENU.MAIN, mainKeyboard);
};
