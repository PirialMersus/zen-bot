import 'dotenv/config';
import { connectDB, disconnectDB } from '../src/storage/db.js';
import { createDatabaseBackup } from '../src/services/backupService.js';

const executeManualDatabaseBackup = async () => {
  await connectDB();
  await createDatabaseBackup('manual_cli');
  await disconnectDB();
};

executeManualDatabaseBackup().catch(async (fatalBackupExecutionError) => {
  console.error('FATAL_CLI_BACKUP_ERROR', fatalBackupExecutionError);
  try {
    await disconnectDB();
  } catch (disconnectionError) {
    console.error('DISCONNECTION_ERROR', disconnectionError);
  }
  process.exit(1);
});
