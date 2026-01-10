// src/handlers/menu.js
import {mainKeyboard} from '../keyboard/main.js';
import {TEXTS} from "../constants/texts.js";

export const handleStart = async ctx => {
  await ctx.reply(TEXTS.MENU.START, mainKeyboard
  );
};
