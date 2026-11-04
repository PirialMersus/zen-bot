import { describe, expect, it } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('Скрипт перенумерации указателей', () => {
  it('должен последовательно перенумеровывать объекты с разрывами в номерах', async () => {
    const temporaryDirectoryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'pointers-test-'));
    const testPointersFilePath = path.join(temporaryDirectoryPath, 'pointers.test.js');

    const samplePointersFileContent = `export default [
  {
    number: 1,
    text: "Первый указатель",
    source: null
  },
  {
    number: 55,
    text: \`Второй указатель с бэктиками\`,
    source: "Источник"
  },
  {
    number: 999,
    text: "Третий указатель",
    source: null
  }
];`;

    await fs.writeFile(testPointersFilePath, samplePointersFileContent, 'utf-8');

    const originalContent = await fs.readFile(testPointersFilePath, 'utf-8');
    let nextIndex = 1;
    const reindexedContent = originalContent.replace(/(^\s*number:\s*)\d+/gm, (_, leadingPrefix) => {
      const replacementText = `${leadingPrefix}${nextIndex}`;
      nextIndex += 1;
      return replacementText;
    });

    await fs.writeFile(testPointersFilePath, reindexedContent, 'utf-8');

    const resultingFileContent = await fs.readFile(testPointersFilePath, 'utf-8');

    expect(resultingFileContent).toContain('number: 1,');
    expect(resultingFileContent).toContain('number: 2,');
    expect(resultingFileContent).toContain('number: 3,');
    expect(resultingFileContent).not.toContain('number: 55,');
    expect(resultingFileContent).not.toContain('number: 999,');
    expect(resultingFileContent).toContain('Второй указатель с бэктиками');

    await fs.rm(temporaryDirectoryPath, { recursive: true, force: true });
  });
});
