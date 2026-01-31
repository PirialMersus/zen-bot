// src/server.js
import cors from 'cors';
import express from 'express';
import apiRouter from './api/index.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check (для Render)
app.get('/', (req, res) => {
  res.send('zen-bot is running 🧘');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes для мобильного приложения
app.use('/api', apiRouter);

const PORT = process.env.PORT || 3000;

export const startServer = () => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};
