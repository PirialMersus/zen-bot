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

let isBotTerminating = false;

const startBotWithAutoRestart = async () => {
  const retryDelayMilliseconds = 5000;

  while (!isBotTerminating) {
    try {
      await bot.launch();
      break;
    } catch (launchError) {
      if (isBotTerminating) {
        break;
      }
      const errorMessageString = launchError?.message || String(launchError);
      console.error('BOT_LAUNCH_ERROR', errorMessageString);
      await new Promise(resolveTimeout => setTimeout(resolveTimeout, retryDelayMilliseconds));
    }
  }
};

const handleTerminationSignal = signalName => {
  isBotTerminating = true;
  bot.stop(signalName);
};

process.once('SIGINT', () => handleTerminationSignal('SIGINT'));
process.once('SIGTERM', () => handleTerminationSignal('SIGTERM'));

await startBotWithAutoRestart();
