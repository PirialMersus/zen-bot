// src/bot.js
import { Telegraf, session } from 'telegraf';
import { handleStart } from './handlers/menu.js';
import {handleNextPointer, handlePointer, handlePointerToReminder} from './handlers/pointers.js';
import {
  handleReminders,
  handleCreateReminder,
  handleReminderText,
  handleIntervalPreset,
  handleCustomIntervalRequest,
  handleCustomIntervalInput,
  handleMyReminders,
  handleRequestAction,
  handleConfirmAction
} from './handlers/reminders.js';
import { handleBack } from './handlers/back.js';
import {BUTTONS} from "./constants/buttons.js";
import {handleQuietToggle, handleSettings} from "./handlers/settings/index.js";
import {UI} from "./constants/ui.js";
import {TEXTS} from "./constants/texts.js";
import {mainKeyboard} from "./keyboard/main.js";
import {handleAdminUsers30d} from "./handlers/admin.js";

export const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(session());

bot.start(handleStart);

bot.hears(BUTTONS.POINTER, handlePointer);
bot.hears(BUTTONS.REMINDERS, handleReminders);
bot.hears(BUTTONS.SETTINGS, handleSettings);

bot.hears(UI.REMINDER_CREATE, handleCreateReminder);
bot.hears(UI.REMINDER_MY, handleMyReminders);

bot.hears(UI.INTERVAL_5, ctx => handleIntervalPreset(ctx, 5));
bot.hears(UI.INTERVAL_15, ctx => handleIntervalPreset(ctx, 15));
bot.hears(UI.INTERVAL_60, ctx => handleIntervalPreset(ctx, 60));
bot.hears(UI.INTERVAL_1440, ctx => handleIntervalPreset(ctx, 1440));
bot.hears(UI.INTERVAL_CUSTOM, handleCustomIntervalRequest);

bot.action(/^pause:/, ctx => handleRequestAction(ctx, 'pause'));
bot.action(/^resume:/, ctx => handleRequestAction(ctx, 'resume'));
bot.action(/^delete:/, ctx => handleRequestAction(ctx, 'delete'));

bot.action(/^confirm:/, handleConfirmAction);

bot.action('settings:quiet_toggle', handleQuietToggle);
bot.action('settings:back', async ctx => {
  await ctx.answerCbQuery();

  await ctx.deleteMessage();

  await ctx.reply(
    TEXTS.MENU.MAIN,
    mainKeyboard(ctx)
  );
});
bot.hears([UI.CONFIRM_YES, UI.CONFIRM_NO], handleConfirmAction);

bot.hears(BUTTONS.BACK, handleBack);

bot.hears(UI.POINTER_NEXT, handleNextPointer);
bot.hears(UI.POINTER_TO_REMINDER, handlePointerToReminder);

bot.hears(UI.ADMIN_USERS_30D, handleAdminUsers30d);

bot.on('text', async ctx => {
  await handleCustomIntervalInput(ctx);
  await handleReminderText(ctx);
});
