// src/constants/texts.js
export const TEXTS = {
  MENU: {
    START: `👋Привет!

я - бот для выработки новых привычек  
я буду напоминать о важности каких-то вещей в жизни  

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
    ASK_CUSTOM_INTERVAL: 'Введи количество минут',
    MIN_INTERVAL: 'Минимум — 1 минута',
    CONFIRM_STATUS: 'Вы точно хотите изменить статус напоминания?'
  },

  STATUS: {
    ACTIVE: '🟢 Активно',
    PAUSED: '⏸ Пауза'
  },

  SETTINGS: {
    QUIET_STATUS: (enabled, range) =>
      enabled
        ? `🔕 Включены (${range})`
        : `🔔 Выключены (${range})`
  },

  SUPPORT: 'Поддержка и обратная связь:\n👉 @pirial_mersus'
};
