import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { suggestExerciseWithClaude } from './claude.js';
import { validateSuggestionRequest } from './validate.js';

const app = express();
const port = Number(process.env.PORT) || 3001;

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed'));
    },
  }),
);
app.use(express.json({ limit: '32kb' }));

function statusPayload() {
  return {
    ok: true,
    service: 'backend-sen',
    claudeConfigured: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    endpoints: {
      health: 'GET /health',
      suggestExercise: 'POST /suggest-exercise',
    },
  };
}

app.get('/', (_req, res) => {
  const status = statusPayload();
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MiniArts Steps backend</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 3rem auto; padding: 0 1.5rem; color: #1c2a2e; background: #f4efe6; line-height: 1.5; }
    code { background: #ebe4d6; padding: 0.1rem 0.35rem; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>MiniArts Steps backend</h1>
  <p>This is an API for Claude exercise suggestions, not a website or a plugin installer.</p>
  <p>Claude is ${status.claudeConfigured ? 'connected' : 'not configured'}.</p>
  <ul>
    <li>Check status: <a href="/health"><code>GET /health</code></a></li>
    <li>Ask Claude for a practice: <code>POST /suggest-exercise</code></li>
  </ul>
  <p>Point the MiniArts Steps app at <code>EXPO_PUBLIC_EXERCISE_API_URL=http://localhost:3001</code></p>
</body>
</html>`);
});

app.get('/health', (_req, res) => {
  res.json(statusPayload());
});

app.get('/add-plugin', (_req, res) => {
  res.status(404).json({
    error: 'This server is not a plugin host.',
    hint: 'Open http://localhost:3001/ to see the API status, or POST /suggest-exercise from the MiniArts Steps app.',
  });
});

app.post('/suggest-exercise', async (req, res) => {
  const parsed = validateSuggestionRequest(req.body);
  if (parsed.error) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  try {
    const exercise = await suggestExerciseWithClaude(parsed.context);
    res.json(exercise);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Could not suggest an exercise.';
    const status = message.includes('ANTHROPIC_API_KEY') ? 500 : 502;
    res.status(status).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`MiniArts Steps backend listening on http://localhost:${port}`);
});
