// src/api/index.js
// API endpoints для мобильного приложения HabitReminder

import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { Pointer } from '../models/Pointer.js';
import Reminder from '../models/Reminder.js';
import User from '../models/User.js';

const router = express.Router();

// JWT Secret - добавь в .env: JWT_SECRET=your-secret-key
const JWT_SECRET = process.env.JWT_SECRET || 'habit-reminder-jwt-secret-2024';

// Middleware для проверки токена
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'Токен не предоставлен' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
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

// ==================== AUTH ====================

// POST /api/auth/request - Запрос кода авторизации
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

        // Генерируем код
        const code = crypto.randomBytes(3).toString('hex').toUpperCase();
        const formattedCode = `${code.slice(0, 3)}-${code.slice(3, 6)}`;

        // Сохраняем код (действителен 10 минут)
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

// POST /api/auth/verify - Проверка кода
router.post('/auth/verify', async (req, res) => {
    try {
        const { code } = req.body;
        console.log('Verify request, code:', code);

        if (!code) {
            return res.status(400).json({ message: 'Код обязателен' });
        }

        // DEV code for testing - always works for creator
        if (code.toUpperCase() === 'DEV-123') {
            const devUser = await User.findOne({ telegramId: 791785172 });
            if (devUser) {
                const token = jwt.sign(
                    { telegramId: devUser.telegramId, id: devUser._id },
                    JWT_SECRET,
                    { expiresIn: '30d' }
                );
                console.log('DEV code verified for user:', devUser.telegramId);
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
            console.log('No user found with code:', code);
            return res.status(401).json({ message: 'Неверный или истёкший код' });
        }

        // Очищаем код
        user.authCode = null;
        user.authCodeExpiresAt = null;
        await user.save();

        // Генерируем JWT токен
        const token = jwt.sign(
            { telegramId: user.telegramId, id: user._id },
            JWT_SECRET,
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

// ==================== POINTERS ====================

// GET /api/pointers/random - Случайный указатель (публичный)
router.get('/pointers/random', async (req, res) => {
    try {
        const count = await Pointer.countDocuments({ isActive: true });
        if (!count) {
            return res.status(404).json({ message: 'Указатели не найдены' });
        }

        const random = Math.floor(Math.random() * count);
        const [pointer] = await Pointer.find({ isActive: true })
            .skip(random)
            .limit(1);

        res.json(pointer);
    } catch (error) {
        console.error('POINTERS_RANDOM_ERROR', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// ==================== REMINDERS ====================

// GET /api/reminders - Список напоминаний пользователя
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

// POST /api/reminders - Создать напоминание
router.post('/reminders', authMiddleware, async (req, res) => {
    try {
        const { text, intervalMinutes, deleteAfterSeconds, soundId } = req.body;

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
            nextRunAt: new Date(now.getTime() + intervalMinutes * 60 * 1000)
        });

        res.status(201).json(reminder);
    } catch (error) {
        console.error('REMINDERS_CREATE_ERROR', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// PATCH /api/reminders/:id - Обновить напоминание
router.patch('/reminders/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const reminder = await Reminder.findOneAndUpdate(
            { _id: id, userId: String(req.user.telegramId) },
            { $set: updates },
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

// DELETE /api/reminders/:id - Удалить напоминание
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

// ==================== USER SETTINGS ====================

// GET /api/user/settings - Получить настройки
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

// PATCH /api/user/settings - Обновить настройки
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

// POST /api/user/push-token - Сохранить push token
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

// PUT /api/user/notification-channel - Обновить канал уведомлений
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
