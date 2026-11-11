import cors from 'cors';
import express from 'express';
import apiRouter from './api/index.js';

const app = express();

const configuredAllowedOrigins = process.env.ALLOWED_ORIGINS;
const resolvedCorsOptions = configuredAllowedOrigins
  ? {
      origin: configuredAllowedOrigins.split(',').map(allowedOriginItem => allowedOriginItem.trim()),
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true
    }
  : {};

app.use(cors(resolvedCorsOptions));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('zen-bot is running 🧘');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', apiRouter);

const PORT = process.env.PORT || 3000;

export const validateServerEnvironment = () => {
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('Критическая ошибка конфигурации: переменная JWT_SECRET обязательна в production окружении');
  }
};

export const startServer = () => {
  validateServerEnvironment();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};
