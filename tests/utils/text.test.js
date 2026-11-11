import { describe, expect, it } from 'vitest';
import { escapeHtml } from '../../src/utils/escapeHtml.js';
import { previewText } from '../../src/utils/text.js';

describe('Утилиты экранирования и форматирования текста', () => {
  it('должен корректно экранировать HTML спецсимволы', () => {
    expect(escapeHtml('<b>Иван & Марья</b>')).toBe('&lt;b&gt;Иван &amp; Марья&lt;/b&gt;');
    expect(escapeHtml('"test" and \'quote\'')).toBe('&quot;test&quot; and &#39;quote&#39;');
    expect(escapeHtml('<script>alert("hack")</script>')).toBe('&lt;script&gt;alert(&quot;hack&quot;)&lt;/script&gt;');
  });

  it('должен безопасно обрабатывать null, undefined и числа в escapeHtml', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(12345)).toBe('12345');
  });

  it('должен сокращать длинные строки до указанного лимита в previewText', () => {
    const longString = 'Это очень длинная строка с текстом, которая превышает лимит длины';
    const previewResult = previewText(longString, 20);
    expect(previewResult.length).toBeLessThanOrEqual(21);
    expect(previewResult.endsWith('…')).toBe(true);
  });

  it('не должен сокращать короткие строки в previewText', () => {
    const shortString = 'Короткий текст';
    expect(previewText(shortString, 50)).toBe('Короткий текст');
  });

  it('должен нормализовать пробельные символы в previewText', () => {
    const multilineWhitespaceString = 'Текст   с    пробелами\n\nи переводами';
    expect(previewText(multilineWhitespaceString, 100)).toBe('Текст с пробелами и переводами');
  });
});
