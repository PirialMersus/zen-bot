// src/bot.js
import { Telegraf, session } from 'telegraf';
import { BUTTONS } from './constants/buttons.js';
import { TEXTS } from './constants/texts.js';
import { UI } from './constants/ui.js';
import { handleAdminUsers30d } from './handlers/admin.js';
import { handleGetAuthCode } from './handlers/auth.js';
import { handleBack } from './handlers/back.js';
import { handleStart } from './handlers/menu.js';
import {
  handleNextPointer,
  handlePointer,
  handlePointerToReminder
} from './handlers/pointers.js';
import {
  handleConfirmAction,
  handleCreateReminder,
  handleDeleteAfterInput,
  handleDeleteAfterPreset,
  handleIntervalInput,
  handleIntervalPreset,
  handleMyReminders,
  handleReminderText,
  handleReminders,
  handleRequestAction
} from './handlers/reminders.js';
import {
  handleQuietToggle,
  handleSettings,
  handleTimezoneMenu,
  handleTimezoneRegion,
  handleTimezoneSet
} from './handlers/settings/index.js';
import { intervalKeyboard } from './keyboard/intervals.js';
import { mainKeyboard } from './keyboard/main.js';
import { activityMiddleware } from './middlewares/activity.js';

export const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(session());
bot.use(activityMiddleware);

bot.catch((err, ctx) => {
  console.error('BOT_ERROR', err?.message, err?.stack, {
    from: ctx?.from?.id,
    chat: ctx?.chat?.id,
    updateType: ctx?.updateType
  });
});

bot.start(handleStart);

// Mobile app auth
bot.command('getcode', handleGetAuthCode);
bot.action('get_auth_code', handleGetAuthCode);

bot.hears(BUTTONS.POINTER, handlePointer);
bot.hears(BUTTONS.REMINDERS, handleReminders);
bot.hears(BUTTONS.SETTINGS, handleSettings);

bot.hears(UI.REMINDER_CREATE, handleCreateReminder);
bot.hears(UI.REMINDER_MY, handleMyReminders);

bot.hears(UI.INTERVAL_5, ctx => handleIntervalPreset(ctx, 5));
bot.hears(UI.INTERVAL_15, ctx => handleIntervalPreset(ctx, 15));
bot.hears(UI.INTERVAL_60, ctx => handleIntervalPreset(ctx, 60));
bot.hears(UI.INTERVAL_1440, ctx => handleIntervalPreset(ctx, 1440));

bot.action(/^pause:/, ctx => handleRequestAction(ctx, 'pause'));
bot.action(/^resume:/, ctx => handleRequestAction(ctx, 'resume'));
bot.action(/^delete:/, ctx => handleRequestAction(ctx, 'delete'));

bot.action(/^confirm:/, handleConfirmAction);

bot.action('settings:timezone', handleTimezoneMenu);
bot.action(/^timezone:region:/, handleTimezoneRegion);
bot.action(/^timezone:set:/, handleTimezoneSet);

bot.action('settings:quiet_toggle', handleQuietToggle);

bot.action('settings:back', async ctx => {
  await ctx.answerCbQuery().catch(() => { });
  await ctx.deleteMessage().catch(() => { });
  await ctx.reply(TEXTS.MENU.MAIN, mainKeyboard(ctx)).catch(() => { });
});

bot.action('reminder:back_to_intervals', async ctx => {
  ctx.session ??= {};
  ctx.session.reminderStep = 'INTERVAL';

  await ctx.answerCbQuery().catch(() => { });
  await ctx.deleteMessage().catch(() => { });

  const preview = ctx.session?.creatingReminder?.text
    ? `\n\n«${ctx.session.creatingReminder.text.slice(0, 40)}»`
    : '';

  await ctx.reply(
    `${TEXTS.REMINDERS.ASK_INTERVAL}${preview}\n\n${TEXTS.REMINDERS.ASK_INTERVAL_HINT}`,
    intervalKeyboard
  );
});

bot.hears(BUTTONS.BACK, handleBack);
bot.hears(UI.POINTER_NEXT, handleNextPointer);
bot.hears(UI.POINTER_TO_REMINDER, handlePointerToReminder);
bot.hears(UI.ADMIN_USERS_30D, handleAdminUsers30d);

bot.hears(BUTTONS.SUPPORT, async ctx => {
  await ctx.reply(TEXTS.SUPPORT);
});

bot.hears(TEXTS.INTERVALS.OPTIONS, async ctx => {
  if (ctx.message.text === 'Не удалять') {
    await handleDeleteAfterPreset(ctx, null);
    return;
  }

  await handleDeleteAfterPreset(ctx, TEXTS.INTERVALS.MAP[ctx.message.text]);
});

bot.on('text', async ctx => {
  if (await handleDeleteAfterInput(ctx)) return;
  if (await handleIntervalInput(ctx)) return;
  await handleReminderText(ctx);
});
