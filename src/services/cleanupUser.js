import fs from 'fs';
import path from 'path';
import User from '../models/User.js';
import Reminder from '../models/Reminder.js';
import Activity from '../models/Activity.js';
import { invalidateUserCache } from '../middlewares/activity.js';

const appendDeletedUserRecordToLocalAuditLog = async (telegramIdNumber, userDocument, userRemindersList) => {
  try {
    const projectRootDirectoryPath = process.cwd();
    const backupsDestinationDirectoryPath = path.join(projectRootDirectoryPath, 'backups');

    if (!fs.existsSync(backupsDestinationDirectoryPath)) {
      fs.mkdirSync(backupsDestinationDirectoryPath, { recursive: true });
    }

    const auditLogFilePath = path.join(backupsDestinationDirectoryPath, 'deleted_users_audit.jsonl');
    const auditRecordPayload = {
      deletedAt: new Date().toISOString(),
      telegramId: telegramIdNumber,
      user: userDocument,
      reminders: userRemindersList
    };

    fs.appendFileSync(auditLogFilePath, JSON.stringify(auditRecordPayload) + '\n', 'utf8');
  } catch (auditFileLoggingError) {
    console.error('ERROR_APPENDING_DELETED_USER_AUDIT_LOG', auditFileLoggingError);
  }
};

export const cleanupUser = async (telegramId) => {
  const targetTelegramIdNumber = Number(telegramId);
  invalidateUserCache(targetTelegramIdNumber);

  try {
    const existingUserDocument = await User.findOne({ telegramId: targetTelegramIdNumber }).lean();
    const existingUserReminders = await Reminder.find({ userId: targetTelegramIdNumber }).lean();

    if (existingUserDocument || existingUserReminders.length > 0) {
      await appendDeletedUserRecordToLocalAuditLog(
        targetTelegramIdNumber,
        existingUserDocument,
        existingUserReminders
      );
    }
  } catch (readBeforeDeleteError) {
    console.error('ERROR_READING_USER_DATA_BEFORE_CLEANUP', readBeforeDeleteError);
  }

  await Promise.allSettled([
    User.deleteOne({ telegramId: targetTelegramIdNumber }),
    Reminder.deleteMany({ userId: targetTelegramIdNumber }),
    Activity.deleteMany({ telegramId: targetTelegramIdNumber })
  ]);
};
