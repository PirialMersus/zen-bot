const RUSSIAN_TEXTS = {
  MENU: {
    START: `👋 Привет!

я - бот для выработки новых привычек
я буду напоминать о том, что важно

🧘‍♀️ случайная фраза — по кнопке в любой момент
⏳ своё напоминание — текст, 📷 фото или 🎬 видео с любой частотой

🐈️ Зайди в настройки и выбери свой часовой пояс
`,
    MAIN: 'Главное меню',
    SETTINGS: 'Настройки:',
    REMINDERS: 'Управление напоминаниями 👇'
  },

  POINTERS: {
    EMPTY: 'Пока нет указателей.'
  },

  REMINDERS: {
    NONE: 'У тебя нет напоминаний.',
    CREATED: 'Готово. Напоминание создано.',
    ASK_TEXT: 'Что будет приходить в напоминании?',
    ASK_INTERVAL: 'Как часто напоминать:',
    ASK_INTERVAL_HINT: '⌨️ Можно выбрать кнопкой или ввести количество минут цифрами',
    ASK_DELETE_AFTER: '🗑 Автоудаление напоминания',
    ASK_DELETE_AFTER_HINT: '⌨️ Можно выбрать кнопкой или ввести количество секунд цифрами',
    MIN_INTERVAL: 'Минимум — 1 минута',
    INVALID_SECONDS: '⌨️ Введите количество секунд цифрами',
    CONFIRM_STATUS: 'Вы точно хотите изменить статус напоминания?'
  },

  STATUS: {
    ACTIVE: '🟢 Активно',
    PAUSED: '⏸ Пауза'
  },

  SETTINGS: {
    LANGUAGE_TITLE: '🌐 Выберите язык / Select language:',
    LANGUAGE_CHANGED: '✅ Язык изменён на Русский',
    QUIET_STATUS: (enabled, range) =>
      enabled
        ? `🔕 Включены (${range})`
        : `🔔 Выключены (${range})`
  },

  SUPPORT: `Техподдержка, обратная связь и пожелания:
👉 @pirial_mersus

Группа в Telegram: @dzenline

Если захотите поблагодарить за бота или поддержать проект — напишите @Streamline6 ❤️`,

  INTERVALS: {
    OPTIONS: ['10 сек', '30 сек', '1 мин', 'Не удалять'],
    MAP: { '10 сек': 10, '30 сек': 30, '1 мин': 60 }
  }
};

const ENGLISH_TEXTS = {
  MENU: {
    START: `👋 Hello!

I am a bot for building new habits
I will remind you about what truly matters

🧘‍♀️ random pointer — anytime at the click of a button
⏳ custom reminder — text, 📷 photo, or 🎬 video at any frequency

🐈️ Go to settings and choose your timezone
`,
    MAIN: 'Main menu',
    SETTINGS: 'Settings:',
    REMINDERS: 'Manage reminders 👇'
  },

  POINTERS: {
    EMPTY: 'No pointers yet.'
  },

  REMINDERS: {
    NONE: 'You have no reminders.',
    CREATED: 'Done. Reminder created.',
    ASK_TEXT: 'What should the reminder say?',
    ASK_INTERVAL: 'How often to remind:',
    ASK_INTERVAL_HINT: '⌨️ You can select with a button or type the number of minutes',
    ASK_DELETE_AFTER: '🗑 Auto-delete reminder',
    ASK_DELETE_AFTER_HINT: '⌨️ You can select with a button or type the number of seconds',
    MIN_INTERVAL: 'Minimum — 1 minute',
    INVALID_SECONDS: '⌨️ Enter the number of seconds as digits',
    CONFIRM_STATUS: 'Are you sure you want to change the reminder status?'
  },

  STATUS: {
    ACTIVE: '🟢 Active',
    PAUSED: '⏸ Paused'
  },

  SETTINGS: {
    LANGUAGE_TITLE: '🌐 Выберите язык / Select language:',
    LANGUAGE_CHANGED: '✅ Language switched to English',
    QUIET_STATUS: (enabled, range) =>
      enabled
        ? `🔕 Enabled (${range})`
        : `🔔 Disabled (${range})`
  },

  SUPPORT: `Support, feedback & suggestions:
👉 @pirial_mersus

Telegram community: @dzenline

If you would like to support the project or say thanks — message @Streamline6 ❤️`,

  INTERVALS: {
    OPTIONS: ['10 sec', '30 sec', '1 min', 'Do not delete'],
    MAP: { '10 sec': 10, '30 sec': 30, '1 min': 60 }
  }
};

export const TEXTS = {
  ...RUSSIAN_TEXTS,
  ru: RUSSIAN_TEXTS,
  en: ENGLISH_TEXTS
};

export const getTexts = (language = 'ru') =>
  language === 'en' ? ENGLISH_TEXTS : RUSSIAN_TEXTS;
