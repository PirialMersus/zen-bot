import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { Pointer, PointerEn } from '../models/Pointer.js';
import Reminder from '../models/Reminder.js';
import User from '../models/User.js';

const router = express.Router();

const RESOLVED_JWT_SECRET = process.env.JWT_SECRET || 'zen-bot-mobile-app-secret-2024-habit-reminder';

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

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'Токен не предоставлен' });
        }

        const decoded = jwt.verify(token, RESOLVED_JWT_SECRET);
        const user = await User.findOne({ telegramId: decoded.telegramId });

        if (!user) {
            return res.status(401).json({ message: 'Пользователь не найден' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Недействительный токен' });
    }
};

router.post('/auth/request', async (req, res) => {
    try {
        const { telegramId } = req.body;

        if (!telegramId) {
            return res.status(400).json({ message: 'telegramId обязателен' });
        }

        const user = await User.findOne({ telegramId });
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден. Сначала запустите бота.' });
        }

        const code = crypto.randomBytes(3).toString('hex').toUpperCase();
        const formattedCode = `${code.slice(0, 3)}-${code.slice(3, 6)}`;

        user.authCode = formattedCode;
        user.authCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        res.json({
            message: 'Код создан',
            code: formattedCode
        });
    } catch (error) {
        console.error('AUTH_REQUEST_ERROR', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.post('/auth/verify', async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ message: 'Код обязателен' });
        }

        const isDevelopmentEnvironment = process.env.NODE_ENV === 'development';
        if (isDevelopmentEnvironment && code.toUpperCase() === 'DEV-123') {
            const developmentCreatorTelegramId = process.env.CREATOR_ID ? Number(process.env.CREATOR_ID) : 791785172;
            const devUser = await User.findOne({ telegramId: developmentCreatorTelegramId });
            if (devUser) {
                const token = jwt.sign(
                    { telegramId: devUser.telegramId, id: devUser._id },
                    RESOLVED_JWT_SECRET,
                    { expiresIn: '30d' }
                );
                return res.json({
                    token,
                    user: {
                        _id: devUser._id,
                        telegramId: devUser.telegramId,
                        timezone: devUser.timezone,
                        quietHours: devUser.quietHours
                    }
                });
            }
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
            RESOLVED_JWT_SECRET,
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
        console.error('AUTH_VERIFY_ERROR', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.get('/pointers/random', async (req, res) => {
    try {
        const requestedLanguage = req.query.language || req.query.lang || 'ru';
        const targetPointerModel = requestedLanguage === 'en' ? PointerEn : Pointer;

        const count = await targetPointerModel.countDocuments({ isActive: true });
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
        console.error('POINTERS_RANDOM_ERROR', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.get('/reminders', authMiddleware, async (req, res) => {
    try {
        const reminders = await Reminder.find({
            userId: String(req.user.telegramId)
        }).sort({ createdAt: -1 });

        res.json(reminders);
    } catch (error) {
        console.error('REMINDERS_LIST_ERROR', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.post('/reminders', authMiddleware, async (req, res) => {
    try {
        const { text, intervalMinutes, deleteAfterSeconds, soundId, isRandomPointer, isFavoritePointer } = req.body;

        if (!text || !intervalMinutes) {
            return res.status(400).json({ message: 'text и intervalMinutes обязательны' });
        }

        const now = new Date();
        const reminder = await Reminder.create({
            userId: String(req.user.telegramId),
            chatId: req.user.telegramId,
            text,
            intervalMinutes,
            deleteAfterSeconds: deleteAfterSeconds ?? 10,
            soundId: soundId || 'default',
            isActive: true,
            isRandomPointer: Boolean(isRandomPointer),
            isFavoritePointer: Boolean(isFavoritePointer),
            nextRunAt: new Date(now.getTime() + intervalMinutes * 60 * 1000)
        });

        res.status(201).json(reminder);
    } catch (error) {
        console.error('REMINDERS_CREATE_ERROR', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.patch('/reminders/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const incomingUpdates = req.body || {};

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
            { _id: id, userId: String(req.user.telegramId) },
            { $set: sanitizedUpdates },
            { new: true }
        );

        if (!reminder) {
            return res.status(404).json({ message: 'Напоминание не найдено' });
        }

        res.json(reminder);
    } catch (error) {
        console.error('REMINDERS_UPDATE_ERROR', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.delete('/reminders/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const reminder = await Reminder.findOneAndDelete({
            _id: id,
            userId: String(req.user.telegramId)
        });

        if (!reminder) {
            return res.status(404).json({ message: 'Напоминание не найдено' });
        }

        res.json({ message: 'Напоминание удалено' });
    } catch (error) {
        console.error('REMINDERS_DELETE_ERROR', error);
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
        console.error('USER_SETTINGS_GET_ERROR', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.patch('/user/settings', authMiddleware, async (req, res) => {
    try {
        const { timezone, quietHours } = req.body;

        if (timezone) req.user.timezone = timezone;
        if (quietHours) req.user.quietHours = quietHours;

        await req.user.save();

        res.json({
            _id: req.user._id,
            telegramId: req.user.telegramId,
            timezone: req.user.timezone,
            quietHours: req.user.quietHours,
            notificationChannel: req.user.notificationChannel || 'telegram'
        });
    } catch (error) {
        console.error('USER_SETTINGS_UPDATE_ERROR', error);
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
        console.error('PUSH_TOKEN_ERROR', error);
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
        console.error('NOTIFICATION_CHANNEL_ERROR', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

export default router;
