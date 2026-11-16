import express from 'express';
import jwt from 'jsonwebtoken';
import { bot } from '../../bot.js';
import User from '../../models/User.js';
import { logError } from '../../utils/logger.js';
import { generateAuthCode } from '../../utils/auth.js';
import { getTexts } from '../../constants/texts.js';
import { getResolvedJwtSecret } from '../utils/jwt.js';
import { isRequestWithinRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

router.post('/request', async (req, res) => {
  try {
    const clientIpAddress =
      req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (!isRequestWithinRateLimit(`auth_request:${clientIpAddress}`, 10, 60 * 1000)) {
      return res
        .status(429)
        .json({ message: 'Слишком много попыток. Пожалуйста, подожди минуту.' });
    }

    const { telegramId } = req.body;

    const telegramIdNumber = Number(telegramId);
    if (!Number.isSafeInteger(telegramIdNumber) || telegramIdNumber <= 0) {
      return res
        .status(400)
        .json({ message: 'telegramId обязателен и должен быть положительным числом' });
    }

    if (!isRequestWithinRateLimit(`auth_request_tg:${telegramIdNumber}`, 3, 10 * 60 * 1000)) {
      return res
        .status(429)
        .json({
          message: 'Слишком много запросов кода для этого аккаунта. Пожалуйста, подожди 10 минут.'
        });
    }

    const user = await User.findOne({ telegramId: telegramIdNumber });
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден. Сначала запусти бота.' });
    }

    const formattedCode = generateAuthCode();

    user.authCode = formattedCode;
    user.authCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const localizedTexts = getTexts(user.language);
    const authNotificationMessageText = localizedTexts.AUTH.CODE_MESSAGE(formattedCode);

    if (bot?.telegram?.sendMessage) {
      try {
        await bot.telegram.sendMessage(telegramIdNumber, authNotificationMessageText, {
          parse_mode: 'HTML'
        });
      } catch (telegramSendError) {
        if (process.env.NODE_ENV !== 'test') {
          logError(telegramSendError, {
            telegramId: telegramIdNumber,
            context: 'API_AUTH_REQUEST_TELEGRAM_SEND'
          });
          return res
            .status(500)
            .json({ message: 'Не удалось отправить код в Telegram. Убедись, что бот запущен.' });
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

router.post('/verify', async (req, res) => {
  try {
    const clientIpAddress =
      req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (!isRequestWithinRateLimit(`auth_verify:${clientIpAddress}`, 20, 60 * 1000)) {
      return res
        .status(429)
        .json({ message: 'Слишком много попыток. Пожалуйста, подожди минуту.' });
    }

    const { code, telegramId } = req.body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ message: 'Код обязателен и должен быть непустой строкой' });
    }

    const verificationQuery = {
      authCode: code.toUpperCase(),
      authCodeExpiresAt: { $gt: new Date() }
    };

    if (telegramId !== undefined && telegramId !== null) {
      const telegramIdNumber = Number(telegramId);
      if (!Number.isSafeInteger(telegramIdNumber) || telegramIdNumber <= 0) {
        return res.status(400).json({ message: 'telegramId должен быть положительным числом' });
      }
      if (!isRequestWithinRateLimit(`auth_verify_tg:${telegramIdNumber}`, 5, 5 * 60 * 1000)) {
        return res
          .status(429)
          .json({
            message:
              'Слишком много попыток ввода кода для этого аккаунта. Пожалуйста, подожди 5 минут.'
          });
      }
      verificationQuery.telegramId = telegramIdNumber;
    }

    const user = await User.findOne(verificationQuery);

    if (!user) {
      return res.status(401).json({ message: 'Неверный или истёкший код' });
    }

    user.authCode = null;
    user.authCodeExpiresAt = null;
    await user.save();

    const token = jwt.sign({ telegramId: user.telegramId, id: user._id }, getResolvedJwtSecret(), {
      expiresIn: '30d'
    });

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

export default router;
