export const previewText = (rawText, maximumLength = 40) => {
  if (!rawText || typeof rawText !== 'string') {
    return '';
  }
  const normalizedText = rawText.replace(/\s+/g, ' ').trim();
  return normalizedText.length > maximumLength
    ? `${normalizedText.slice(0, maximumLength)}…`
    : normalizedText;
};
