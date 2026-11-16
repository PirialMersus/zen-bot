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
  if (!process.env.JWT_SECRET) {
    throw new Error('Критическая ошибка конфигурации: переменная JWT_SECRET обязательна');
  }
  if (process.env.JWT_SECRET.length < 32 && process.env.NODE_ENV === 'production') {
    throw new Error(
      'Критическая ошибка конфигурации: переменная JWT_SECRET должна содержать минимум 32 символа'
    );
  }
};
