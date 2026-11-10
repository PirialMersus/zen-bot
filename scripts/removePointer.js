import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { executePointersReindexing } from './reindexPointers.js';

const currentFileDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectRootDirectoryPath = path.resolve(currentFileDirectoryPath, '..');

const targetLanguageFilePaths = {
  RU: path.join(projectRootDirectoryPath, 'data', 'pointers.ru.js'),
  EN: path.join(projectRootDirectoryPath, 'data', 'pointers.en.js'),
  UK: path.join(projectRootDirectoryPath, 'data', 'pointers.uk.js'),
  ES: path.join(projectRootDirectoryPath, 'data', 'pointers.es.js')
};

const extractPointerBlockFromContent = (fileContent, targetPointerNumber) => {
  const pointerBlockRegex = new RegExp(
    `(\\n\\s*\\{\\s*\\n\\s*number:\\s*${targetPointerNumber},[\\s\\S]*?\\n\\s*\\},?)`,
    'm'
  );
  const matchedResult = fileContent.match(pointerBlockRegex);
  return matchedResult ? matchedResult[0] : null;
};

export const executeSynchronousPointerRemoval = async targetPointerNumber => {
  const parsedTargetNumber = parseInt(targetPointerNumber, 10);
  if (!parsedTargetNumber || isNaN(parsedTargetNumber) || parsedTargetNumber <= 0) {
    console.error('Ошибка: укажите корректный положительный номер указателя для удаления.');
    console.error('Пример использования: npm run pointer:remove 900');
    return false;
  }

  const loadedFilesContentMap = new Map();
  const foundBlocksPreviewMap = new Map();

  for (const [languageCode, filePath] of Object.entries(targetLanguageFilePaths)) {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    loadedFilesContentMap.set(languageCode, fileContent);

    const matchedBlock = extractPointerBlockFromContent(fileContent, parsedTargetNumber);
    if (matchedBlock) {
      foundBlocksPreviewMap.set(languageCode, matchedBlock.trim());
    }
  }

  if (foundBlocksPreviewMap.size === 0) {
    console.error(`Ошибка: указатель с номером #${parsedTargetNumber} не найден ни в одном из языковых файлов.`);
    return false;
  }

  console.log(`=======================================================`);
  console.log(`УДАЛЕНИЕ УКАЗАТЕЛЯ #${parsedTargetNumber} ИЗ ВСЕХ ЯЗЫКОВЫХ ФАЙЛОВ`);
  console.log(`=======================================================`);

  for (const [languageCode, snippet] of foundBlocksPreviewMap.entries()) {
    console.log(`[${languageCode}] Будет удален блок:\n${snippet}\n`);
  }

  for (const [languageCode, filePath] of Object.entries(targetLanguageFilePaths)) {
    const originalContent = loadedFilesContentMap.get(languageCode);
    const pointerBlockRegex = new RegExp(
      `(\\n\\s*\\{\\s*\\n\\s*number:\\s*${parsedTargetNumber},[\\s\\S]*?\\n\\s*\\},?)`,
      'm'
    );
    const updatedContent = originalContent.replace(pointerBlockRegex, '');
    await fs.writeFile(filePath, updatedContent, 'utf-8');
  }

  console.log(`Указатель #${parsedTargetNumber} успешно удален из файлов.`);
  console.log(`Запуск автоматической перенумерации и проверки...`);

  await executePointersReindexing();

  return true;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const requestedPointerNumber = process.argv[2];
  executeSynchronousPointerRemoval(requestedPointerNumber).catch(executionError => {
    console.error('Ошибка при удалении указателя:', executionError);
    process.exit(1);
  });
}
