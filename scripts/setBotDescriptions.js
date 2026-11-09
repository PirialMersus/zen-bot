import 'dotenv/config';

const targetBotToken = process.argv[2] || process.env.BOT_TOKEN;

if (!targetBotToken) {
  console.error('Bot token is required. Pass it as an argument or set BOT_TOKEN in .env');
  process.exit(1);
}

const englishBotName = 'Zen Pointers | Reminders';
const russianBotName = 'Указатели ясности | Напоминания';
const ukrainianBotName = 'Вказівники ясності | Нагадування';
const spanishBotName = 'Punteros de claridad | Recordatorios';

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

const ukrainianDescription = `Цей бот створений, щоб м'яко повертати тебе у стан ясності.

Що всередині:
🧘‍♂️ 1000+ вказівників недвоїстості (Нісаргадатта, Рамана Махарші, Пападжі, Толле, Спайра) — у будь-який момент.
⏳ Розумні нагадування — фрази, фото або відео з будь-якою частотою.
🌙 Режим «Не турбувати» — мовчить уночі.
🗑 Автовидалення — чат не захаращується.

Натисни «Розпочати» прямо зараз 👇`;

const spanishDescription = `Este bot está creado para devolverte suavemente al estado de claridad.

Qué hay dentro:
🧘‍♂️ Más de 1000 punteros de no-dualidad (Nisargadatta, Ramana Maharshi, Papaji, Tolle, Spira) en cualquier momento.
⏳ Recordatorios inteligentes: frases, fotos o videos con cualquier frecuencia.
🌙 Modo «No molestar»: silencio durante la noche.
🗑 Autoeliminación: el chat se mantiene despejado.

Pulsa «Iniciar» ahora mismo 👇`;

const englishShortDescription = 'Your pocket satsang. Precise words of masters that bring you back to practice.';
const russianShortDescription = 'Твой карманный сатсанг. Точные фразы мастеров, возвращающие к практике.';
const ukrainianShortDescription = 'Твій кишеньковий сатсанг. Точні фрази майстрів, що повертають до практики.';
const spanishShortDescription = 'Tu satsang de bolsillo. Frases precisas de maestros que te devuelven a la práctica.';

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

  await executeApiMethod('setMyName', { name: englishBotName });
  await executeApiMethod('setMyName', { name: englishBotName, language_code: 'en' });
  await executeApiMethod('setMyName', { name: russianBotName, language_code: 'ru' });
  await executeApiMethod('setMyName', { name: ukrainianBotName, language_code: 'uk' });
  await executeApiMethod('setMyName', { name: spanishBotName, language_code: 'es' });

  await executeApiMethod('setMyDescription', { description: englishDescription });
  await executeApiMethod('setMyDescription', { description: englishDescription, language_code: 'en' });
  await executeApiMethod('setMyDescription', { description: russianDescription, language_code: 'ru' });
  await executeApiMethod('setMyDescription', { description: ukrainianDescription, language_code: 'uk' });
  await executeApiMethod('setMyDescription', { description: spanishDescription, language_code: 'es' });

  await executeApiMethod('setMyShortDescription', { short_description: englishShortDescription });
  await executeApiMethod('setMyShortDescription', { short_description: englishShortDescription, language_code: 'en' });
  await executeApiMethod('setMyShortDescription', { short_description: russianShortDescription, language_code: 'ru' });
  await executeApiMethod('setMyShortDescription', { short_description: ukrainianShortDescription, language_code: 'uk' });
  await executeApiMethod('setMyShortDescription', { short_description: spanishShortDescription, language_code: 'es' });

  console.log('Descriptions and names updated successfully with English as default!');
};

runSetup();
