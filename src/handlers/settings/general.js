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

  const quietStatusLabel = userLanguage === 'en'
    ? (quietSettings.enabled ? 'enabled' : 'disabled')
    : userLanguage === 'uk'
      ? (quietSettings.enabled ? 'увімкнено' : 'вимкнено')
      : (quietSettings.enabled ? 'включены' : 'выключены');

  const languageDisplayName = userLanguage === 'en'
    ? 'English'
    : userLanguage === 'uk'
      ? 'Українська'
      : 'Русский';

  let localizedSettingsText = userLanguage === 'en'
    ? `${texts.MENU.SETTINGS}

🌙 Quiet hours: ${quietStatusLabel}
⏰ ${quietSettings.start}:00–${quietSettings.end}:00

🌍 Timezone:
${timezoneValue}

🌐 Language:
${languageDisplayName}`
    : userLanguage === 'uk'
      ? `${texts.MENU.SETTINGS}

🌙 Тихі години: ${quietStatusLabel}
⏰ ${quietSettings.start}:00–${quietSettings.end}:00

🌍 Часовий пояс:
${timezoneValue}

🌐 Мова:
${languageDisplayName}`
      : `${texts.MENU.SETTINGS}

🌙 Тихие часы: ${quietStatusLabel}
⏰ ${quietSettings.start}:00–${quietSettings.end}:00

🌍 Часовой пояс:
${timezoneValue}

🌐 Язык:
${languageDisplayName}`;

  if (prefixMessage) {
    localizedSettingsText = `${prefixMessage}\n\n${localizedSettingsText}`;
  }

  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(() => {});
    await ctx.deleteMessage().catch(() => {});
  }

  await ctx.reply(localizedSettingsText, settingsKeyboard(quietSettings.enabled, userLanguage));
};

export const handleSettings = async ctx => {
  await renderSettings(ctx);
};
