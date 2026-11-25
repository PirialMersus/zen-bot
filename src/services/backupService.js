import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const MAXIMUM_RETAINED_BACKUP_FILES_COUNT = 3;

export const rotateDatabaseBackupFiles = (
  backupsDestinationDirectoryPath,
  maximumRetainedBackupsLimit = MAXIMUM_RETAINED_BACKUP_FILES_COUNT
) => {
  if (!fs.existsSync(backupsDestinationDirectoryPath)) {
    return [];
  }

  const existingFileNamesList = fs.readdirSync(backupsDestinationDirectoryPath);
  const backupFilesList = existingFileNamesList
    .filter((fileName) => fileName.startsWith('backup_') && fileName.endsWith('.json'))
    .map((fileName) => {
      const fileAbsolutePath = path.join(backupsDestinationDirectoryPath, fileName);
      const fileStats = fs.statSync(fileAbsolutePath);
      return {
        fileName,
        fileAbsolutePath,
        modificationTime: fileStats.mtimeMs
      };
    })
    .sort((earlierFile, laterFile) => laterFile.modificationTime - earlierFile.modificationTime);

  const surplusFilesToDeleteList = backupFilesList.slice(maximumRetainedBackupsLimit);
  const removedFilePathsList = [];

  for (const fileToDelete of surplusFilesToDeleteList) {
    fs.unlinkSync(fileToDelete.fileAbsolutePath);
    removedFilePathsList.push(fileToDelete.fileAbsolutePath);
    console.log(`[BACKUP_ROTATION] Удалена устаревшая копия: ${fileToDelete.fileName}`);
  }

  return removedFilePathsList;
};

export const createDatabaseBackup = async (backupTriggerReason = 'manual') => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Невозможно создать бэкап: соединение с базой данных MongoDB не установлено');
  }

  const projectRootDirectoryPath = process.cwd();
  const backupsDestinationDirectoryPath = path.join(projectRootDirectoryPath, 'backups');

  if (!fs.existsSync(backupsDestinationDirectoryPath)) {
    fs.mkdirSync(backupsDestinationDirectoryPath, { recursive: true });
  }

  const currentDatabaseInstance = mongoose.connection.db;
  const currentDatabaseName = mongoose.connection.name || 'database';

  const usersCollectionData = await currentDatabaseInstance.collection('users').find({}).toArray();
  const remindersCollectionData = await currentDatabaseInstance.collection('reminders').find({}).toArray();
  const activitiesCollectionData = await currentDatabaseInstance.collection('activities').find({}).toArray();
  const sessionsCollectionData = await currentDatabaseInstance.collection('sessions').find({}).toArray();

  const formattedTimestampString = new Date().toISOString().replace(/[:.]/g, '-');
  const sanitizedBackupReason = backupTriggerReason.replace(/[^a-zA-Z0-9_-]/g, '_');
  const backupFileName = `backup_${currentDatabaseName}_${formattedTimestampString}_${sanitizedBackupReason}.json`;
  const backupFileAbsolutePath = path.join(backupsDestinationDirectoryPath, backupFileName);

  const backupPayloadObject = {
    metadata: {
      createdAt: new Date().toISOString(),
      databaseName: currentDatabaseName,
      triggerReason: backupTriggerReason,
      recordsCount: {
        users: usersCollectionData.length,
        reminders: remindersCollectionData.length,
        activities: activitiesCollectionData.length,
        sessions: sessionsCollectionData.length
      }
    },
    collections: {
      users: usersCollectionData,
      reminders: remindersCollectionData,
      activities: activitiesCollectionData,
      sessions: sessionsCollectionData
    }
  };

  fs.writeFileSync(backupFileAbsolutePath, JSON.stringify(backupPayloadObject, null, 2), 'utf8');

  console.log(`[BACKUP_SUCCESS] Резервная копия сохранена: ${backupFileAbsolutePath}`);
  console.log(`[BACKUP_STATS] Пользователей: ${usersCollectionData.length}, Напоминаний: ${remindersCollectionData.length}, Активностей: ${activitiesCollectionData.length}, Сессий: ${sessionsCollectionData.length}`);

  const removedSurplusBackupFiles = rotateDatabaseBackupFiles(
    backupsDestinationDirectoryPath,
    MAXIMUM_RETAINED_BACKUP_FILES_COUNT
  );

  return {
    backupFilePath: backupFileAbsolutePath,
    recordsCount: backupPayloadObject.metadata.recordsCount,
    removedSurplusBackupFiles
  };
};
