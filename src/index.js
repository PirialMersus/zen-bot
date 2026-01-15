// src/index.js
import 'dotenv/config';
import { connectDB } from './storage/db.js';
import { bot } from './bot.js';
import { startScheduler } from './services/scheduler.js';
import { startServer } from './server.js';

process.on('unhandledRejection', err => {
  console.error('UNHANDLED_REJECTION', err);
});

process.on('uncaughtException', err => {
  console.error('UNCAUGHT_EXCEPTION', err);
});

await connectDB();

startScheduler(bot);
startServer();

await bot.launch().catch(err => {
  console.error('BOT_LAUNCH_ERROR', err);
});
