import jwt from 'jsonwebtoken';
import User from '../../models/User.js';
import { getResolvedJwtSecret } from '../utils/jwt.js';
import { logError } from '../../utils/logger.js';

export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Токен не предоставлен' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, getResolvedJwtSecret());
  } catch {
    return res.status(401).json({ message: 'Недействительный токен' });
  }

  try {
    const user = await User.findOne({ telegramId: decoded.telegramId });

    if (!user) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }

    req.user = user;
    const currentActivityDate = new Date();
    user.lastActivityAt = currentActivityDate;
    User.updateOne({ _id: user._id }, { $set: { lastActivityAt: currentActivityDate } }).catch(
      (error) => {
        logError(error, { context: 'API_USER_ACTIVITY_UPDATE' });
      }
    );
    next();
  } catch (databaseError) {
    logError(databaseError, { context: 'AUTH_MIDDLEWARE_DB_ERROR' });
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
};
