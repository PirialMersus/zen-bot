// src/keyboard/main.js
import {Markup} from 'telegraf';
import {BUTTONS} from "../constants/buttons.js";
import {UI} from "../constants/ui.js";

export const mainKeyboard = ctx => {
  const isAdmin = String(ctx.from.id) === process.env.CREATOR_ID;

  const rows = [
    [BUTTONS.REMINDERS, BUTTONS.POINTER]
  ];

  if (isAdmin) {
    rows.push([BUTTONS.SETTINGS, UI.ADMIN_USERS_30D]);
  } else {
    rows.push([BUTTONS.SETTINGS]);
  }

  return Markup.keyboard(rows).resize();
};
