import { Markup } from 'telegraf';
import { mainKeyboard } from '../keyboard/main.js';
import { resolveUserLanguage } from '../middlewares/activity.js';
import { getTexts } from '../constants/texts.js';
import { REMINDER_STEP } from './reminders.js';
import { renderReminderStep } from './reminders/create.js';
import { suppressExpectedError } from '../utils/logger.js';

export const handleUnknownMessage = async (ctx) => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);
  const incomingMessageText = ctx.message?.text;

  ctx.session ??= {};

  await ctx
    .reply(texts.FALLBACK.UNKNOWN_MESSAGE, mainKeyboard(ctx, userLanguage))
    .catch(suppressExpectedError);

  if (
    incomingMessageText &&
    typeof incomingMessageText === 'string' &&
    !incomingMessageText.startsWith('/')
  ) {
    ctx.session.pendingFallbackReminderText = incomingMessageText;
    const inlineActionKeyboard = Markup.inlineKeyboard([
      [Markup.button.callback(texts.FALLBACK.BUTTON_CREATE_REMINDER, 'fallback:create_reminder')]
    ]);
    await ctx
      .reply(texts.FALLBACK.OFFER_CREATE_REMINDER, inlineActionKeyboard)
      .catch(suppressExpectedError);
  }
};

export const handleFallbackCreateReminder = async (ctx) => {
  await ctx.answerCbQuery().catch(suppressExpectedError);

  const pendingReminderText = ctx.session?.pendingFallbackReminderText;

  ctx.session ??= {};
  ctx.session.isSettingCustomQuietHours = null;

  if (!pendingReminderText) {
    ctx.session.creatingReminder = {
      deleteAfterSeconds: null
    };
    ctx.session.reminderStep = REMINDER_STEP.TEXT;
    await renderReminderStep(ctx);
    return;
  }

  ctx.session.creatingReminder = {
    deleteAfterSeconds: null,
    text: pendingReminderText,
    isRandomPointer: false
  };
  ctx.session.reminderStep = REMINDER_STEP.INTERVAL;
  ctx.session.pendingFallbackReminderText = null;

  await renderReminderStep(ctx);
};
