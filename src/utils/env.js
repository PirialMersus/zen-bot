export const validateApplicationEnvironment = () => {
  if (!process.env.BOT_TOKEN) {
    throw new Error('Критическая ошибка конфигурации: переменная BOT_TOKEN обязательна');
  }
  if (!process.env.MONGO_URI) {
    throw new Error('Критическая ошибка конфигурации: переменная MONGO_URI обязательна');
  }
  if (!process.env.CREATOR_ID) {
    throw new Error('Критическая ошибка конфигурации: переменная CREATOR_ID обязательна');
  }
};
