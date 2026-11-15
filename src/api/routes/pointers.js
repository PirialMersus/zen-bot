import express from 'express';
import { Pointer, PointerEn, PointerUk, PointerEs } from '../../models/Pointer.js';
import { logError } from '../../utils/logger.js';

const router = express.Router();

router.get('/random', async (req, res) => {
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

export default router;
