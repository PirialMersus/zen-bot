export const getResolvedJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('Критическая ошибка конфигурации: переменная JWT_SECRET не задана');
  }
  return process.env.JWT_SECRET;
};
