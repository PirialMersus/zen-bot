import express from 'express';
import authRouter from './routes/auth.js';
import remindersRouter from './routes/reminders.js';
import pointersRouter from './routes/pointers.js';
import userRouter from './routes/user.js';

const router = express.Router();

router.use('/auth', authRouter);
router.use('/reminders', remindersRouter);
router.use('/pointers', pointersRouter);
router.use('/user', userRouter);

export default router;
