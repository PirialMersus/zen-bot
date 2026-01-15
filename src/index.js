// src/index.js
import 'dotenv/config';
import { connectDB } from './storage/db.js';
import { bot } from './bot.js';
import { startScheduler } from './services/scheduler.js';
import {startServer} from "./server.js";

process.on('unhandledRejection', () => {});
process.on('uncaughtException', () => {});

await connectDB();

startScheduler(bot);

startServer();
await bot.launch();
