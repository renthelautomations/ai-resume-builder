import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import generateHandler from './api/generate.js';
import analyticsHandler from './api/analytics.js';
import purchaseEmailHandler from './api/purchase-email.js';
import telegramWebhookHandler from './api/telegram-webhook.js';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.push.local' });

const app = express();
const port = 8080;

app.use(cors());
app.use(express.json());

// Proxy endpoints
app.post('/api/generate', (req, res) => generateHandler(req, res));
app.get('/api/analytics', (req, res) => analyticsHandler(req, res));
app.post('/api/purchase-email', (req, res) => purchaseEmailHandler(req, res));
app.post('/api/telegram-webhook', (req, res) => telegramWebhookHandler(req, res));

app.listen(port, () => {
  console.log(`Local Express API Server running at http://localhost:${port}`);
});
