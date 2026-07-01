# 🐾 Critter Dash

A cute, animal-themed typing race game — pick a critter, name it, and race
friends, strangers, or a bot with an adjustable pace. Built as a single
Node/Express + Socket.io service with a Postgres-backed leaderboard, and a
plain HTML/CSS/JS frontend (no build step, so it's easy to deploy).

## Features

- **Racer setup** — pick from 6 animals (fox, rabbit, panda, turtle, cat,
  penguin), any color, and a custom name. Saved to Postgres + the browser.
- **Quick Race** — auto-matchmaking lobby. If nobody else joins within 10s,
  a bot fills the empty lane so you always get to race.
- **Race with Friends** — creates a shareable invite link
  (`/race/ABC123`); the host starts the race once everyone's in.
- **Race vs Bot** — choose the bot's pace: Chill (25 wpm), Steady (45),
  Swift (65), or Turbo (90).
- **Randomized text** — every race stitches together random sentences from
  a 150+ sentence bank, avoiding recent repeats, so races don't get stale.
- **Animated critters** — hand-drawn SVG animals with a real run cycle
  (legs, tail, ears) that speeds up as your WPM increases, plus dust
  trails, a countdown, and confetti on the results screen.
- **Leaderboard** — top racers by best WPM, persisted in Postgres.

## Project structure

```
critter-dash/
├── server/
│   ├── server.js      # Express + Socket.io app, race room logic
│   ├── db.js           # Postgres connection (works without one too)
│   ├── schema.sql       # auto-run on boot
│   ├── texts.js         # random race-text generator
│   └── bot.js           # bot typing simulation
├── public/
│   ├── index.html
│   ├── styles.css
│   ├── animals.js       # SVG critter drawings
│   └── app.js            # frontend app logic
├── render.yaml            # one-click Render Blueprint
└── package.json
```

## Deploying to Render

**Option A — Blueprint (recommended)**
1. Push this folder to a GitHub repo.
2. In Render, choose **New > Blueprint** and point it at the repo.
   `render.yaml` will provision a free Postgres database
   (`critter-dash-db`) and a free web service (`critter-dash`), and wire
   `DATABASE_URL` between them automatically.
3. Deploy. The server runs `schema.sql` automatically on first boot.

**Option B — Manual**
1. Create a new Postgres instance on Render, copy its **Internal
   Database URL**.
2. Create a new Web Service from this repo:
   - Build command: `npm install`
   - Start command: `npm start`
3. Add an environment variable `DATABASE_URL` with the value from step 1.
4. Deploy.

The app works even without `DATABASE_URL` set (races still run in
memory), but profiles and the leaderboard won't persist — so attaching
Postgres is recommended.

## Running locally

```bash
npm install
cp .env.example .env   # point DATABASE_URL at a local/remote Postgres, or leave unset
npm start
```

Then open http://localhost:3000. Open a second private/incognito tab to
try racing against yourself.

## How the race sync works

- Race rooms live in memory on the server (`server/server.js`), keyed by a
  6-character invite code. Sockets join a Socket.io room per race code.
- Each client computes its own WPM/accuracy locally from keystrokes, then
  sends lightweight progress updates (`race:progress`) which the server
  rebroadcasts to everyone in the room — that's what moves the animals.
- When every racer finishes (or a bot completes the text), the server
  finalizes standings and writes the race + results to Postgres.

## Customizing

- **Add an animal**: add a builder function in `public/animals.js`
  following the existing shared class structure (`.leg`, `.tail`,
  `.ear-flop`), then add it to `ANIMAL_LIST` and `BUILDERS`.
- **Add more race text**: extend the `SENTENCES` array in
  `server/texts.js`.
- **Add a bot speed**: add an entry to `SPEED_PRESETS` in
  `server/bot.js`.
