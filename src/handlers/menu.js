// src/handlers/menu.js
import { TEXTS } from '../constants/texts.js';
import { mainKeyboard } from '../keyboard/main.js';
import { handleGetAuthCode } from './auth.js';

export const handleStart = async ctx => {
  // Check if user came from mobile app to get auth code
  const startPayload = ctx.startPayload;

  if (startPayload === 'getcode') {
    // User came from mobile app - auto-send auth code
    await handleGetAuthCode(ctx);
    return;
  }

  await ctx.reply(TEXTS.MENU.START, mainKeyboard(ctx));
};
