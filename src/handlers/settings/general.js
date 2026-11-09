import User from '../../models/User.js';
import { settingsKeyboard } from '../../keyboard/settings.js';
import { getTexts } from '../../constants/texts.js';
import { resolveUserLanguage } from '../../middlewares/activity.js';

export const renderSettings = async (ctx, prefixMessage = '') => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);

  const user = await User.findOne({ telegramId: ctx.from.id }) ?? {
    quietHours: { enabled: true, start: 23, end: 8 },
    timezone: 'Europe/Minsk',
    language: userLanguage
  };

  const quietSettings = user.quietHours;
  const timezoneValue = user.timezone || 'Europe/Minsk';

  const localizedSettingsPrompt = userLanguage === 'en'
    ? `⚙️ ${texts.MENU.SETTINGS}\n\nTap an option below to customize:`
    : userLanguage === 'uk'
      ? `⚙️ ${texts.MENU.SETTINGS}\n\nОберіть потрібний пункт для зміни:`
      : userLanguage === 'es'
        ? `⚙️ ${texts.MENU.SETTINGS}\n\nToca una opción abajo para personalizar:`
        : `⚙️ ${texts.MENU.SETTINGS}\n\nНажмите на нужный пункт для изменения:`;

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
  await renderSettings(ctx);
};
