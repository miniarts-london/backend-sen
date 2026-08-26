# MiniArts Steps backend

Node server that asks Claude for the next home practice. The React Native app posts the child’s profile and history here. The Anthropic API key stays on this server, never in the app.

## Setup

```sh
cd "/Users/kaorinishimura/Documents/GitHub/backend-sen"
cp .env.example .env
```

Open `.env` and paste your key from [Anthropic Console](https://console.anthropic.com/settings/keys):

```
ANTHROPIC_API_KEY=sk-ant-...
```

Then:

```sh
npm install
npm run dev
```

Check it is up: [http://localhost:3001/health](http://localhost:3001/health)

## Connect the app

In the MiniArts Steps app folder, create `.env` with:

```
EXPO_PUBLIC_EXERCISE_API_URL=http://localhost:3001
```

For a phone or the published web app, localhost will not work. Use your computer’s local IP (for example `http://192.168.1.131:3001`) on the same Wi‑Fi, or host this server and put that public URL in the app env.

Restart Expo after changing the env file.

## API

`POST /suggest-exercise`

Request:

```json
{
  "childName": "Sam",
  "childAge": 7,
  "supportNeeds": ["autism", "sensory", "other"],
  "otherSupportNeed": "Needs extra time at transitions",
  "frequency": "weekly",
  "pastExercises": [
    {
      "title": "Wall pushes",
      "suggestedAt": "2026-08-20T10:00:00.000Z",
      "status": "completed",
      "updateSummaries": ["Loved the wall pushes, asked to stop after two rounds"]
    }
  ]
}
```

Response:

```json
{
  "title": "Quiet corner stretch",
  "description": "A short, predictable stretch before homework.",
  "steps": ["Step one", "Step two", "Step three"],
  "durationMinutes": 6,
  "materials": ["Yoga mat or cushion"],
  "whyItHelps": "Gives a calm start after a transition.",
  "focus": ["anxiety", "autism"]
}
```

`GET /health` returns whether a Claude key is configured. It does not expose the key.
