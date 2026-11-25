import 'dotenv/config';
import { connectDB, disconnectDB } from './storage/db.js';
import { bot, registerBotCommands } from './bot.js';
import { startScheduler, stopScheduler } from './services/scheduler.js';
import { startServer, stopServer } from './server.js';
import { validateApplicationEnvironment, validateBotAndDatabaseEnvironmentCompatibility } from './utils/env.js';

let isBotTerminating = false;

const performGracefulShutdown = async (terminationReason, exitCode = 0) => {
  if (isBotTerminating) return;
  isBotTerminating = true;

  const forcedShutdownTimeoutMilliseconds = 10000;
  const forcedTerminationTimer = setTimeout(() => {
    console.error('FORCED_SHUTDOWN_TIMEOUT_EXCEEDED');
    process.exit(exitCode || 1);
  }, forcedShutdownTimeoutMilliseconds);
  forcedTerminationTimer.unref();

  try {
    bot.stop(terminationReason);
  } catch (stopBotError) {
    console.error('ERROR_STOPPING_BOT', stopBotError);
  }

  try {
    stopScheduler();
  } catch (stopSchedulerError) {
    console.error('ERROR_STOPPING_SCHEDULER', stopSchedulerError);
  }

  try {
    await stopServer();
  } catch (stopServerError) {
    console.error('ERROR_STOPPING_SERVER', stopServerError);
  }

  try {
    await disconnectDB();
  } catch (disconnectDbError) {
    console.error('ERROR_DISCONNECTING_DB', disconnectDbError);
  }

  clearTimeout(forcedTerminationTimer);
  process.exit(exitCode);
};

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED_REJECTION', err);
});

process.on('uncaughtException', async (err) => {
  console.error('UNCAUGHT_EXCEPTION', err);
  await performGracefulShutdown('UNCAUGHT_EXCEPTION', 1);
});

process.once('SIGINT', () => performGracefulShutdown('SIGINT', 0));
process.once('SIGTERM', () => performGracefulShutdown('SIGTERM', 0));

validateApplicationEnvironment();

await connectDB();

startScheduler(bot);
startServer();

const startBotWithAutoRestart = async () => {
  const retryDelayMilliseconds = 5000;

  while (!isBotTerminating) {
    try {
      await validateBotAndDatabaseEnvironmentCompatibility(bot);
      await registerBotCommands(bot);
      await bot.launch();
      break;
    } catch (launchError) {
      if (isBotTerminating) {
        break;
      }
      const errorMessageString = launchError?.message || String(launchError);
      console.error('BOT_LAUNCH_ERROR', errorMessageString);
      await new Promise((resolveTimeout) => setTimeout(resolveTimeout, retryDelayMilliseconds));
    }
  }
};

await startBotWithAutoRestart();
