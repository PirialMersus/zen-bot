import { describe, expect, it } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('Скрипт удаления указателя', () => {
  it('должен удалять блок указателя по номеру и перенумеровывать оставшиеся записи', async () => {
    const temporaryDirectoryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'remove-pointer-test-'));
    const testFilePath = path.join(temporaryDirectoryPath, 'pointers.test.js');

    const sampleFileContent = `export default [
  {
    number: 1,
    text: "Первый указатель",
    source: null
  },
  {
    number: 2,
    text: "Второй указатель (дубль для удаления)",
    source: "Источник"
  },
  {
    number: 3,
    text: "Третий указатель",
    source: null
  }
];`;

    await fs.writeFile(testFilePath, sampleFileContent, 'utf-8');

    const originalContent = await fs.readFile(testFilePath, 'utf-8');
    const targetPointerNumber = 2;
    const pointerBlockRegex = new RegExp(
      `(\\n\\s*\\{\\s*\\n\\s*number:\\s*${targetPointerNumber},[\\s\\S]*?\\n\\s*\\},?)`,
      'm'
    );

    expect(pointerBlockRegex.test(originalContent)).toBe(true);

    const contentWithoutDeletedPointer = originalContent.replace(pointerBlockRegex, '');
    let sequentialIndex = 1;
    const reindexedContent = contentWithoutDeletedPointer.replace(/(^\s*number:\s*)\d+/gm, (_, leadingPrefix) => {
      const replacementText = `${leadingPrefix}${sequentialIndex}`;
      sequentialIndex += 1;
      return replacementText;
    });

    await fs.writeFile(testFilePath, reindexedContent, 'utf-8');

    const finalContent = await fs.readFile(testFilePath, 'utf-8');

    expect(finalContent).toContain('number: 1,');
    expect(finalContent).toContain('number: 2,');
    expect(finalContent).not.toContain('number: 3,');
    expect(finalContent).not.toContain('Второй указатель (дубль для удаления)');
    expect(finalContent).toContain('Третий указатель');

    await fs.rm(temporaryDirectoryPath, { recursive: true, force: true });
  });
});
