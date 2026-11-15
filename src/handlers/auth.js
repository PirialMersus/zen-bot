import { Markup } from 'telegraf';
import User from '../models/User.js';
import { generateAuthCode } from '../utils/auth.js';
import { getTexts } from '../constants/texts.js';
import { resolveUserLanguage } from '../middlewares/activity.js';
import { logError } from '../utils/logger.js';

export const handleGetAuthCode = async (ctx) => {
  const userLanguage = await resolveUserLanguage(ctx);
  const localizedTexts = getTexts(userLanguage);

  try {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery().catch(() => {});
    }

    const userRecord = await User.findOne({ telegramId: ctx.from.id });

    if (!userRecord) {
      await ctx.reply(localizedTexts.AUTH.USER_NOT_FOUND);
      return;
    }

    const generatedAuthenticationCode = generateAuthCode();

    userRecord.authCode = generatedAuthenticationCode;
    userRecord.authCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await userRecord.save();

    await ctx.reply(
      localizedTexts.AUTH.CODE_MESSAGE(generatedAuthenticationCode),
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(localizedTexts.AUTH.GET_NEW_CODE_BUTTON, 'get_auth_code')]
        ])
      }
    );
  } catch (caughtError) {
    logError(caughtError, { context: 'HANDLE_GET_AUTH_CODE', telegramId: ctx.from?.id });
    await ctx.reply(localizedTexts.AUTH.GENERIC_ERROR);
  }
};
