import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import generateHandler from './api/generate.js';
import analyticsHandler from './api/analytics.js';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const app = express();
const port = 8080;

app.use(cors());
app.use(express.json());

// Proxy endpoints
app.post('/api/generate', (req, res) => generateHandler(req, res));
app.get('/api/analytics', (req, res) => analyticsHandler(req, res));

app.listen(port, () => {
  console.log(`Local Express API Server running at http://localhost:${port}`);
});
