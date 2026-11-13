import User from '../../models/User.js';
import { settingsKeyboard } from '../../keyboard/settings.js';
import { getTexts } from '../../constants/texts.js';
import { DEFAULT_TIMEZONE } from '../../constants/timezones.js';
import { resolveUserLanguage } from '../../middlewares/activity.js';

export const renderSettings = async (ctx, prefixMessage = '') => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);

  const user = await User.findOne({ telegramId: ctx.from.id }) ?? {
    quietHours: { enabled: true, start: 23, end: 8 },
    timezone: DEFAULT_TIMEZONE,
    language: userLanguage
  };

  const quietSettings = user.quietHours;
  const timezoneValue = user.timezone || DEFAULT_TIMEZONE;

  const localizedSettingsPrompt = `⚙️ ${texts.MENU.SETTINGS}\n\n${texts.SETTINGS.CUSTOMIZE_PROMPT}`;

  let localizedSettingsText = localizedSettingsPrompt;

  if (prefixMessage) {
    localizedSettingsText = `${prefixMessage}\n\n${localizedSettingsPrompt}`;
  }

  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(() => {});
    await ctx.deleteMessage().catch(() => {});
  }

  await ctx.reply(
    localizedSettingsText,
    settingsKeyboard(quietSettings.enabled, userLanguage, {
      quietHours: quietSettings,
      timezone: timezoneValue
    })
  );
};

export const handleSettings = async ctx => {
  ctx.session ??= {};
  ctx.session.reminderStep = null;
  ctx.session.creatingReminder = null;
  ctx.session.isSettingCustomQuietHours = null;
  await renderSettings(ctx);
};
