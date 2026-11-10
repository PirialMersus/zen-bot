import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const currentFileDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectRootDirectoryPath = path.resolve(currentFileDirectoryPath, '..');

const russianPointersFilePath = path.join(projectRootDirectoryPath, 'data', 'pointers.ru.js');
const englishPointersFilePath = path.join(projectRootDirectoryPath, 'data', 'pointers.en.js');
const ukrainianPointersFilePath = path.join(projectRootDirectoryPath, 'data', 'pointers.uk.js');
const spanishPointersFilePath = path.join(projectRootDirectoryPath, 'data', 'pointers.es.js');

export const reindexPointersInFile = async targetFilePath => {
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

const formatLanguageSynchronizationStatus = (languageCode, targetLanguageCount, referenceRussianCount) => {
  if (targetLanguageCount === referenceRussianCount) {
    return `  - ${languageCode}: ${targetLanguageCount} указателей (полностью синхронизирован с RU)`;
  }
  if (targetLanguageCount < referenceRussianCount) {
    const missingPointersDifference = referenceRussianCount - targetLanguageCount;
    const startMissingRangeNumber = targetLanguageCount + 1;
    const endMissingRangeNumber = referenceRussianCount;
    return `  - ${languageCode}: ${targetLanguageCount} указателей [ВНИМАНИЕ: не хватает ${missingPointersDifference} переводов, диапазон №${startMissingRangeNumber} - №${endMissingRangeNumber}]`;
  }
  const surplusPointersDifference = targetLanguageCount - referenceRussianCount;
  return `  - ${languageCode}: ${targetLanguageCount} указателей [ВНИМАНИЕ: больше эталона RU на ${surplusPointersDifference}]`;
};

export const executePointersReindexing = async () => {
  const russianPointersCount = await reindexPointersInFile(russianPointersFilePath);
  const englishPointersCount = await reindexPointersInFile(englishPointersFilePath);
  const ukrainianPointersCount = await reindexPointersInFile(ukrainianPointersFilePath);
  const spanishPointersCount = await reindexPointersInFile(spanishPointersFilePath);

  console.log(`=======================================================`);
  console.log(`ОТЧЕТ ПЕРЕНУМЕРАЦИИ И СИНХРОНИЗАЦИИ УКАЗАТЕЛЕЙ`);
  console.log(`=======================================================`);
  console.log(`Эталонная база (RU): ${russianPointersCount} указателей`);
  console.log(`Статус языковых переводов:`);
  console.log(formatLanguageSynchronizationStatus('EN', englishPointersCount, russianPointersCount));
  console.log(formatLanguageSynchronizationStatus('UK', ukrainianPointersCount, russianPointersCount));
  console.log(formatLanguageSynchronizationStatus('ES', spanishPointersCount, russianPointersCount));
  console.log(`=======================================================`);

  const allLanguagesAreFullySynchronized =
    russianPointersCount === englishPointersCount &&
    russianPointersCount === ukrainianPointersCount &&
    russianPointersCount === spanishPointersCount;

  if (allLanguagesAreFullySynchronized) {
    console.log(`Статус: ВСЕ ЯЗЫКИ ПОЛНОСТЬЮ СИНХРОНИЗИРОВАНЫ (${russianPointersCount} указателей).`);
  } else {
    console.log(`ВНИМАНИЕ: Требуется синхронизация переводов перед обновлением базы данных!`);
  }
  console.log(`=======================================================`);

  return { russianPointersCount, englishPointersCount, ukrainianPointersCount, spanishPointersCount };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  executePointersReindexing().catch(executionError => {
    console.error('Ошибка при перенумерации указателей:', executionError);
    process.exit(1);
  });
}
