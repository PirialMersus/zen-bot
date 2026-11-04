import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const currentFileDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectRootDirectoryPath = path.resolve(currentFileDirectoryPath, '..');

const russianPointersFilePath = path.join(projectRootDirectoryPath, 'data', 'pointers.js');
const englishPointersFilePath = path.join(projectRootDirectoryPath, 'data', 'pointers.en.js');

const reindexPointersInFile = async targetFilePath => {
  const originalFileContent = await fs.readFile(targetFilePath, 'utf-8');
  let sequentialPointerIndex = 1;

  const updatedFileContent = originalFileContent.replace(/(^\s*number:\s*)\d+/gm, (_, leadingPrefix) => {
    const formattedReplacement = `${leadingPrefix}${sequentialPointerIndex}`;
    sequentialPointerIndex += 1;
    return formattedReplacement;
  });

  const totalReindexedCount = sequentialPointerIndex - 1;
  await fs.writeFile(targetFilePath, updatedFileContent, 'utf-8');
  return totalReindexedCount;
};

export const executePointersReindexing = async () => {
  const russianPointersCount = await reindexPointersInFile(russianPointersFilePath);
  const englishPointersCount = await reindexPointersInFile(englishPointersFilePath);

  console.log(`Успешно перенумеровано:`);
  console.log(`- RU (${russianPointersFilePath}): ${russianPointersCount} указателей`);
  console.log(`- EN (${englishPointersFilePath}): ${englishPointersCount} указателей`);

  return { russianPointersCount, englishPointersCount };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  executePointersReindexing().catch(executionError => {
    console.error('Ошибка при перенумерации указателей:', executionError);
    process.exit(1);
  });
}
