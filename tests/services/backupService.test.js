import fs from 'fs';
import path from 'path';
import os from 'os';
import { describe, expect, it } from 'vitest';
import { rotateDatabaseBackupFiles } from '../../src/services/backupService.js';

describe('Сервис резервного копирования и ротации (backupService)', () => {
  it('должен удалять старые бэкапы сверх лимита и сохранять сторонние файлы нетронутыми', () => {
    const temporaryTestDirectoryPath = fs.mkdtempSync(
      path.join(os.tmpdir(), 'zen_bot_backup_test_')
    );

    try {
      const generatedBackupFileNames = [
        'backup_test_2026-11-24T10-00-00-000Z_manual.json',
        'backup_test_2026-11-24T11-00-00-000Z_manual.json',
        'backup_test_2026-11-24T12-00-00-000Z_manual.json',
        'backup_test_2026-11-24T13-00-00-000Z_manual.json',
        'backup_test_2026-11-24T14-00-00-000Z_manual.json'
      ];

      const currentTimeBase = Date.now();
      generatedBackupFileNames.forEach((fileName, fileIndex) => {
        const fullFilePath = path.join(temporaryTestDirectoryPath, fileName);
        fs.writeFileSync(fullFilePath, JSON.stringify({ index: fileIndex }), 'utf8');
        const simulatedModificationTime = new Date(currentTimeBase + fileIndex * 10000);
        fs.utimesSync(fullFilePath, simulatedModificationTime, simulatedModificationTime);
      });

      const auditLogFilePath = path.join(temporaryTestDirectoryPath, 'deleted_users_audit.jsonl');
      fs.writeFileSync(auditLogFilePath, '{"audit": true}\n', 'utf8');

      const removedFilesList = rotateDatabaseBackupFiles(temporaryTestDirectoryPath, 3);

      expect(removedFilesList).toHaveLength(2);
      expect(fs.existsSync(auditLogFilePath)).toBe(true);

      const remainingFilesList = fs.readdirSync(temporaryTestDirectoryPath);
      const remainingBackupFilesList = remainingFilesList.filter(
        (fileName) => fileName.startsWith('backup_') && fileName.endsWith('.json')
      );

      expect(remainingBackupFilesList).toHaveLength(3);
      expect(remainingBackupFilesList).toContain('backup_test_2026-11-24T12-00-00-000Z_manual.json');
      expect(remainingBackupFilesList).toContain('backup_test_2026-11-24T13-00-00-000Z_manual.json');
      expect(remainingBackupFilesList).toContain('backup_test_2026-11-24T14-00-00-000Z_manual.json');
      expect(remainingBackupFilesList).not.toContain('backup_test_2026-11-24T10-00-00-000Z_manual.json');
      expect(remainingBackupFilesList).not.toContain('backup_test_2026-11-24T11-00-00-000Z_manual.json');
    } finally {
      fs.rmSync(temporaryTestDirectoryPath, { recursive: true, force: true });
    }
  });

  it('должен корректно отрабатывать, если файлов меньше или равно лимиту', () => {
    const temporaryTestDirectoryPath = fs.mkdtempSync(
      path.join(os.tmpdir(), 'zen_bot_backup_limit_test_')
    );

    try {
      const singleBackupFilePath = path.join(
        temporaryTestDirectoryPath,
        'backup_database_single.json'
      );
      fs.writeFileSync(singleBackupFilePath, JSON.stringify({ ok: true }), 'utf8');

      const removedFilesList = rotateDatabaseBackupFiles(temporaryTestDirectoryPath, 3);
      expect(removedFilesList).toHaveLength(0);
      expect(fs.existsSync(singleBackupFilePath)).toBe(true);
    } finally {
      fs.rmSync(temporaryTestDirectoryPath, { recursive: true, force: true });
    }
  });
});
