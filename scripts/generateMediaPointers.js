import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';

const currentFileDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRootDirectory = path.resolve(currentFileDirectory, '..');
dotenv.config({ path: path.join(projectRootDirectory, '.env') });

const telegramExportDirectoryPath = '/Users/gennadiifesenko/Downloads/Telegram Desktop/ChatExport_2026-11-19';
const temporaryAudioDirectoryPath = path.join(projectRootDirectory, '.temp_media_audio');
const cacheOutputFilePath = path.join(projectRootDirectory, 'data', 'cache_media_transcriptions.json');
const finalPointersOutputFilePath = path.join(projectRootDirectory, 'data', 'pointers.master.media.js');

const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
  throw new Error('GEMINI_API_KEY is not defined in environment variables');
}

async function ensureDirectoryExists(directoryPath) {
  try {
    await fs.access(directoryPath);
  } catch {
    await fs.mkdir(directoryPath, { recursive: true });
  }
}

async function checkMediaFileContainsAudioStream(mediaFilePath) {
  return new Promise((resolve) => {
    const ffprobeProcess = spawn('ffprobe', [
      '-v', 'error',
      '-select_streams', 'a:0',
      '-show_entries', 'stream=codec_type',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      mediaFilePath
    ]);

    let standardOutputData = '';
    ffprobeProcess.stdout.on('data', (chunk) => {
      standardOutputData += chunk.toString();
    });

    ffprobeProcess.on('close', (exitCode) => {
      const hasAudioStream = exitCode === 0 && standardOutputData.trim().includes('audio');
      resolve(hasAudioStream);
    });
  });
}

async function extractAudioFromVideoUsingFfmpeg(inputVideoFilePath, outputAudioFilePath) {
  return new Promise((resolve, reject) => {
    const ffmpegProcess = spawn('ffmpeg', [
      '-y',
      '-i', inputVideoFilePath,
      '-vn',
      '-acodec', 'libmp3lame',
      '-q:a', '4',
      outputAudioFilePath
    ]);

    let standardErrorLogs = '';
    ffmpegProcess.stderr.on('data', (chunk) => {
      standardErrorLogs += chunk.toString();
    });

    ffmpegProcess.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${exitCode}: ${standardErrorLogs}`));
      }
    });
  });
}

async function findExportHtmlFiles(exportDirectoryPath) {
  const directoryEntries = await fs.readdir(exportDirectoryPath);
  const htmlFileNames = directoryEntries.filter((entryName) => {
    return entryName.startsWith('messages') && entryName.endsWith('.html');
  });

  htmlFileNames.sort((firstFileName, secondFileName) => {
    const firstFileNumberMatch = firstFileName.match(/\d+/);
    const secondFileNumberMatch = secondFileName.match(/\d+/);
    const firstFileIndex = firstFileNumberMatch ? parseInt(firstFileNumberMatch[0], 10) : 1;
    const secondFileIndex = secondFileNumberMatch ? parseInt(secondFileNumberMatch[0], 10) : 1;
    return firstFileIndex - secondFileIndex;
  });

  return htmlFileNames.map((htmlFileName) => path.join(exportDirectoryPath, htmlFileName));
}

function cleanHtmlText(rawHtmlString) {
  return rawHtmlString
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function isTargetAuthor(authorNameString) {
  if (!authorNameString) {
    return false;
  }
  const normalizedAuthorName = authorNameString.toLowerCase();
  const isMasterAccount = normalizedAuthorName.includes('ясност');
  const isAndreiAccount = normalizedAuthorName.includes('андрей');
  return isMasterAccount || isAndreiAccount;
}

async function extractMasterMediaItemsFromHtmlFiles(htmlFilePathsList) {
  const mediaItemsList = [];
  const processedMediaRelativePathsSet = new Set();
  let currentAuthorName = 'Неизвестно';

  for (const htmlFilePath of htmlFilePathsList) {
    const fileContent = await fs.readFile(htmlFilePath, 'utf-8');
    const rawMessageBlocksList = fileContent.split(/(?=<div class="message\b)/);

    for (const rawMessageBlock of rawMessageBlocksList) {
      if (!rawMessageBlock.trim()) {
        continue;
      }

      const authorElementMatch = rawMessageBlock.match(/<div class="from_name">\s*([\s\S]*?)\s*<\/div>/);
      if (authorElementMatch) {
        const rawAuthorText = cleanHtmlText(authorElementMatch[1]);
        currentAuthorName = rawAuthorText.replace(/\s+\d{2}\.\d{2}\.\d{4}.*$/, '').trim();
      }

      if (!isTargetAuthor(currentAuthorName)) {
        continue;
      }

      const mediaHrefMatchesList = [...rawMessageBlock.matchAll(/href="((?:voice_messages|video_files|audio_files|round_video_messages)\/[^"]+\.(?:ogg|mp3|mp4|mov|m4a))"/gi)];
      if (mediaHrefMatchesList.length === 0) {
        continue;
      }

      const dateElementMatch = rawMessageBlock.match(/title="(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}:\d{2})/);
      const messageDateString = dateElementMatch ? dateElementMatch[1] : '';

      const textElementMatch = rawMessageBlock.match(/<div class="text">\s*([\s\S]*?)\s*<\/div>/);
      const accompanyingMessageText = textElementMatch ? cleanHtmlText(textElementMatch[1]) : '';

      for (const singleMediaHrefMatch of mediaHrefMatchesList) {
        const relativeMediaFilePath = singleMediaHrefMatch[1];
        if (processedMediaRelativePathsSet.has(relativeMediaFilePath)) {
          continue;
        }

        processedMediaRelativePathsSet.add(relativeMediaFilePath);
        mediaItemsList.push({
          relativeFilePath: relativeMediaFilePath,
          absoluteFilePath: path.join(telegramExportDirectoryPath, relativeMediaFilePath),
          author: currentAuthorName,
          date: messageDateString,
          accompanyingText: accompanyingMessageText
        });
      }
    }
  }

  return mediaItemsList;
}

async function requestPointersExtractionFromGeminiWithRetry(audioBufferData, mimeTypeString, retryCountRemaining = 3) {
  const modelName = 'gemini-2.5-flash';
  const apiEndpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;

  const promptInstruction = `
Ты — исследователь духовных указателей (адвайта, недвойственность, дзен).
Перед тобой аудио/видео запись Мастера («Хочу Ясности»).
Твоя задача — извлечь из этой записи все содержательные духовные указатели (поинтеры).

Требования к поинтерам:
1. Поинтер должен отражать ключевую суть, глубокое указание на природу ума, тишину, разотождествление, осознанность или ответ по сути поиска.
2. Длина поинтера: от 1 до 10 предложений (емко, насыщенно смыслом, без вводных приветствий, прощаний, бытовых оговорок).
3. Сохраняй стиль Мастера. Не делай огромных полотен текста.
4. Если в записи содержится несколько независимых ценных указателей, раздели их на отдельные поинтеры.
5. Если запись чисто бытовая (проверка звука, приветствие без духовного содержания, организационные моменты), верни пустой список поинтеров.
6. Для каждого поинтера укажи:
   - "text": текст указателя;
   - "tags": массив из 1-2 тегов strictly из списка: ["тишина", "рекомендации", "наблюдения", "мудрость"].

Ответь строго валидным JSON-объектом:
{
  "transcription": "дословная расшифровка речи",
  "pointers": [
    {
      "text": "текст поинтера",
      "tags": ["тишина"]
    }
  ]
}
`;

  const requestPayload = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: mimeTypeString,
              data: audioBufferData.toString('base64')
            }
          },
          {
            text: promptInstruction
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json'
    }
  };

  try {
    const apiResponse = await fetch(apiEndpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    if (!apiResponse.ok) {
      const errorResponseText = await apiResponse.text();
      if ((apiResponse.status === 429 || apiResponse.status >= 500) && retryCountRemaining > 0) {
        console.warn(`Получен статус ${apiResponse.status}. Ожидание 8 секунд перед повторной попыткой...`);
        await new Promise((waitResolve) => setTimeout(waitResolve, 8000));
        return requestPointersExtractionFromGeminiWithRetry(audioBufferData, mimeTypeString, retryCountRemaining - 1);
      }
      throw new Error(`Gemini API error: ${apiResponse.status} ${errorResponseText}`);
    }

    const responseJsonData = await apiResponse.json();
    const candidatePart = responseJsonData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidatePart) {
      return { transcription: '', pointers: [] };
    }

    const parsedGeminiResult = JSON.parse(candidatePart);
    return parsedGeminiResult;
  } catch (executionError) {
    if (retryCountRemaining > 0) {
      console.warn(`Ошибка запроса: ${executionError.message}. Ожидание перед повтором...`);
      await new Promise((waitResolve) => setTimeout(waitResolve, 8000));
      return requestPointersExtractionFromGeminiWithRetry(audioBufferData, mimeTypeString, retryCountRemaining - 1);
    }
    throw executionError;
  }
}

async function loadExistingCache() {
  try {
    const rawCacheFileContent = await fs.readFile(cacheOutputFilePath, 'utf-8');
    return JSON.parse(rawCacheFileContent);
  } catch {
    return {};
  }
}

async function saveCurrentCache(cacheDataObject) {
  await fs.writeFile(cacheOutputFilePath, JSON.stringify(cacheDataObject, null, 2), 'utf-8');
}

function escapeTemplateStringCharacters(inputString) {
  return inputString
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\${/g, '\\${');
}

async function writeFinalPointersFile(pointersArray) {
  const codeLinesList = [];
  codeLinesList.push('export default [');

  for (let pointerIndex = 0; pointerIndex < pointersArray.length; pointerIndex += 1) {
    const currentPointerItem = pointersArray[pointerIndex];
    const itemNumber = pointerIndex + 1;
    const escapedItemText = escapeTemplateStringCharacters(currentPointerItem.text);
    const tagsJsonString = JSON.stringify(currentPointerItem.tags || ['тишина']);

    codeLinesList.push('  {');
    codeLinesList.push(`    number: ${itemNumber},`);
    codeLinesList.push(`    text: \`${escapedItemText}\`,`);
    codeLinesList.push('    source: "Хочу Ясности",');
    codeLinesList.push(`    tags: ${tagsJsonString}`);
    codeLinesList.push('  }' + (pointerIndex === pointersArray.length - 1 ? '' : ','));
  }

  codeLinesList.push('];');
  codeLinesList.push('');

  await fs.writeFile(finalPointersOutputFilePath, codeLinesList.join('\n'), 'utf-8');
}

async function main() {
  await ensureDirectoryExists(temporaryAudioDirectoryPath);

  const exportHtmlFilesList = await findExportHtmlFiles(telegramExportDirectoryPath);
  console.log(`Найдено HTML файлов сообщений: ${exportHtmlFilesList.length}`);

  const targetMediaItemsList = await extractMasterMediaItemsFromHtmlFiles(exportHtmlFilesList);
  console.log(`Найдено целевых медиафайлов Мастера/Андрея: ${targetMediaItemsList.length}`);

  const cacheObject = await loadExistingCache();
  const allCollectedPointersList = [];

  for (let mediaIndex = 0; mediaIndex < targetMediaItemsList.length; mediaIndex += 1) {
    const currentMediaItem = targetMediaItemsList[mediaIndex];
    const mediaRelativePath = currentMediaItem.relativeFilePath;
    const mediaFileAbsolutePath = currentMediaItem.absoluteFilePath;

    console.log(`\n[${mediaIndex + 1}/${targetMediaItemsList.length}] Обработка: ${mediaRelativePath}`);

    if (cacheObject[mediaRelativePath]) {
      console.log(`Использован кэш для: ${mediaRelativePath}`);
      const cachedResult = cacheObject[mediaRelativePath];
      if (Array.isArray(cachedResult.pointers)) {
        allCollectedPointersList.push(...cachedResult.pointers);
      }
      continue;
    }

    try {
      await fs.access(mediaFileAbsolutePath);
    } catch {
      console.warn(`Файл отсутствует на диске: ${mediaFileAbsolutePath}`);
      continue;
    }

    const isVideoFile = mediaFileAbsolutePath.toLowerCase().endsWith('.mp4') ||
      mediaFileAbsolutePath.toLowerCase().endsWith('.mov') ||
      mediaFileAbsolutePath.toLowerCase().endsWith('.m4v');

    let audioBufferToSend;
    let mimeTypeForApi;

    if (isVideoFile) {
      const hasAudioTrack = await checkMediaFileContainsAudioStream(mediaFileAbsolutePath);
      if (!hasAudioTrack) {
        console.log(`Видео не содержит аудиодорожки, пропуск: ${mediaRelativePath}`);
        cacheObject[mediaRelativePath] = {
          date: currentMediaItem.date,
          author: currentMediaItem.author,
          transcription: '',
          pointers: []
        };
        await saveCurrentCache(cacheObject);
        continue;
      }

      const temporaryOutputAudioPath = path.join(
        temporaryAudioDirectoryPath,
        `extracted_audio_${mediaIndex}_${Date.now()}.mp3`
      );

      try {
        await extractAudioFromVideoUsingFfmpeg(mediaFileAbsolutePath, temporaryOutputAudioPath);
        audioBufferToSend = await fs.readFile(temporaryOutputAudioPath);
        mimeTypeForApi = 'audio/mp3';
        await fs.unlink(temporaryOutputAudioPath);
      } catch (videoConversionError) {
        console.warn(`Ошибка извлечения аудио из видео ${mediaRelativePath}: ${videoConversionError.message}`);
        continue;
      }
    } else {
      audioBufferToSend = await fs.readFile(mediaFileAbsolutePath);
      mimeTypeForApi = 'audio/ogg';
    }

    try {
      const extractionResult = await requestPointersExtractionFromGeminiWithRetry(audioBufferToSend, mimeTypeForApi);
      const extractedPointersCount = extractionResult.pointers?.length || 0;
      console.log(`Успешно. Найдено поинтеров: ${extractedPointersCount}`);

      cacheObject[mediaRelativePath] = {
        date: currentMediaItem.date,
        author: currentMediaItem.author,
        transcription: extractionResult.transcription || '',
        pointers: extractionResult.pointers || []
      };

      await saveCurrentCache(cacheObject);

      if (Array.isArray(extractionResult.pointers)) {
        allCollectedPointersList.push(...extractionResult.pointers);
      }

      await writeFinalPointersFile(allCollectedPointersList);
    } catch (apiProcessingError) {
      console.error(`Ошибка обработки ${mediaRelativePath}: ${apiProcessingError.message}`);
    }

    await new Promise((waitResolve) => setTimeout(waitResolve, 1500));
  }

  console.log(`\nОбработка завершена. Всего собрано поинтеров: ${allCollectedPointersList.length}`);
  await writeFinalPointersFile(allCollectedPointersList);
  console.log(`Итоговый файл успешно сформирован: ${finalPointersOutputFilePath}`);
}

main().catch((fatalError) => {
  console.error('Фатальная ошибка:', fatalError);
  process.exit(1);
});
