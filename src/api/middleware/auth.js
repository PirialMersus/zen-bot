import jwt from 'jsonwebtoken';
import User from '../../models/User.js';
import { getResolvedJwtSecret } from '../utils/jwt.js';

export const authMiddleware = async (req, res, next) => {
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
