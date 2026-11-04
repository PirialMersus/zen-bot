const RUSSIAN_BUTTONS = {
  POINTER: '🧘‍♀️ Указатели 🧘‍♂️',
  REMINDERS: '⏳ Напоминания',
  SUPPORT: '🛠 Техподдержка',
  TIMEZONE: '🌍 Часовой пояс',
  SETTINGS: '⚙️ Настройки',
  QUIET_ON: '🔕 Не беспокоить ночью',
  QUIET_OFF: '🔔 Получать ночью',
  BACK: '⬅️ Назад',
  LANGUAGE: '🌐 Язык'
};

const ENGLISH_BUTTONS = {
  POINTER: '🧘‍♀️ Pointers 🧘‍♂️',
  REMINDERS: '⏳ Reminders',
  SUPPORT: '🛠 Support',
  TIMEZONE: '🌍 Timezone',
  SETTINGS: '⚙️ Settings',
  QUIET_ON: '🔕 Do not disturb at night',
  QUIET_OFF: '🔔 Receive at night',
  BACK: '⬅️ Back',
  LANGUAGE: '🌐 Language'
};

export const BUTTONS = {
  ...RUSSIAN_BUTTONS,
  ru: RUSSIAN_BUTTONS,
  en: ENGLISH_BUTTONS
};

export const getButtons = (language = 'ru') =>
  language === 'en' ? ENGLISH_BUTTONS : RUSSIAN_BUTTONS;
