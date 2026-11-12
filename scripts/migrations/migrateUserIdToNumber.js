import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Reminder from '../../src/models/Reminder.js';

dotenv.config();

const runMigration = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is not defined');
  }

  await mongoose.connect(mongoUri);

  const rawCollection = mongoose.connection.collection('reminders');
  const stringReminders = await rawCollection.find({ userId: { $type: 'string' } }).toArray();

  let migratedCount = 0;
  for (const doc of stringReminders) {
    const numericUserId = Number(doc.userId);
    if (!Number.isNaN(numericUserId)) {
      await rawCollection.updateOne(
        { _id: doc._id },
        { $set: { userId: numericUserId } }
      );
      migratedCount++;
    }
  }

  console.log(`Миграция завершена. Обновлено документов: ${migratedCount} из ${stringReminders.length}`);
  await mongoose.disconnect();
};

runMigration().catch(err => {
  console.error(err);
  process.exit(1);
});
