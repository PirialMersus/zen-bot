// src/keyboard/main.js
import { Markup } from 'telegraf';
import {BUTTONS} from "../constants/buttons.js";

export const mainKeyboard = Markup.keyboard([
  [BUTTONS.REMINDERS, BUTTONS.POINTER],
  [BUTTONS.SETTINGS]
]).resize();
