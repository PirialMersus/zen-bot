import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { IANAZone } from 'luxon';
import { bot } from '../bot.js';
import { Pointer, PointerEn, PointerUk, PointerEs } from '../models/Pointer.js';
import Reminder from '../models/Reminder.js';
import User from '../models/User.js';
import { logError } from '../utils/logger.js';

const router = express.Router();

const getResolvedJwtSecret = () => {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    return 'test-environment-jwt-secret-key-32-chars-minimum';
  }
  throw new Error('Критическая ошибка конфигурации: переменная JWT_SECRET не задана');
};

const ALLOWED_REMINDER_UPDATE_FIELDS = [
  'text',
  'intervalMinutes',
  'deleteAfterSeconds',
  'soundId',
  'isActive',
  'caption',
  'isRandomPointer',
  'isFavoritePointer'
];

const authRateLimitMap = new Map();

const cleanExpiredRateLimitEntries = () => {
  const currentTimestamp = Date.now();
  for (const [rateLimitKey, rateLimitRecord] of authRateLimitMap.entries()) {
    if (currentTimestamp > rateLimitRecord.resetTimestamp) {
      authRateLimitMap.delete(rateLimitKey);
    }
  }
};

const isRequestWithinRateLimit = (rateLimitKey, maximumRequestsAllowed = 10, timeWindowMilliseconds = 60 * 1000) => {
  if (authRateLimitMap.size > 500) {
    cleanExpiredRateLimitEntries();
  }

  const currentTimestamp = Date.now();
  const existingRateLimitRecord = authRateLimitMap.get(rateLimitKey);

  if (!existingRateLimitRecord || currentTimestamp > existingRateLimitRecord.resetTimestamp) {
    authRateLimitMap.set(rateLimitKey, {
      requestCount: 1,
      resetTimestamp: currentTimestamp + timeWindowMilliseconds
    });
    return true;
  }

  if (existingRateLimitRecord.requestCount >= maximumRequestsAllowed) {
    return false;
  }

  existingRateLimitRecord.requestCount += 1;
  return true;
};

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Токен не предоставлен' });
    }

    const decoded = jwt.verify(token, getResolvedJwtSecret());
    const user = await User.findOne({ telegramId: decoded.telegramId });

    if (!user) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }

    req.user = user;
    const currentActivityDate = new Date();
    user.lastActivityAt = currentActivityDate;
    User.updateOne({ _id: user._id }, { $set: { lastActivityAt: currentActivityDate } }).catch(() => {});
    next();
  } catch {
    res.status(401).json({ message: 'Недействительный токен' });
  }
};

router.post('/auth/request', async (req, res) => {
  try {
    const clientIpAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (!isRequestWithinRateLimit(`auth_request:${clientIpAddress}`, 10, 60 * 1000)) {
      return res.status(429).json({ message: 'Слишком много попыток. Пожалуйста, подожди минуту.' });
    }

    const { telegramId } = req.body;

    const telegramIdNumber = Number(telegramId);
    if (!Number.isSafeInteger(telegramIdNumber) || telegramIdNumber <= 0) {
      return res.status(400).json({ message: 'telegramId обязателен и должен быть положительным числом' });
    }

    if (!isRequestWithinRateLimit(`auth_request_tg:${telegramIdNumber}`, 3, 10 * 60 * 1000)) {
      return res.status(429).json({ message: 'Слишком много запросов кода для этого аккаунта. Пожалуйста, подожди 10 минут.' });
    }

    const user = await User.findOne({ telegramId: telegramIdNumber });
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден. Сначала запусти бота.' });
    }

    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    const formattedCode = `${code.slice(0, 3)}-${code.slice(3, 6)}`;

    user.authCode = formattedCode;
    user.authCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const authNotificationMessageText = [
      '🔐 Твой код для входа в приложение:',
      '',
      `<code>${formattedCode}</code>`,
      '',
      '⏱ Код действителен 10 минут.',
      'Введи его в приложении для авторизации.'
    ].join('\n');

    if (bot?.telegram?.sendMessage) {
      try {
        await bot.telegram.sendMessage(telegramIdNumber, authNotificationMessageText, { parse_mode: 'HTML' });
      } catch (telegramSendError) {
        if (process.env.NODE_ENV !== 'test') {
          logError(telegramSendError, { telegramId: telegramIdNumber, context: 'API_AUTH_REQUEST_TELEGRAM_SEND' });
          return res.status(500).json({ message: 'Не удалось отправить код в Telegram. Убедись, что бот запущен.' });
        }
      }
    }

    res.json({
      message: 'Код отправлен в Telegram'
    });
  } catch (error) {
    logError(error, { context: 'AUTH_REQUEST_ERROR' });
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/auth/verify', async (req, res) => {
  try {
    const clientIpAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (!isRequestWithinRateLimit(`auth_verify:${clientIpAddress}`, 20, 60 * 1000)) {
      return res.status(429).json({ message: 'Слишком много попыток. Пожалуйста, подожди минуту.' });
    }

    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Код обязателен' });
    }

    const user = await User.findOne({
      authCode: code.toUpperCase(),
      authCodeExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return res.status(401).json({ message: 'Неверный или истёкший код' });
    }

    user.authCode = null;
    user.authCodeExpiresAt = null;
    await user.save();

    const token = jwt.sign(
      { telegramId: user.telegramId, id: user._id },
      getResolvedJwtSecret(),
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        telegramId: user.telegramId,
        timezone: user.timezone,
        quietHours: user.quietHours
      }
    });
  } catch (error) {
    logError(error, { context: 'AUTH_VERIFY_ERROR' });
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.get('/pointers/random', async (req, res) => {
  try {
    const requestedLanguage = req.query.language || req.query.lang || 'ru';
    let targetPointerModel = requestedLanguage === 'en'
      ? PointerEn
      : (requestedLanguage === 'uk'
        ? PointerUk
        : (requestedLanguage === 'es' ? PointerEs : Pointer));

    let count = await targetPointerModel.countDocuments({ isActive: true });
    if (!count && targetPointerModel !== Pointer) {
      const totalCollectionCount = await targetPointerModel.countDocuments({});
      if (totalCollectionCount === 0) {
        targetPointerModel = Pointer;
        count = await targetPointerModel.countDocuments({ isActive: true });
      }
    }
    if (!count) {
      return res.status(404).json({ message: 'Указатели не найдены' });
    }

    const randomPositionIndex = Math.floor(Math.random() * count);
    const [pointer] = await targetPointerModel.find({ isActive: true })
      .sort({ number: 1, _id: 1 })
      .skip(randomPositionIndex)
      .limit(1);

    res.json(pointer);
  } catch (error) {
    logError(error, { context: 'POINTERS_RANDOM_ERROR' });
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.get('/reminders', authMiddleware, async (req, res) => {
  try {
    const reminders = await Reminder.find({
      userId: req.user.telegramId
    }).sort({ createdAt: -1 });

    res.json(reminders);
  } catch (error) {
    logError(error, { context: 'REMINDERS_LIST_ERROR' });
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/reminders', authMiddleware, async (req, res) => {
  try {
    const { text, intervalMinutes, deleteAfterSeconds, soundId, isRandomPointer, isFavoritePointer } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ message: 'text обязателен и не должен быть пустым' });
    }

    if (text.length > 4096) {
      return res.status(400).json({ message: 'text не должен превышать 4096 символов' });
    }

    const parsedInterval = Number(intervalMinutes);
    if (!Number.isInteger(parsedInterval) || parsedInterval < 1) {
      return res.status(400).json({ message: 'intervalMinutes должен быть положительным целым числом' });
    }

    let parsedDeleteAfter = 10;
    if (deleteAfterSeconds !== undefined && deleteAfterSeconds !== null) {
      parsedDeleteAfter = Number(deleteAfterSeconds);
      if (!Number.isInteger(parsedDeleteAfter) || parsedDeleteAfter < 1 || parsedDeleteAfter > 86400) {
        return res.status(400).json({ message: 'deleteAfterSeconds должен быть числом от 1 до 86400' });
      }
    } else if (deleteAfterSeconds === null) {
      parsedDeleteAfter = null;
    }

    const now = new Date();
    const reminder = await Reminder.create({
      userId: req.user.telegramId,
      chatId: req.user.telegramId,
      text,
      intervalMinutes: parsedInterval,
      deleteAfterSeconds: parsedDeleteAfter,
      soundId: soundId || 'default',
      isActive: true,
      isRandomPointer: Boolean(isRandomPointer),
      isFavoritePointer: Boolean(isFavoritePointer),
      nextRunAt: new Date(now.getTime() + parsedInterval * 60 * 1000)
    });

    res.status(201).json(reminder);
  } catch (error) {
    logError(error, { context: 'REMINDERS_CREATE_ERROR' });
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.patch('/reminders/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const incomingUpdates = req.body || {};

    if (incomingUpdates.intervalMinutes !== undefined) {
      const parsedInterval = Number(incomingUpdates.intervalMinutes);
      if (!Number.isInteger(parsedInterval) || parsedInterval < 1) {
        return res.status(400).json({ message: 'intervalMinutes должен быть положительным целым числом' });
      }
      incomingUpdates.intervalMinutes = parsedInterval;
    }

    if (incomingUpdates.text !== undefined) {
      if (typeof incomingUpdates.text !== 'string' || incomingUpdates.text.trim().length === 0 || incomingUpdates.text.length > 4096) {
        return res.status(400).json({ message: 'text должен быть непустой строкой длиной до 4096 символов' });
      }
    }

    if (incomingUpdates.deleteAfterSeconds !== undefined && incomingUpdates.deleteAfterSeconds !== null) {
      const parsedDeleteAfter = Number(incomingUpdates.deleteAfterSeconds);
      if (!Number.isInteger(parsedDeleteAfter) || parsedDeleteAfter < 1 || parsedDeleteAfter > 86400) {
        return res.status(400).json({ message: 'deleteAfterSeconds должен быть числом от 1 до 86400' });
      }
      incomingUpdates.deleteAfterSeconds = parsedDeleteAfter;
    }

    const sanitizedUpdates = {};
    for (const allowedField of ALLOWED_REMINDER_UPDATE_FIELDS) {
      if (incomingUpdates[allowedField] !== undefined) {
        sanitizedUpdates[allowedField] = incomingUpdates[allowedField];
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return res.status(400).json({ message: 'Нет допустимых полей для обновления' });
    }

    const reminder = await Reminder.findOneAndUpdate(
      { _id: id, userId: req.user.telegramId },
      { $set: sanitizedUpdates },
      { new: true }
    );

    if (!reminder) {
      return res.status(404).json({ message: 'Напоминание не найдено' });
    }

    res.json(reminder);
  } catch (error) {
    logError(error, { context: 'REMINDERS_UPDATE_ERROR' });
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.delete('/reminders/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const reminder = await Reminder.findOneAndDelete({
      _id: id,
      userId: req.user.telegramId
    });

    if (!reminder) {
      return res.status(404).json({ message: 'Напоминание не найдено' });
    }

    res.json({ message: 'Напоминание удалено' });
  } catch (error) {
    logError(error, { context: 'REMINDERS_DELETE_ERROR' });
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.get('/user/settings', authMiddleware, async (req, res) => {
  try {
    res.json({
      _id: req.user._id,
      telegramId: req.user.telegramId,
      timezone: req.user.timezone,
      quietHours: req.user.quietHours,
      notificationChannel: req.user.notificationChannel || 'telegram'
    });
  } catch (error) {
    logError(error, { context: 'USER_SETTINGS_GET_ERROR' });
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.patch('/user/settings', authMiddleware, async (req, res) => {
  try {
    const { timezone, quietHours } = req.body;

    if (timezone !== undefined) {
      if (typeof timezone !== 'string' || !IANAZone.isValidZone(timezone)) {
        return res.status(400).json({ message: 'Некорректный часовой пояс IANA' });
      }
      req.user.timezone = timezone;
    }

    if (quietHours !== undefined) {
      if (
        typeof quietHours !== 'object' ||
        quietHours === null ||
        typeof quietHours.start !== 'number' ||
        typeof quietHours.end !== 'number' ||
        quietHours.start < 0 ||
        quietHours.start > 23 ||
        quietHours.end < 0 ||
        quietHours.end > 23 ||
        quietHours.start === quietHours.end
      ) {
        return res.status(400).json({ message: 'Некорректные параметры тихих часов' });
      }
      req.user.quietHours = {
        enabled: quietHours.enabled !== undefined ? Boolean(quietHours.enabled) : req.user.quietHours.enabled,
        start: quietHours.start,
        end: quietHours.end
      };
    }

    await req.user.save();

    res.json({
      _id: req.user._id,
      telegramId: req.user.telegramId,
      timezone: req.user.timezone,
      quietHours: req.user.quietHours,
      notificationChannel: req.user.notificationChannel || 'telegram'
    });
  } catch (error) {
    logError(error, { context: 'USER_SETTINGS_UPDATE_ERROR' });
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/user/push-token', authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'token обязателен' });
    }

    if (!req.user.pushTokens) {
      req.user.pushTokens = [];
    }

    if (!req.user.pushTokens.includes(token)) {
      req.user.pushTokens.push(token);
      await req.user.save();
    }

    res.json({ message: 'Token сохранён' });
  } catch (error) {
    logError(error, { context: 'PUSH_TOKEN_ERROR' });
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.put('/user/notification-channel', authMiddleware, async (req, res) => {
  try {
    const { channel } = req.body;

    if (!channel || !['telegram', 'app'].includes(channel)) {
      return res.status(400).json({ message: 'channel должен быть telegram или app' });
    }

    req.user.notificationChannel = channel;
    await req.user.save();

    res.json({
      message: 'Канал уведомлений обновлён',
      notificationChannel: channel
    });
  } catch (error) {
    logError(error, { context: 'NOTIFICATION_CHANNEL_ERROR' });
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

export default router;
