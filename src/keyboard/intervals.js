// src/keyboard/intervals.js
import { Markup } from 'telegraf';
import {BUTTONS} from "../constants/buttons.js";
import {UI} from "../constants/ui.js";

export const intervalKeyboard = Markup.keyboard([
  [UI.INTERVAL_5, UI.INTERVAL_15],
  [UI.INTERVAL_60, UI.INTERVAL_1440],
  [UI.INTERVAL_CUSTOM],
  [BUTTONS.BACK]
]).resize();
