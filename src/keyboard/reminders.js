// src/keyboard/reminders.js
import { Markup } from 'telegraf';
import {BUTTONS} from "../constants/buttons.js";
import {UI} from "../constants/ui.js";

export const remindersKeyboard = Markup.keyboard([
  [UI.REMINDER_CREATE, UI.REMINDER_MY],
  [BUTTONS.BACK]
]).resize();
