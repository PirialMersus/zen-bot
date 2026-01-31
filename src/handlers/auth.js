// src/handlers/auth.js
import crypto from 'node:crypto';
import { Markup } from 'telegraf';
import User from '../models/User.js';

export const handleGetAuthCode = async (ctx) => {
    try {
        const user = await User.findOne({ telegramId: ctx.from.id });

        if (!user) {
            await ctx.reply('❌ Ошибка: пользователь не найден');
            return;
        }

        // Генерируем код
        const code = crypto.randomBytes(3).toString('hex').toUpperCase();
        const formattedCode = `${code.slice(0, 3)}-${code.slice(3, 6)}`;

        // Сохраняем код (действителен 10 минут)
        user.authCode = formattedCode;
        user.authCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        await ctx.reply(
            `🔐 Ваш код для входа в приложение:\n\n` +
            `<code>${formattedCode}</code>\n\n` +
            `⏱ Код действителен 10 минут.\n` +
            `Введите его в приложении для авторизации.`,
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🔄 Получить новый код', 'get_auth_code')]
                ])
            }
        );
    } catch (error) {
        console.error('GET_AUTH_CODE_ERROR', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
};
