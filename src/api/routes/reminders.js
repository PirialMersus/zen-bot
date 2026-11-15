import express from 'express';
import mongoose from 'mongoose';
import Reminder from '../../models/Reminder.js';
import { logError } from '../../utils/logger.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  MAX_REMINDERS_PER_USER,
  MAX_REMINDER_INTERVAL_MINUTES,
  MIN_REMINDER_INTERVAL_MINUTES
} from '../../constants/limits.js';

const router = express.Router();

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

router.get('/', authMiddleware, async (req, res) => {
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

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { text, intervalMinutes, deleteAfterSeconds, soundId, isRandomPointer, isFavoritePointer } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ message: 'text обязателен и не должен быть пустым' });
    }

    if (text.length > 4096) {
      return res.status(400).json({ message: 'text не должен превышать 4096 символов' });
    }

    const existingRemindersCount = await Reminder.countDocuments({ userId: req.user.telegramId });
    if (existingRemindersCount >= MAX_REMINDERS_PER_USER) {
      return res.status(400).json({ message: `Достигнут лимит напоминаний (максимум ${MAX_REMINDERS_PER_USER})` });
    }

    const parsedInterval = Number(intervalMinutes);
    if (!Number.isInteger(parsedInterval) || parsedInterval < MIN_REMINDER_INTERVAL_MINUTES || parsedInterval > MAX_REMINDER_INTERVAL_MINUTES) {
      return res.status(400).json({ message: `intervalMinutes должен быть положительным целым числом не более ${MAX_REMINDER_INTERVAL_MINUTES}` });
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

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Некорректный id напоминания' });
    }

    const incomingUpdates = req.body || {};

    if (incomingUpdates.intervalMinutes !== undefined) {
      const parsedInterval = Number(incomingUpdates.intervalMinutes);
      if (!Number.isInteger(parsedInterval) || parsedInterval < MIN_REMINDER_INTERVAL_MINUTES || parsedInterval > MAX_REMINDER_INTERVAL_MINUTES) {
        return res.status(400).json({ message: `intervalMinutes должен быть положительным целым числом не более ${MAX_REMINDER_INTERVAL_MINUTES}` });
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

    if (incomingUpdates.isActive !== undefined && typeof incomingUpdates.isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive должен быть булевым значением' });
    }

    if (incomingUpdates.isRandomPointer !== undefined && typeof incomingUpdates.isRandomPointer !== 'boolean') {
      return res.status(400).json({ message: 'isRandomPointer должен быть булевым значением' });
    }

    if (incomingUpdates.isFavoritePointer !== undefined && typeof incomingUpdates.isFavoritePointer !== 'boolean') {
      return res.status(400).json({ message: 'isFavoritePointer должен быть булевым значением' });
    }

    const sanitizedUpdates = {};
    for (const allowedField of ALLOWED_REMINDER_UPDATE_FIELDS) {
      if (incomingUpdates[allowedField] !== undefined) {
        sanitizedUpdates[allowedField] = incomingUpdates[allowedField];
      }
    }

    if (incomingUpdates.intervalMinutes !== undefined) {
      sanitizedUpdates.nextRunAt = new Date(Date.now() + incomingUpdates.intervalMinutes * 60 * 1000);
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

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Некорректный id напоминания' });
    }

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

export default router;
