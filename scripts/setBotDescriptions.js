import 'dotenv/config';

const targetBotToken = process.argv[2] || process.env.BOT_TOKEN;

if (!targetBotToken) {
  console.error('Bot token is required. Pass it as an argument or set BOT_TOKEN in .env');
  process.exit(1);
}

const englishBotName = 'Zen Pointers | Reminders';
const russianBotName = 'Указатели ясности | Напоминания';

const englishDescription = `This bot is designed to gently bring you back to clarity.

What's inside:
🧘‍♂️ 1,000+ non-duality pointers (Nisargadatta, Ramana Maharshi, Papaji, Tolle, Spira) anytime at a tap.
⏳ Smart reminders — texts, photos, or videos with flexible intervals.
🌙 Quiet Hours — respects your sleep at night.
🗑 Auto-clean mode — keeps chat distraction-free.

Press "Start" below to begin 👇`;

const russianDescription = `Этот бот создан, чтобы мягко возвращать тебя в состояние ясности.

Что внутри:
🧘‍♂️ 1000+ указателей недвойственности (Нисаргадатта, Рамана Махарши, Пападжи, Толле, Спайра) — в любой момент.
⏳ Умные напоминания — фразы, фото или видео с любой частотой.
🌙 Режим «Не беспокоить» — молчит ночью.
🗑 Автоудаление — чат не захламляется.

Нажми «Запустить» прямо сейчас 👇`;

const englishShortDescription = 'Non-duality pointers and gentle reminders to guide you back to inner clarity. 🧘‍♂️✨';
const russianShortDescription = 'Указатели недвойственности и умные напоминания для мягкого возвращения в состояние ясности. 🧘‍♂️✨';

const executeApiMethod = async (methodName, requestPayload) => {
  const apiEndpointUrl = `https://api.telegram.org/bot${targetBotToken}/${methodName}`;
  const httpResponse = await fetch(apiEndpointUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestPayload)
  });
  return httpResponse.json();
};

const runSetup = async () => {
  const botInfoResponse = await executeApiMethod('getMe', {});
  if (!botInfoResponse.ok) {
    console.error('Invalid token or Telegram API error:', botInfoResponse);
    process.exit(1);
  }

  console.log(`Configuring bot descriptions: @${botInfoResponse.result.username}`);

  await executeApiMethod('setMyName', { name: russianBotName });
  await executeApiMethod('setMyName', { name: russianBotName, language_code: 'ru' });
  await executeApiMethod('setMyName', { name: englishBotName, language_code: 'en' });

  await executeApiMethod('setMyDescription', { description: russianDescription });
  await executeApiMethod('setMyDescription', { description: russianDescription, language_code: 'ru' });
  await executeApiMethod('setMyDescription', { description: englishDescription, language_code: 'en' });

  await executeApiMethod('setMyShortDescription', { short_description: russianShortDescription });
  await executeApiMethod('setMyShortDescription', { short_description: russianShortDescription, language_code: 'ru' });
  await executeApiMethod('setMyShortDescription', { short_description: englishShortDescription, language_code: 'en' });

  console.log('Descriptions and names updated successfully with Russian as default!');
};

runSetup();
