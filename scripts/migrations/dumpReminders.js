import 'dotenv/config';
import mongoose from 'mongoose';
import User from "../src/models/User.js";
import Reminder from "../src/models/Reminder.js";

const MONGO_URL = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/zenbot';

const main = async () => {
  await mongoose.connect(MONGO_URL);
  console.log('Connected to MongoDB\n');

  const users = await User.find({});

  for (const user of users) {
    const reminders = await Reminder.find({ userId: String(user.telegramId) }).sort({ nextRunAt: 1 });
    if (!reminders.length) continue; // пропускаем юзеров без напоминаний

    console.log(`=== User: ${user.telegramId} (${user.username || 'no username'}) ===`);

    reminders.forEach((r, i) => {
      const now = new Date();
      const nextTick = r.nextRunAt ? r.nextRunAt.toLocaleString() : 'N/A';

      let note = '';
      if (!r.nextRunAt) note = '⚠️ нет времени срабатывания!';
      else if (r.nextRunAt < now) note = '⚠️ просрочено!';
      else if ((r.nextRunAt - now) / 1000 / 60 / 60 > 24) note = '⏳ сработает далеко в будущем';

      console.log(
        `${i + 1}. "${r.text}"\n   Interval: ${r.intervalMinutes} min | Active: ${r.isActive} | Next tick: ${nextTick} | Auto-delete: ${r.deleteAfterSeconds ?? 'never'} sec ${note ? '| ' + note : ''}\n`
      );
    });

    console.log('\n');
  }

  await mongoose.disconnect();
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
