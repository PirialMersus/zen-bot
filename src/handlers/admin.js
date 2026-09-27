import Reminder from '../models/Reminder.js';
import User from '../models/User.js';

export const handleAdminActiveUsers = async ctx => {
  if (String(ctx.from?.id) !== process.env.CREATOR_ID) return;

  const millisecondsInOneDay = 24 * 60 * 60 * 1000;
  const oneDayAgoDate = new Date(Date.now() - millisecondsInOneDay);
  const sevenDaysAgoDate = new Date(Date.now() - 7 * millisecondsInOneDay);

  const [
    usersWithActiveReminders,
    activeUsersPastDayCount,
    activeUsersPastWeekCount,
    totalUsersCount
  ] = await Promise.all([
    Reminder.distinct('userId', { isActive: true }),
    User.countDocuments({ lastActivityAt: { $gte: oneDayAgoDate } }),
    User.countDocuments({ lastActivityAt: { $gte: sevenDaysAgoDate } }),
    User.countDocuments()
  ]);

  const activeRemindersUsersCount = usersWithActiveReminders.length;

  const responseText = [
    '👥 <b>Статистика пользователей</b>',
    '',
    `• С активными напоминаниями: <b>${activeRemindersUsersCount}</b>`,
    `• Активность за 24 часа: <b>${activeUsersPastDayCount}</b>`,
    `• Активность за 7 дней: <b>${activeUsersPastWeekCount}</b>`,
    `• Всего пользователей: <b>${totalUsersCount}</b>`
  ].join('\n');

  await ctx.reply(responseText, { parse_mode: 'HTML' });
};
