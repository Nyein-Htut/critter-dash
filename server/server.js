require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { customAlphabet } = require('nanoid');

const db = require('./db');
const { generateRaceText } = require('./texts');
const { SPEED_PRESETS, startBot } = require('./bot');

const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6); // no ambiguous chars

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// ---------------------------------------------------------------------
// In-memory race room state. Rooms are ephemeral by nature (a live race),
// so they live in memory; only the final results get persisted to Postgres.
// ---------------------------------------------------------------------
const rooms = new Map(); // code -> room
let quickQueueCode = null; // code of the currently-open quick-match lobby

function makeParticipant(socketId, profile, extra = {}) {
  return {
    socketId,
    clientId: profile.clientId,
    name: profile.name,
    animal: profile.animal,
    color: profile.color,
    progress: 0,
    wpm: 0,
    finished: false,
    place: null,
    isBot: false,
    ...extra,
  };
}

function publicRoomState(room) {
  return {
    code: room.code,
    mode: room.mode,
    status: room.status,
    text: room.text,
    hostSocketId: room.hostSocketId,
    startTime: room.startTime || null,
    participants: Object.values(room.participants).map(p => ({
      socketId: p.socketId,
      name: p.name,
      animal: p.animal,
      color: p.color,
      progress: p.progress,
      wpm: p.wpm,
      finished: p.finished,
      place: p.place,
      isBot: p.isBot,
    })),
  };
}

function broadcastState(room) {
  io.to(room.code).emit('race:state', publicRoomState(room));
}

function createRoom(mode) {
  const code = nanoid();
  const room = {
    code,
    mode, // 'quick' | 'friends' | 'bot'
    status: 'waiting', // waiting | countdown | racing | finished
    text: generateRaceText(3),
    participants: {},
    hostSocketId: null,
    startTime: null,
    countdownTimer: null,
    lobbyTimer: null,
    botStoppers: [],
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

function removeRoomIfEmpty(room) {
  const humanCount = Object.values(room.participants).filter(p => !p.isBot).length;
  if (humanCount === 0) {
    room.botStoppers.forEach(stop => stop());
    clearTimeout(room.countdownTimer);
    clearTimeout(room.lobbyTimer);
    rooms.delete(room.code);
    if (quickQueueCode === room.code) quickQueueCode = null;
  }
}

function beginCountdown(room, seconds = 3) {
  if (room.status === 'countdown' || room.status === 'racing') return;
  room.status = 'countdown';
  broadcastState(room);
  let remaining = seconds;
  io.to(room.code).emit('race:countdown', { seconds: remaining });
  room.countdownTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(room.countdownTimer);
      startRace(room);
    } else {
      io.to(room.code).emit('race:countdown', { seconds: remaining });
    }
  }, 1000);
}

function startRace(room) {
  room.status = 'racing';
  room.startTime = Date.now();
  broadcastState(room);
  io.to(room.code).emit('race:started', { startTime: room.startTime, text: room.text });

  // Kick off any bots in this room.
  Object.values(room.participants)
    .filter(p => p.isBot)
    .forEach(bot => {
      const stop = startBot({
        speedKey: bot.botSpeed,
        text: room.text,
        onProgress: ({ progress, wpm }) => {
          bot.progress = progress;
          bot.wpm = wpm;
          broadcastState(room);
        },
        onFinish: ({ wpm }) => {
          finishParticipant(room, bot.socketId, { wpm, accuracy: 100 });
        },
      });
      room.botStoppers.push(stop);
    });
}

function finishParticipant(room, socketId, { wpm, accuracy }) {
  const p = room.participants[socketId];
  if (!p || p.finished) return;
  p.finished = true;
  p.progress = 1;
  p.wpm = Math.round(wpm);
  p.accuracy = Math.round(accuracy);
  const placedSoFar = Object.values(room.participants).filter(x => x.finished).length;
  p.place = placedSoFar;
  broadcastState(room);

  const everyoneDone = Object.values(room.participants).every(x => x.finished);
  if (everyoneDone) {
    finishRace(room);
  }
}

async function finishRace(room) {
  room.status = 'finished';
  room.botStoppers.forEach(stop => stop());
  broadcastState(room);
  io.to(room.code).emit('race:finished', { results: publicRoomState(room).participants });

  // Persist to Postgres (no-op if DB isn't configured).
  try {
    const raceInsert = await db.query(
      `INSERT INTO races (code, mode, text_content, status, started_at, finished_at)
       VALUES ($1,$2,$3,'finished',to_timestamp($4/1000.0),now())
       RETURNING id`,
      [room.code, room.mode, room.text, room.startTime]
    );
    const raceId = raceInsert.rows[0]?.id;
    for (const p of Object.values(room.participants)) {
      await db.query(
        `INSERT INTO race_results (race_id, user_id, display_name, animal, color, is_bot, wpm, accuracy, place)
         VALUES ($1, (SELECT id FROM users WHERE client_id=$2), $3,$4,$5,$6,$7,$8,$9)`,
        [raceId, p.clientId || null, p.name, p.animal, p.color, p.isBot, p.wpm || 0, p.accuracy || 0, p.place]
      );
      if (!p.isBot && p.clientId) {
        await db.query(
          `UPDATE users SET
             races_played = races_played + 1,
             races_won = races_won + $2,
             best_wpm = GREATEST(best_wpm, $3),
             updated_at = now()
           WHERE client_id = $1`,
          [p.clientId, p.place === 1 ? 1 : 0, p.wpm || 0]
        );
      }
    }
  } catch (err) {
    console.error('[race] failed to persist results:', err.message);
  }

  // Clean the room up after a while so late stragglers can still see results.
  setTimeout(() => rooms.delete(room.code), 5 * 60 * 1000);
}

// ---------------------------------------------------------------------
// REST API
// ---------------------------------------------------------------------

app.get('/api/health', (req, res) => res.json({ ok: true, db: db.dbEnabled() }));

app.get('/api/speeds', (req, res) => {
  res.json(SPEED_PRESETS);
});

app.post('/api/profile', async (req, res) => {
  const { clientId, name, animal, color } = req.body || {};
  if (!clientId || !name || !animal || !color) {
    return res.status(400).json({ error: 'clientId, name, animal, and color are required.' });
  }
  try {
    const result = await db.query(
      `INSERT INTO users (client_id, name, animal, color)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (client_id) DO UPDATE SET name=$2, animal=$3, color=$4, updated_at=now()
       RETURNING id, client_id, name, animal, color, races_played, races_won, best_wpm`,
      [clientId, name.slice(0, 24), animal, color]
    );
    res.json(result.rows[0] || { clientId, name, animal, color, races_played: 0, races_won: 0, best_wpm: 0 });
  } catch (err) {
    console.error('[api/profile] error:', err.message);
    res.status(500).json({ error: 'Could not save profile.' });
  }
});

app.get('/api/profile/:clientId', async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM users WHERE client_id=$1`, [req.params.clientId]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: 'Could not load profile.' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT name, animal, color, best_wpm, races_played, races_won
       FROM users ORDER BY best_wpm DESC LIMIT 20`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not load leaderboard.' });
  }
});

// Serve the app for direct-link race codes like /race/AB12CD
app.get('/race/:code', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ---------------------------------------------------------------------
// Socket.io: real-time race lifecycle
// ---------------------------------------------------------------------

io.on('connection', socket => {
  let profile = null;
  let currentRoomCode = null;

  socket.on('identify', payload => {
    profile = {
      clientId: payload.clientId,
      name: (payload.name || 'Racer').slice(0, 24),
      animal: payload.animal || 'fox',
      color: payload.color || '#FF6B5C',
    };
  });

  function joinRoom(room, extra = {}) {
    currentRoomCode = room.code;
    socket.join(room.code);
    room.participants[socket.id] = makeParticipant(socket.id, profile, extra);
    if (!room.hostSocketId) room.hostSocketId = socket.id;
    broadcastState(room);
    socket.emit('race:joined', publicRoomState(room));
  }

  // ---- Quick Race: auto-matchmaking lobby ----
  socket.on('quick_race:join', () => {
    if (!profile) return socket.emit('error', { message: 'Set up your racer first.' });

    let room = quickQueueCode ? rooms.get(quickQueueCode) : null;
    if (!room || room.status !== 'waiting' || Object.keys(room.participants).length >= 4) {
      room = createRoom('quick');
      quickQueueCode = room.code;
      room.lobbyTimer = setTimeout(() => {
        if (room.status !== 'waiting') return;
        const humanCount = Object.values(room.participants).length;
        if (humanCount < 2) {
          // Fill the empty seat with a friendly bot so solo players still get a race.
          const botId = 'bot-' + nanoid();
          room.participants[botId] = makeParticipant(botId, {
            clientId: null,
            name: 'Rusty (Bot)',
            animal: 'fox',
            color: '#FF9F45',
          }, { isBot: true, botSpeed: 'steady', socketId: botId });
        }
        if (quickQueueCode === room.code) quickQueueCode = null;
        beginCountdown(room);
      }, 10000);
    }

    joinRoom(room);

    if (Object.keys(room.participants).length >= 4) {
      clearTimeout(room.lobbyTimer);
      if (quickQueueCode === room.code) quickQueueCode = null;
      beginCountdown(room, 3);
    }
  });

  // ---- Friends: create + join by code ----
  socket.on('friends_race:create', () => {
    if (!profile) return socket.emit('error', { message: 'Set up your racer first.' });
    const room = createRoom('friends');
    joinRoom(room);
  });

  socket.on('friends_race:join', ({ code }) => {
    if (!profile) return socket.emit('error', { message: 'Set up your racer first.' });
    const room = rooms.get((code || '').toUpperCase());
    if (!room) return socket.emit('error', { message: 'That race code was not found.' });
    if (room.status !== 'waiting') return socket.emit('error', { message: 'That race has already started.' });
    joinRoom(room);
  });

  socket.on('friends_race:start', ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.hostSocketId !== socket.id) return;
    beginCountdown(room);
  });

  socket.on('friends_race:add_bot', ({ code, speedKey }) => {
    const room = rooms.get(code);
    if (!room || room.hostSocketId !== socket.id || room.status !== 'waiting') return;
    const botId = 'bot-' + nanoid();
    const preset = SPEED_PRESETS[speedKey] ? speedKey : 'steady';
    room.participants[botId] = makeParticipant(botId, {
      clientId: null,
      name: `${SPEED_PRESETS[preset].label} Bot`,
      animal: ['fox', 'rabbit', 'panda', 'turtle', 'cat', 'penguin'][Math.floor(Math.random() * 6)],
      color: '#7C6EF2',
    }, { isBot: true, botSpeed: preset, socketId: botId });
    broadcastState(room);
  });

  // ---- Bot race: solo vs a chosen bot speed ----
  socket.on('bot_race:start', ({ speedKey }) => {
    if (!profile) return socket.emit('error', { message: 'Set up your racer first.' });
    const room = createRoom('bot');
    joinRoom(room);
    const preset = SPEED_PRESETS[speedKey] ? speedKey : 'steady';
    const botId = 'bot-' + nanoid();
    room.participants[botId] = makeParticipant(botId, {
      clientId: null,
      name: `${SPEED_PRESETS[preset].label} Bot`,
      animal: 'panda',
      color: '#7C6EF2',
    }, { isBot: true, botSpeed: preset, socketId: botId });
    broadcastState(room);
    beginCountdown(room, 3);
  });

  // ---- In-race progress ----
  socket.on('race:progress', ({ code, progress, wpm }) => {
    const room = rooms.get(code);
    if (!room || room.status !== 'racing') return;
    const p = room.participants[socket.id];
    if (!p || p.finished) return;
    p.progress = Math.max(0, Math.min(1, progress));
    p.wpm = Math.round(wpm);
    broadcastState(room);
  });

  socket.on('race:finish', ({ code, wpm, accuracy }) => {
    const room = rooms.get(code);
    if (!room) return;
    finishParticipant(room, socket.id, { wpm, accuracy });
  });

  socket.on('race:leave', () => cleanupParticipant());

  socket.on('disconnect', () => cleanupParticipant());

  function cleanupParticipant() {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (room) {
      delete room.participants[socket.id];
      if (room.hostSocketId === socket.id) {
        const remaining = Object.keys(room.participants);
        room.hostSocketId = remaining[0] || null;
      }
      broadcastState(room);
      removeRoomIfEmpty(room);
    }
    currentRoomCode = null;
  }
});

const PORT = process.env.PORT || 3000;

db.migrate()
  .catch(err => console.error('[db] migration failed:', err.message))
  .finally(() => {
    server.listen(PORT, () => console.log(`Critter Dash running on port ${PORT}`));
  });
