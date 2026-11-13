import { Telegraf, session } from 'telegraf';
import { getButtonVariants } from './constants/buttons.js';
import { TEXTS, getTexts, isDoNotDeleteText, COMBINED_AUTO_DELETE_MAP } from './constants/texts.js';
import { getUiVariants } from './constants/ui.js';
import {
  handleAdminActiveUsers,
  handleAdminBroadcastCancel,
  handleAdminBroadcastConfirm,
  handleAdminBroadcastMessage,
  handleAdminBroadcastStart,
  handleAdminGetPointerByNumber,
  handleAdminSearchPointers,
  handleFeedbackCancel,
  handleFeedbackMessage,
  handleFeedbackStart
} from './handlers/admin.js';
import { handleGetAuthCode } from './handlers/auth.js';
import { handleBack } from './handlers/back.js';
import { handleStart } from './handlers/menu.js';
import { handleUnknownMessage } from './handlers/fallback.js';
import {
  handleNextPointer,
  handlePointersMenu,
  handleRandomPointer,
  handleFavoritePointer,
  handleFavoriteInfo,
  handleExpireInfo,
  handleToggleFavoritePointer,
  handlePointerToReminder,
  handleKeepPointer
} from './handlers/pointers.js';
import {
  handleConfirmAction,
  handleCreateReminder,
  handleDeleteAfterInput,
  handleDeleteAfterPreset,
  handleIntervalInput,
  handleIntervalPreset,
  handleMyReminders,
  handleReminderPhoto,
  handleReminderVideo,
  handleReminderText,
  handleReminders,
  handleRequestAction,
  handleViewReminder,
  handleReminderListCallback
} from './handlers/reminders.js';
import {
  handleQuietToggle,
  handleQuietHoursMenu,
  handleQuietHoursSetPreset,
  handleQuietHoursCustomPrompt,
  handleQuietHoursCustomInput,
  handleSettings,
  handleTimezoneMenu,
  handleTimezoneRegion,
  handleTimezoneSet,
  handleLanguageMenu,
  handleLanguageSet
} from './handlers/settings/index.js';
import { getIntervalKeyboard } from './keyboard/intervals.js';
import { mainKeyboard } from './keyboard/main.js';
import { getSupportInlineKeyboard } from './keyboard/support.js';
import { activityMiddleware, resolveUserLanguage } from './middlewares/activity.js';

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

bot.command('getcode', handleGetAuthCode);
bot.action('get_auth_code', handleGetAuthCode);

bot.action(/^pointer:next/, handleNextPointer);
bot.action('pointer:to_reminder', handlePointerToReminder);
bot.action(/^pointer:fav_toggle/, handleToggleFavoritePointer);
bot.action('pointer:fav_info', handleFavoriteInfo);
bot.action('pointer:expire_info', handleExpireInfo);
bot.action(/^pointer:keep/, handleKeepPointer);

bot.hears(getButtonVariants('POINTER'), handlePointersMenu);
bot.hears(getUiVariants('POINTER_RANDOM'), handleRandomPointer);
bot.hears(getUiVariants('POINTER_FAVORITE'), handleFavoritePointer);
bot.hears(getButtonVariants('REMINDERS'), handleReminders);
bot.hears(getButtonVariants('SETTINGS'), handleSettings);

bot.hears(getUiVariants('REMINDER_CREATE'), handleCreateReminder);
bot.hears(getUiVariants('REMINDER_MY'), handleMyReminders);

bot.hears(getUiVariants('INTERVAL_5'), ctx => handleIntervalPreset(ctx, 5));
bot.hears(getUiVariants('INTERVAL_15'), ctx => handleIntervalPreset(ctx, 15));
bot.hears(getUiVariants('INTERVAL_60'), ctx => handleIntervalPreset(ctx, 60));
bot.hears(getUiVariants('INTERVAL_1440'), ctx => handleIntervalPreset(ctx, 1440));

bot.action(/^pause:/, ctx => handleRequestAction(ctx, 'pause'));
bot.action(/^resume:/, ctx => handleRequestAction(ctx, 'resume'));
bot.action(/^delete:/, ctx => handleRequestAction(ctx, 'delete'));

bot.action(/^confirm:/, handleConfirmAction);

bot.action('broadcast:confirm', handleAdminBroadcastConfirm);
bot.action('broadcast:cancel', handleAdminBroadcastCancel);
bot.action('feedback:start', handleFeedbackStart);
bot.action('feedback:cancel', handleFeedbackCancel);

bot.action('settings:timezone', handleTimezoneMenu);
bot.action(/^timezone:region:/, handleTimezoneRegion);
bot.action(/^timezone:set:/, handleTimezoneSet);

bot.action('settings:language', handleLanguageMenu);
bot.action(/^settings:language:set:/, handleLanguageSet);
bot.action('settings:language:back', handleSettings);

bot.action('settings:menu', handleSettings);
bot.action('settings:quiet_hours:menu', handleQuietHoursMenu);
bot.action(/^settings:quiet_hours:preset:/, handleQuietHoursSetPreset);
bot.action('settings:quiet_hours:custom', handleQuietHoursCustomPrompt);

bot.action('reminder:list', handleReminderListCallback);
bot.action(/^reminder:view:/, handleViewReminder);

bot.action('settings:quiet_toggle', handleQuietToggle);

bot.action('settings:back', async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  await ctx.answerCbQuery().catch(() => { });
  await ctx.deleteMessage().catch(() => { });
  await ctx.reply(texts.MENU.MAIN, mainKeyboard(ctx, userLanguage)).catch(() => { });
});

bot.action('reminder:back_to_intervals', async ctx => {
  ctx.session ??= {};
  ctx.session.reminderStep = 'INTERVAL';

  await ctx.answerCbQuery().catch(() => { });
  await ctx.deleteMessage().catch(() => { });

  const preview = ctx.session?.creatingReminder?.text
    ? `\n\n«${ctx.session.creatingReminder.text.slice(0, 40)}»`
    : '';

  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);

  await ctx.reply(
    `${texts.REMINDERS.ASK_INTERVAL}${preview}\n\n${texts.REMINDERS.ASK_INTERVAL_HINT}`,
    getIntervalKeyboard(userLanguage)
  );
});

bot.hears([
  ...getButtonVariants('BACK'),
  ...getUiVariants('POINTER_TO_MENU')
], handleBack);
bot.hears(getUiVariants('POINTER_NEXT'), handleNextPointer);
bot.hears(getUiVariants('POINTER_TO_REMINDER'), handlePointerToReminder);
bot.hears(getUiVariants('ADMIN_ACTIVE_USERS'), handleAdminActiveUsers);
bot.hears(getUiVariants('ADMIN_BROADCAST'), handleAdminBroadcastStart);

bot.command(['pointer', 'p'], handleAdminGetPointerByNumber);
bot.hears(/^(?:получить\s+)?(?:pointer|указатель|вказівник|puntero)(?:\s+(?:en|ru|uk|es))?\s+\d+$/i, handleAdminGetPointerByNumber);
bot.hears(/^\/p(?:ointer)?(?:_(?:en|ru|uk|es))?\s+\d+$/i, handleAdminGetPointerByNumber);

bot.command(['find', 'search', 'f'], handleAdminSearchPointers);
bot.hears(/^(?:\/find|\/search|\/f|найти|поиск|знайти|пошук|buscar)(?:_(?:en|ru|uk|es))?(?:\s+.+)?$/i, handleAdminSearchPointers);

bot.hears(getButtonVariants('SUPPORT'), async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  await ctx.reply(texts.SUPPORT, getSupportInlineKeyboard(userLanguage));
});

const allowedIntervalOptions = [
  ...TEXTS.ru.INTERVALS.OPTIONS,
  ...TEXTS.en.INTERVALS.OPTIONS,
  ...TEXTS.uk.INTERVALS.OPTIONS,
  ...TEXTS.es.INTERVALS.OPTIONS
];

bot.hears(allowedIntervalOptions, async ctx => {
  const incomingMessageText = ctx.message.text;

  if (isDoNotDeleteText(incomingMessageText)) {
    await handleDeleteAfterPreset(ctx, null);
    return;
  }

  await handleDeleteAfterPreset(ctx, COMBINED_AUTO_DELETE_MAP[incomingMessageText]);
});

bot.on('photo', async ctx => {
  if (await handleFeedbackMessage(ctx)) return;
  if (await handleAdminBroadcastMessage(ctx)) return;
  await handleReminderPhoto(ctx);
});

bot.on(['video', 'video_note'], async ctx => {
  if (await handleFeedbackMessage(ctx)) return;
  if (await handleAdminBroadcastMessage(ctx)) return;
  await handleReminderVideo(ctx);
});

bot.on(['voice', 'audio', 'document', 'sticker'], async ctx => {
  if (await handleFeedbackMessage(ctx)) return;
  if (await handleAdminBroadcastMessage(ctx)) return;
  await handleUnknownMessage(ctx);
});

bot.on('text', async ctx => {
  if (await handleFeedbackMessage(ctx)) return;
  if (await handleAdminBroadcastMessage(ctx)) return;
  if (await handleQuietHoursCustomInput(ctx)) return;
  if (await handleDeleteAfterInput(ctx)) return;
  if (await handleIntervalInput(ctx)) return;
  if (await handleAdminGetPointerByNumber(ctx)) return;
  const wasHandled = await handleReminderText(ctx);
  if (!wasHandled) {
    await handleUnknownMessage(ctx);
  }
});
