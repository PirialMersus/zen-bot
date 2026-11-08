import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const currentFileDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectRootDirectoryPath = path.resolve(currentFileDirectoryPath, '..');

const russianPointersFilePath = path.join(projectRootDirectoryPath, 'data', 'pointers.ru.js');
const englishPointersFilePath = path.join(projectRootDirectoryPath, 'data', 'pointers.en.js');
const ukrainianPointersFilePath = path.join(projectRootDirectoryPath, 'data', 'pointers.uk.js');

const reindexPointersInFile = async targetFilePath => {
  const fileExists = await fs.access(targetFilePath).then(() => true).catch(() => false);
  if (!fileExists) return 0;
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
  const ukrainianPointersCount = await reindexPointersInFile(ukrainianPointersFilePath);

  console.log(`Успешно перенумеровано:`);
  console.log(`- RU (${russianPointersFilePath}): ${russianPointersCount} указателей`);
  console.log(`- EN (${englishPointersFilePath}): ${englishPointersCount} указателей`);
  console.log(`- UK (${ukrainianPointersFilePath}): ${ukrainianPointersCount} указателей`);

  return { russianPointersCount, englishPointersCount, ukrainianPointersCount };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  executePointersReindexing().catch(executionError => {
    console.error('Ошибка при перенумерации указателей:', executionError);
    process.exit(1);
  });
}
