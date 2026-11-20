import express from 'express';
import { IANAZone } from 'luxon';
import { logError } from '../../utils/logger.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/settings', authMiddleware, async (req, res) => {
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

router.patch('/settings', authMiddleware, async (req, res) => {
  try {
    const { timezone, quietHours } = req.body;

    if (timezone !== undefined) {
      if (typeof timezone !== 'string' || !IANAZone.isValidZone(timezone)) {
        return res.status(400).json({ message: 'Некорректный часовой пояс IANA' });
      }
      req.user.timezone = timezone;
    }

    if (quietHours !== undefined) {
      const resolvedStartMinute =
        quietHours?.startMinute !== undefined ? quietHours.startMinute : 0;
      const resolvedEndMinute =
        quietHours?.endMinute !== undefined ? quietHours.endMinute : 0;

      if (
        typeof quietHours !== 'object' ||
        quietHours === null ||
        typeof quietHours.start !== 'number' ||
        typeof quietHours.end !== 'number' ||
        typeof resolvedStartMinute !== 'number' ||
        typeof resolvedEndMinute !== 'number' ||
        quietHours.start < 0 ||
        quietHours.start > 23 ||
        quietHours.end < 0 ||
        quietHours.end > 23 ||
        resolvedStartMinute < 0 ||
        resolvedStartMinute > 59 ||
        resolvedEndMinute < 0 ||
        resolvedEndMinute > 59 ||
        (quietHours.start === quietHours.end && resolvedStartMinute === resolvedEndMinute)
      ) {
        return res.status(400).json({ message: 'Некорректные параметры тихих часов' });
      }
      req.user.quietHours = {
        enabled:
          quietHours.enabled !== undefined
            ? Boolean(quietHours.enabled)
            : req.user.quietHours.enabled,
        start: quietHours.start,
        startMinute: resolvedStartMinute,
        end: quietHours.end,
        endMinute: resolvedEndMinute
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

router.post('/push-token', authMiddleware, async (req, res) => {
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

router.put('/notification-channel', authMiddleware, async (req, res) => {
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
