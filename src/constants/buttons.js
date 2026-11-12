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

const UKRAINIAN_BUTTONS = {
  POINTER: '🧘‍♀️ Вказівники 🧘‍♂️',
  REMINDERS: '⏳ Нагадування',
  SUPPORT: '🛠 Техпідтримка',
  TIMEZONE: '🌍 Часовий пояс',
  SETTINGS: '⚙️ Налаштування',
  QUIET_ON: '🔕 Не турбувати вночі',
  QUIET_OFF: '🔔 Отримувати вночі',
  BACK: '⬅️ Назад',
  LANGUAGE: '🌐 Мова'
};

const SPANISH_BUTTONS = {
  POINTER: '🧘‍♀️ Punteros 🧘‍♂️',
  REMINDERS: '⏳ Recordatorios',
  SUPPORT: '🛠 Soporte',
  TIMEZONE: '🌍 Zona horaria',
  SETTINGS: '⚙️ Ajustes',
  QUIET_ON: '🔕 No molestar de noche',
  QUIET_OFF: '🔔 Recibir de noche',
  BACK: '⬅️ Atrás',
  LANGUAGE: '🌐 Idioma'
};

export const BUTTONS = {
  ...RUSSIAN_BUTTONS,
  ru: RUSSIAN_BUTTONS,
  en: ENGLISH_BUTTONS,
  uk: UKRAINIAN_BUTTONS,
  es: SPANISH_BUTTONS
};

export const getButtons = (language = 'ru') => {
  if (language === 'en') return ENGLISH_BUTTONS;
  if (language === 'uk') return UKRAINIAN_BUTTONS;
  if (language === 'es') return SPANISH_BUTTONS;
  return RUSSIAN_BUTTONS;
};

export const getButtonVariants = buttonKey => [
  BUTTONS.ru[buttonKey],
  BUTTONS.en[buttonKey],
  BUTTONS.uk[buttonKey],
  BUTTONS.es[buttonKey]
].filter(Boolean);
