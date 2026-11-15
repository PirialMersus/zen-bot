export const getResolvedJwtSecret = () => {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    return 'test-environment-jwt-secret-key-32-chars-minimum';
  }
  throw new Error('Критическая ошибка конфигурации: переменная JWT_SECRET не задана');
};
