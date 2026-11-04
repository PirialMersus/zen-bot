import User from '../../models/User.js';
import Reminder from '../../models/Reminder.js';
import { getQuietEndDate } from '../../services/quietHours.js';
import { settingsKeyboard } from '../../keyboard/settings.js';
import { languageSelectionKeyboard } from '../../keyboard/language.js';
import { mainKeyboard } from '../../keyboard/main.js';
import { getTexts } from '../../constants/texts.js';
import { getTimezoneRegionsKeyboard } from '../../keyboard/timezoneRegions.js';
import { timezoneCitiesKeyboard } from '../../keyboard/timezoneCities.js';
import { resolveUserLanguage } from '../../middlewares/activity.js';

export const handleTimezoneMenu = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  await ctx.answerCbQuery().catch(() => {});
  await ctx.deleteMessage().catch(() => {});

  const promptText = userLanguage === 'en' ? '🌍 Select region:' : '🌍 Выберите регион:';

  await ctx.reply(promptText, getTimezoneRegionsKeyboard(userLanguage));
};

export const handleTimezoneRegion = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const regionKey = ctx.callbackQuery.data.split(':').pop();

  await ctx.answerCbQuery().catch(() => {});
  await ctx.deleteMessage().catch(() => {});

  const promptText = userLanguage === 'en' ? '🌍 Select city:' : '🌍 Выберите город:';

  await ctx.reply(promptText, timezoneCitiesKeyboard(regionKey, userLanguage));
};

export const handleTimezoneSet = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const timezoneValue = ctx.callbackQuery.data.split(':').pop();

  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    { timezone: timezoneValue },
    { upsert: true }
  );

  await ctx.answerCbQuery().catch(() => {});

  try {
    await ctx.deleteMessage();
  } catch {}

  const confirmationText = userLanguage === 'en'
    ? `✅ Timezone set:\n🌍 ${timezoneValue}`
    : `✅ Часовой пояс установлен:\n🌍 ${timezoneValue}`;

  await ctx.reply(confirmationText);
};

export const handleLanguageMenu = async ctx => {
  const userLanguage = await resolveUserLanguage(ctx);
  const texts = getTexts(userLanguage);

  await ctx.answerCbQuery().catch(() => {});
  try {
    await ctx.deleteMessage();
  } catch {}

  await ctx.reply(texts.SETTINGS.LANGUAGE_TITLE, languageSelectionKeyboard(userLanguage));
};

export const handleLanguageSet = async ctx => {
  const rawSelectedLanguage = ctx.callbackQuery.data.split(':').pop();
  const selectedLanguage = rawSelectedLanguage === 'en' ? 'en' : 'ru';

  await User.updateOne(
    { telegramId: ctx.from.id },
    {
      $set: {
        language: selectedLanguage,
        shuffleIndex: 0,
        shuffleQueue: []
      }
    },
    { upsert: true }
  );

  ctx.state = ctx.state || {};
  ctx.state.userLanguage = selectedLanguage;

  await ctx.answerCbQuery().catch(() => {});

  try {
    await ctx.deleteMessage();
  } catch {}

  const texts = getTexts(selectedLanguage);
  await ctx.reply(texts.SETTINGS.LANGUAGE_CHANGED, mainKeyboard(ctx, selectedLanguage));
};

const renderSettings = async ctx => {
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
    : (quietSettings.enabled ? 'включены' : 'выключены');

  const languageDisplayName = userLanguage === 'en' ? 'English' : 'Русский';

  const localizedSettingsText = userLanguage === 'en'
    ? `${texts.MENU.SETTINGS}

🌙 Quiet hours: ${quietStatusLabel}
⏰ ${quietSettings.start}:00–${quietSettings.end}:00

🌍 Timezone:
${timezoneValue}

🌐 Language:
${languageDisplayName}`
    : `${texts.MENU.SETTINGS}

🌙 Тихие часы: ${quietStatusLabel}
⏰ ${quietSettings.start}:00–${quietSettings.end}:00

🌍 Часовой пояс:
${timezoneValue}

🌐 Язык:
${languageDisplayName}`;

  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(() => {});
    await ctx.deleteMessage().catch(() => {});
  }

  await ctx.reply(localizedSettingsText, settingsKeyboard(quietSettings.enabled, userLanguage));
};

export const handleSettings = async ctx => {
  await renderSettings(ctx);
};

export const handleQuietToggle = async ctx => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  const nextQuietState = !user?.quietHours?.enabled;

  await User.findOneAndUpdate(
    { telegramId: ctx.from.id },
    { 'quietHours.enabled': nextQuietState },
    { upsert: true }
  );

  if (!nextQuietState && user) {
    const currentMoment = new Date();
    const previousQuietUser = {
      ...user.toObject(),
      quietHours: {
        ...user.quietHours,
        enabled: true
      }
    };
    const quietEndDate = getQuietEndDate(previousQuietUser, currentMoment);

    if (quietEndDate > currentMoment) {
      await Reminder.updateMany(
        {
          userId: String(ctx.from.id),
          isActive: true,
          nextRunAt: { $gt: currentMoment, $lte: quietEndDate }
        },
        {
          $set: { nextRunAt: currentMoment }
        }
      );
    }
  }

  await renderSettings(ctx);
};
