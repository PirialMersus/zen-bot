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
  handleFeedbackCancel,
  handleFeedbackMessage,
  handleFeedbackStart
} from './handlers/admin.js';
import { handleGetAuthCode } from './handlers/auth.js';
import { handleBack, handleCancel } from './handlers/back.js';
import { handleStart, handleHelp } from './handlers/menu.js';
import { handleUnknownMessage, handleFallbackCreateReminder } from './handlers/fallback.js';
import {
  handleNextPointer,
  handlePrevPointer,
  handlePointersMenu,
  handleRandomPointer,
  handleFavoritePointer,
  handleFavoriteInfo,
  handleExpireInfo,
  handleToggleFavoritePointer,
  handlePointerToReminder,
  handlePointerToMenu,
  handleKeepPointer,
  handleSearchPointers,
  handleSearchMorePointers,
  handleSearchQueryInput,
  handleCancelSearch
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
  handleReminderListCallback,
  handleKeepReminder
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
import { mainKeyboard } from './keyboard/main.js';
import { getSupportInlineKeyboard } from './keyboard/support.js';
import { activityMiddleware, resolveUserLanguage } from './middlewares/activity.js';
import { createMongoSessionStore } from './storage/sessionStore.js';
import { suppressExpectedError } from './utils/logger.js';
import { cleanupUser } from './services/cleanupUser.js';

export const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(session({ store: createMongoSessionStore() }));
bot.use(activityMiddleware);

bot.catch((err, ctx) => {
  console.error('BOT_ERROR', err?.message, err?.stack, {
    from: ctx?.from?.id,
    chat: ctx?.chat?.id,
    updateType: ctx?.updateType
  });
});

bot.start(handleStart);
bot.help(handleHelp);

export const registerBotCommands = async (targetBot) => {
  if (!targetBot?.telegram?.setMyCommands) return;
  try {
    await targetBot.telegram.setMyCommands([
      { command: 'start', description: 'Запустить бота / Главное меню' },
      { command: 'help', description: 'Справка и возможности' },
      { command: 'find', description: 'Поиск указателей по автору или фразе' }
    ]);
    await targetBot.telegram.setMyCommands(
      [
        { command: 'start', description: 'Start the bot / Main menu' },
        { command: 'help', description: 'Help and features' },
        { command: 'find', description: 'Search pointers by author or phrase' }
      ],
      { language_code: 'en' }
    );
    await targetBot.telegram.setMyCommands(
      [
        { command: 'start', description: 'Запустити бота / Головне меню' },
        { command: 'help', description: 'Довідка та можливості' },
        { command: 'find', description: 'Пошук вказівників за автором або фразою' }
      ],
      { language_code: 'uk' }
    );
    await targetBot.telegram.setMyCommands(
      [
        { command: 'start', description: 'Iniciar el bot / Menú principal' },
        { command: 'help', description: 'Ayuda y características' },
        { command: 'find', description: 'Buscar punteros por autor o frase' }
      ],
      { language_code: 'es' }
    );
  } catch (commandRegistrationError) {
    console.error(
      'SET_COMMANDS_ERROR',
      commandRegistrationError?.message || commandRegistrationError
    );
  }
};

bot.command('getcode', handleGetAuthCode);
bot.action('get_auth_code', handleGetAuthCode);

bot.action('fallback:create_reminder', handleFallbackCreateReminder);
bot.action(/^pointer:prev/, handlePrevPointer);
bot.action(/^pointer:next/, handleNextPointer);
bot.action('pointer:to_reminder', handlePointerToReminder);
bot.action(/^pointer:fav_toggle/, handleToggleFavoritePointer);
bot.action('pointer:fav_info', handleFavoriteInfo);
bot.action('pointer:to_menu', handlePointerToMenu);
bot.action('pointer:expire_info', handleExpireInfo);
bot.action(/^pointer:keep/, handleKeepPointer);
bot.action(/^reminder:keep/, handleKeepReminder);

bot.hears(getButtonVariants('POINTER'), handlePointersMenu);
bot.hears(getUiVariants('POINTER_RANDOM'), handleRandomPointer);
bot.hears(getUiVariants('POINTER_FAVORITE'), handleFavoritePointer);
bot.hears(getButtonVariants('REMINDERS'), handleReminders);
bot.hears(getButtonVariants('SETTINGS'), handleSettings);

bot.hears(getUiVariants('REMINDER_CREATE'), handleCreateReminder);
bot.hears(getUiVariants('REMINDER_MY'), handleMyReminders);

bot.hears(getUiVariants('INTERVAL_5'), (ctx) => handleIntervalPreset(ctx, 5));
bot.hears(getUiVariants('INTERVAL_15'), (ctx) => handleIntervalPreset(ctx, 15));
bot.hears(getUiVariants('INTERVAL_60'), (ctx) => handleIntervalPreset(ctx, 60));
bot.hears(getUiVariants('INTERVAL_1440'), (ctx) => handleIntervalPreset(ctx, 1440));

bot.action(/^pause:/, (ctx) => handleRequestAction(ctx, 'pause'));
bot.action(/^resume:/, (ctx) => handleRequestAction(ctx, 'resume'));
bot.action(/^delete:/, (ctx) => handleRequestAction(ctx, 'delete'));

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

bot.action('settings:back', async (ctx) => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  await ctx.answerCbQuery().catch(suppressExpectedError);
  await ctx.deleteMessage().catch(suppressExpectedError);
  await ctx.reply(texts.MENU.MAIN, mainKeyboard(ctx, userLanguage)).catch(suppressExpectedError);
});

bot.command('cancel', handleCancel);
bot.hears([...getButtonVariants('BACK'), ...getUiVariants('POINTER_TO_MENU')], handleBack);
bot.hears(getButtonVariants('CANCEL'), handleCancel);
bot.hears(getUiVariants('POINTER_PREV'), handlePrevPointer);
bot.hears(getUiVariants('POINTER_NEXT'), handleNextPointer);
bot.hears(getUiVariants('POINTER_TO_REMINDER'), handlePointerToReminder);
bot.hears(getUiVariants('ADMIN_ACTIVE_USERS'), handleAdminActiveUsers);
bot.hears(getUiVariants('ADMIN_BROADCAST'), handleAdminBroadcastStart);

bot.command(['pointer', 'p'], handleAdminGetPointerByNumber);
bot.hears(
  /^(?:получить\s+)?(?:pointer|указатель|вказівник|puntero)(?:\s+(?:en|ru|uk|es))?\s+\d+$/i,
  handleAdminGetPointerByNumber
);
bot.hears(/^\/p(?:ointer)?(?:_(?:en|ru|uk|es))?\s+\d+$/i, handleAdminGetPointerByNumber);

bot.command(['find', 'f'], handleSearchPointers);
bot.hears(/^\/(?:find|f)(?:_(?:en|ru|uk|es))?(?:\s+.*)?$/i, handleSearchPointers);
bot.action('search:more', handleSearchMorePointers);
bot.action('search:cancel', handleCancelSearch);

bot.hears(getButtonVariants('SUPPORT'), async (ctx) => {
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

bot.hears(allowedIntervalOptions, async (ctx) => {
  const incomingMessageText = ctx.message.text;

  if (isDoNotDeleteText(incomingMessageText)) {
    await handleDeleteAfterPreset(ctx, null);
    return;
  }

  await handleDeleteAfterPreset(ctx, COMBINED_AUTO_DELETE_MAP[incomingMessageText]);
});

bot.on('my_chat_member', async (ctx) => {
  const newChatMemberStatus = ctx.myChatMember?.new_chat_member?.status;
  const targetTelegramUserId = ctx.from?.id || ctx.myChatMember?.chat?.id;
  if (newChatMemberStatus === 'kicked' && targetTelegramUserId) {
    await cleanupUser(targetTelegramUserId).catch((cleanupError) => {
      console.error('CHAT_MEMBER_CLEANUP_USER_ERROR', cleanupError?.message || cleanupError);
    });
  }
});

bot.on('photo', async (ctx) => {
  if (await handleFeedbackMessage(ctx)) return;
  if (await handleAdminBroadcastMessage(ctx)) return;
  await handleReminderPhoto(ctx);
});

bot.on(['video', 'video_note'], async (ctx) => {
  if (await handleFeedbackMessage(ctx)) return;
  if (await handleAdminBroadcastMessage(ctx)) return;
  await handleReminderVideo(ctx);
});

bot.on(['voice', 'audio', 'document', 'sticker'], async (ctx) => {
  if (await handleFeedbackMessage(ctx)) return;
  if (await handleAdminBroadcastMessage(ctx)) return;
  await handleUnknownMessage(ctx);
});

bot.on('text', async (ctx) => {
  if (await handleFeedbackMessage(ctx)) return;
  if (await handleAdminBroadcastMessage(ctx)) return;
  if (await handleQuietHoursCustomInput(ctx)) return;
  if (await handleDeleteAfterInput(ctx)) return;
  if (await handleIntervalInput(ctx)) return;
  if (await handleAdminGetPointerByNumber(ctx)) return;
  if (await handleSearchQueryInput(ctx)) return;
  const wasHandled = await handleReminderText(ctx);
  if (!wasHandled) {
    await handleUnknownMessage(ctx);
  }
});
