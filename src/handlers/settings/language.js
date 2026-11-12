import User from '../../models/User.js';
import { languageSelectionKeyboard } from '../../keyboard/language.js';
import { mainKeyboard } from '../../keyboard/main.js';
import { getTexts } from '../../constants/texts.js';
import { resolveUserLanguage, invalidateUserCache } from '../../middlewares/activity.js';

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
  const selectedLanguage = ['en', 'uk', 'es'].includes(rawSelectedLanguage) ? rawSelectedLanguage : 'ru';

  await User.updateOne(
    { telegramId: ctx.from.id },
    {
      $set: {
        language: selectedLanguage
      }
    },
    { upsert: true }
  );

  ctx.state = ctx.state || {};
  ctx.state.userLanguage = selectedLanguage;
  invalidateUserCache(ctx.from.id);

  await ctx.answerCbQuery().catch(() => {});

  try {
    await ctx.deleteMessage();
  } catch {}

  const texts = getTexts(selectedLanguage);
  await ctx.reply(texts.SETTINGS.LANGUAGE_CHANGED, mainKeyboard(ctx, selectedLanguage));
};
