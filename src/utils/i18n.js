export const localize = (language, translations) => {
  if (!translations) return '';
  return translations[language] ?? translations.ru ?? Object.values(translations)[0] ?? '';
};
