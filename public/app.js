(function () {
  'use strict';

  // ---------------------------------------------------------------
  // Profile & persistent identity
  // ---------------------------------------------------------------
  const LS_PROFILE = 'cd_profile';
  const LS_CLIENT_ID = 'cd_client_id';

  function uid() {
    return 'c_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  let clientId = localStorage.getItem(LS_CLIENT_ID);
  if (!clientId) {
    clientId = uid();
    localStorage.setItem(LS_CLIENT_ID, clientId);
  }

  let profile = JSON.parse(localStorage.getItem(LS_PROFILE) || 'null');

  // Pending invite code, e.g. if the user opened /race/AB12CD
  let pendingJoinCode = null;
  const pathMatch = window.location.pathname.match(/^\/race\/([A-Za-z0-9]{4,8})$/);
  if (pathMatch) pendingJoinCode = pathMatch[1].toUpperCase();

  // ---------------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------------
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  const screens = {
    setup: $('#screen-setup'),
    home: $('#screen-home'),
    botpick: $('#screen-botpick'),
    lobby: $('#screen-lobby'),
    race: $('#screen-race'),
    results: $('#screen-results'),
  };

  function show(name) {
    Object.entries(screens).forEach(([key, el]) => { el.hidden = key !== name; });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, 2600);
  }

  // ---------------------------------------------------------------
  // Setup screen
  // ---------------------------------------------------------------
  let draftAnimal = (profile && profile.animal) || 'fox';
  let draftColor = (profile && profile.color) || COLOR_LIST[0];

  function renderAnimalGrid() {
    const grid = $('#animalGrid');
    grid.innerHTML = ANIMAL_LIST.map(a => `
      <button type="button" class="animal-option ${a.key === draftAnimal ? 'selected' : ''}" data-animal="${a.key}">
        ${getAnimalSVG(a.key, draftColor)}
        <span>${a.label}</span>
      </button>
    `).join('');
    grid.querySelectorAll('.animal-option').forEach(btn => {
      btn.addEventListener('click', () => {
        draftAnimal = btn.dataset.animal;
        renderAnimalGrid();
        renderPreview();
      });
    });
  }

  $('#customColorInput').addEventListener('input', e => {
    draftColor = e.target.value;
    $('#customColorHex').textContent = draftColor.toUpperCase();
    renderAnimalGrid();
    renderPreview();
  });

  function renderPreview() {
    $('#setupPreview').innerHTML = getAnimalSVG(draftAnimal, draftColor);
  }

  const NAME_ADJECTIVES = [
    'Swift', 'Zippy', 'Turbo', 'Nimble', 'Speedy', 'Dashing', 'Breezy', 'Snappy',
    'Rapid', 'Jolly', 'Bouncy', 'Sneaky', 'Sunny', 'Lucky', 'Silly', 'Plucky',
    'Mighty', 'Clever', 'Dizzy', 'Feisty', 'Peppy', 'Wobbly', 'Zesty', 'Perky',
  ];
  const NAME_NOUNS = [
    'Fox', 'Rabbit', 'Panda', 'Turtle', 'Cat', 'Penguin', 'Otter', 'Badger',
    'Falcon', 'Cheetah', 'Comet', 'Rocket', 'Sprinter', 'Dasher', 'Runner', 'Racer',
    'Meadow', 'Puddle', 'Noodle', 'Biscuit', 'Pebble', 'Muffin', 'Waffle', 'Nugget',
  ];

  function generateRandomName() {
    const adj = NAME_ADJECTIVES[Math.floor(Math.random() * NAME_ADJECTIVES.length)];
    const noun = NAME_NOUNS[Math.floor(Math.random() * NAME_NOUNS.length)];
    const num = Math.floor(Math.random() * 900) + 100; // 100-999
    return `${adj} ${noun} ${num}`;
  }

  function showSetup() {
    $('#nameInput').value = (profile && profile.name) || '';
    $('#customColorInput').value = draftColor;
    $('#customColorHex').textContent = draftColor.toUpperCase();
    renderAnimalGrid();
    renderPreview();
    show('setup');
  }

  $('#saveProfileBtn').addEventListener('click', async () => {
    const name = $('#nameInput').value.trim() || generateRandomName();
    profile = { name, animal: draftAnimal, color: draftColor };
    localStorage.setItem(LS_PROFILE, JSON.stringify(profile));
    identifySocket();
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, ...profile }),
      });
    } catch (e) { /* offline / no DB — still playable */ }
    $('#editProfileBtn').hidden = false;
    if (pendingJoinCode) {
      const code = pendingJoinCode;
      pendingJoinCode = null;
      joinFriendsRace(code);
    } else {
      goHome();
    }
  });

  $('#editProfileBtn').addEventListener('click', showSetup);

  // ---------------------------------------------------------------
  // Home screen
  // ---------------------------------------------------------------
  function goHome() {
    $('#welcomeLine').textContent = `Ready to run, ${profile.name}?`;
    $('#heroStage').innerHTML = getAnimalSVG(profile.animal, profile.color);
    idleAnimate($('#heroStage svg'));
    loadLeaderboard();
    show('home');
  }

  async function loadLeaderboard() {
    const el = $('#leaderboardList');
    try {
      const res = await fetch('/api/leaderboard');
      const rows = await res.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        el.innerHTML = `<p class="muted">No races yet — be the first to set a time!</p>`;
        return;
      }
      el.innerHTML = rows.map((r, i) => `
        <div class="leaderboard-row">
          <span class="rank">${i + 1}</span>
          <span class="lb-icon">${getAnimalSVG(r.animal, r.color)}</span>
          <span class="lb-name">${escapeHtml(r.name)}</span>
          <span class="lb-wpm">${Math.round(r.best_wpm)} wpm</span>
        </div>
      `).join('');
    } catch (e) {
      el.innerHTML = `<p class="muted">Leaderboard is unavailable right now.</p>`;
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function idleAnimate(svgEl) {
    if (!svgEl) return;
    svgEl.classList.add('body-bounce');
    svgEl.style.setProperty('--run-duration', '1.1s');
  }

  $('#modeQuick').addEventListener('click', () => {
    show('lobby');
    $('#lobbyEyebrow').textContent = 'Quick Race';
    $('#lobbyTitle').textContent = 'Finding you a race…';
    $('#inviteBox').hidden = true;
    $('#lobbyHostActions').hidden = true;
    $('#lobbyHint').textContent = "We'll start automatically once racers join, or add a bot after 10 seconds.";
    $('#lobbyRacers').innerHTML = '';
    socket.emit('quick_race:join');
  });

  $('#modeFriends').addEventListener('click', () => {
    show('lobby');
    $('#lobbyEyebrow').textContent = 'Race with Friends';
    $('#lobbyTitle').textContent = 'Setting up your lobby…';
    $('#inviteBox').hidden = true;
    $('#lobbyHostActions').hidden = true;
    $('#lobbyHint').textContent = '';
    $('#lobbyRacers').innerHTML = '';
    socket.emit('friends_race:create');
  });

  let joinTimeoutHandle = null;

  function joinFriendsRace(code) {
    show('lobby');
    $('#lobbyEyebrow').textContent = 'Race with Friends';
    $('#lobbyTitle').textContent = `Joining ${code}…`;
    $('#inviteBox').hidden = true;
    $('#lobbyHostActions').hidden = true;
    $('#lobbyRacers').innerHTML = '';
    $('#lobbyHint').textContent = '';

    clearTimeout(joinTimeoutHandle);
    joinTimeoutHandle = setTimeout(() => {
      toast("Couldn't join that race — the code may be wrong or the lobby closed.");
      goHome();
    }, 7000);

    whenConnected(() => {
      identifySocket();
      socket.emit('friends_race:join', { code: code.toUpperCase() });
    });
  }

  $('#joinCodeBtn').addEventListener('click', () => {
    const code = $('#joinCodeInput').value.trim().toUpperCase();
    if (!code) return toast('Enter an invite code first.');
    joinFriendsRace(code);
  });

  $('#modeBot').addEventListener('click', () => {
    renderSpeedGrid();
    show('botpick');
  });
  $('#backFromBot').addEventListener('click', goHome);

  function renderSpeedGrid() {
    const grid = $('#speedGrid');
    const entries = Object.entries(SPEED_PRESETS_CACHE);
    grid.innerHTML = entries.map(([key, p]) => `
      <button type="button" class="speed-option" data-speed="${key}">
        <span class="sp-label">${p.label}</span>
        <span class="sp-wpm">${p.wpm} WPM</span>
      </button>
    `).join('');
    grid.querySelectorAll('.speed-option').forEach(btn => {
      btn.addEventListener('click', () => {
        socket.emit('bot_race:start', { speedKey: btn.dataset.speed });
      });
    });
  }

  let SPEED_PRESETS_CACHE = {
    chill: { label: 'Chill', wpm: 25 },
    steady: { label: 'Steady', wpm: 45 },
    swift: { label: 'Swift', wpm: 65 },
    turbo: { label: 'Turbo', wpm: 90 },
  };
  fetch('/api/speeds').then(r => r.json()).then(data => { SPEED_PRESETS_CACHE = data; }).catch(() => {});

  function populateBotSelect(selectEl) {
    selectEl.innerHTML = Object.entries(SPEED_PRESETS_CACHE)
      .map(([key, p]) => `<option value="${key}">${p.label} (${p.wpm} wpm)</option>`).join('');
  }

  // ---------------------------------------------------------------
  // Socket.io
  // ---------------------------------------------------------------
  const socket = io();
  let currentRoom = null;

  function whenConnected(fn) {
    if (socket.connected) fn();
    else socket.once('connect', fn);
  }

  function identifySocket() {
    if (!profile) return;
    socket.emit('identify', { clientId, ...profile });
  }

  socket.on('connect', () => {
    identifySocket();
  });

  socket.on('error', ({ message }) => {
    clearTimeout(joinTimeoutHandle);
    toast(message || 'Something went wrong.');
    if (!screens.lobby.hidden && currentRoom === null) goHome();
  });

  socket.on('race:joined', state => {
    clearTimeout(joinTimeoutHandle);
    currentRoom = state;
    renderForState(state);
  });

  socket.on('race:state', state => {
    clearTimeout(joinTimeoutHandle);
    currentRoom = state;
    renderForState(state);
  });

  socket.on('race:countdown', ({ seconds }) => {
    show('race');
    $('#countdownOverlay').hidden = seconds <= 0;
    $('#countdownNum').textContent = seconds > 0 ? seconds : 'GO!';
  });

  socket.on('race:started', ({ startTime, text }) => {
    $('#countdownOverlay').hidden = true;
    beginTyping(text, startTime);
  });

  socket.on('race:finished', ({ results }) => {
    setTimeout(() => showResults(results), 900);
  });

  // ---------------------------------------------------------------
  // Rendering: lobby + track (shared across quick/friends/bot)
  // ---------------------------------------------------------------
  function renderForState(state) {
    if (!state) return;
    if (state.status === 'waiting') {
      renderLobby(state);
    } else {
      renderTrack(state);
      if (screens.race.hidden && screens.results.hidden) show('race');
    }
  }

  function renderLobby(state) {
    show('lobby');
    const isHost = state.hostSocketId === socket.id;
    const isFriends = state.mode === 'friends';

    $('#lobbyEyebrow').textContent = state.mode === 'quick' ? 'Quick Race'
      : state.mode === 'friends' ? 'Race with Friends' : 'Race vs Bot';
    $('#lobbyTitle').textContent = isFriends
      ? (isHost ? 'Invite your friends' : 'Waiting for the host to start…')
      : 'Hang tight, racers incoming…';

    if (isFriends) {
      $('#inviteBox').hidden = false;
      const link = `${window.location.origin}/race/${state.code}`;
      $('#inviteLink').textContent = link;
      $('#inviteCode').textContent = state.code;
    } else {
      $('#inviteBox').hidden = true;
    }

    $('#lobbyRacers').innerHTML = state.participants.map(p => `
      <div class="lobby-racer">
        ${getAnimalSVG(p.animal, p.color)}
        <span class="lr-name">${escapeHtml(p.name)}</span>
        ${p.isBot ? '<span class="lr-tag">BOT</span>' : ''}
      </div>
    `).join('');
    $$('#lobbyRacers svg').forEach(idleAnimate);

    $('#lobbyHostActions').hidden = !(isFriends && isHost);
    if (isFriends && isHost) {
      populateBotSelect($('#lobbyBotSpeed'));
      $('#lobbyHint').textContent = 'Start whenever your friends are ready — or race solo to warm up.';
    } else if (state.mode === 'quick') {
      $('#lobbyHint').textContent = "We'll start automatically once racers join, or add a bot after 10 seconds.";
    } else if (isFriends) {
      $('#lobbyHint').textContent = 'Waiting for the host to start the race.';
    }
  }

  $('#copyInviteBtn').addEventListener('click', () => {
    navigator.clipboard.writeText($('#inviteLink').textContent).then(() => toast('Invite link copied!'));
  });

  $('#startFriendsRaceBtn').addEventListener('click', () => {
    if (currentRoom) socket.emit('friends_race:start', { code: currentRoom.code });
  });

  $('#addBotBtn').addEventListener('click', () => {
    if (currentRoom) socket.emit('friends_race:add_bot', { code: currentRoom.code, speedKey: $('#lobbyBotSpeed').value });
  });

  $('#leaveLobbyBtn').addEventListener('click', () => {
    socket.emit('race:leave');
    currentRoom = null;
    goHome();
  });

  // ---------------------------------------------------------------
  // Race track rendering
  // ---------------------------------------------------------------
  const laneEls = new Map(); // socketId -> { lane, runner }

  function renderTrack(state) {
    const panel = $('#trackPanel');
    const seen = new Set();
    state.participants.forEach((p, idx) => {
      seen.add(p.socketId);
      let refs = laneEls.get(p.socketId);
      if (!refs) {
        const lane = document.createElement('div');
        lane.className = 'lane';
        const runner = document.createElement('div');
        runner.className = 'lane-runner';
        runner.innerHTML = `
          <div class="name-bubble">${escapeHtml(p.name)}<span class="wpm-tag">0</span></div>
          <div class="dust-puff"></div>
          ${getAnimalSVG(p.animal, p.color)}
        `;
        lane.appendChild(runner);
        panel.appendChild(lane);
        refs = { lane, runner };
        laneEls.set(p.socketId, refs);
      }
      const svg = refs.runner.querySelector('.critter-svg');
      const pct = Math.min(96, p.progress * 96);
      refs.runner.style.left = pct + '%';
      refs.runner.classList.toggle('is-bot', p.isBot);
      refs.runner.classList.toggle('finished', p.finished);
      refs.runner.querySelector('.wpm-tag').textContent = p.wpm || 0;

      const isSelf = p.socketId === socket.id;
      const active = state.status === 'racing' && !p.finished && (p.wpm > 0 || isSelf);
      svg.classList.toggle('idle', !active);
      svg.classList.add('body-bounce');
      const duration = active ? Math.max(0.18, 0.62 - Math.min(p.wpm, 100) * 0.004) : 1.1;
      svg.style.setProperty('--run-duration', duration + 's');
      refs.runner.classList.toggle('racing-fast', active && p.wpm > 55);
    });
    // Remove lanes for participants who left.
    for (const [socketId, refs] of laneEls.entries()) {
      if (!seen.has(socketId)) {
        refs.lane.remove();
        laneEls.delete(socketId);
      }
    }
  }

  // ---------------------------------------------------------------
  // Typing engine
  // ---------------------------------------------------------------
  let raceText = '';
  let raceStartTime = 0;
  let progressSendTimer = null;

  function beginTyping(text, startTime) {
    raceText = text;
    raceStartTime = startTime || Date.now();
    const input = $('#typingInput');
    input.value = '';
    input.disabled = false;
    input.maxLength = text.length;
    input.placeholder = 'Type the paragraph above as fast (and accurately) as you can!';
    renderTextDisplay('');
    updateStats(0, 100, 0);
    input.focus();
  }

  function renderTextDisplay(typed) {
    const disp = $('#textDisplay');
    const correctLen = longestCorrectPrefix(typed);
    let html = '';
    for (let i = 0; i < raceText.length; i++) {
      const ch = raceText[i];
      const safeCh = ch === ' ' ? ' ' : escapeHtml(ch);
      let cls = 'ch';
      if (i < correctLen) cls += ' correct';
      else if (i < typed.length) cls += ' incorrect'; // everything past the first mistake reads as red
      else if (i === typed.length) cls += ' current';
      html += `<span class="${cls}">${safeCh}</span>`;
    }
    disp.innerHTML = html;
  }

  function longestCorrectPrefix(typed) {
    let i = 0;
    while (i < typed.length && i < raceText.length && typed[i] === raceText[i]) i++;
    return i;
  }

  function updateStats(wpm, accuracy, progressPct) {
    $('#liveWpm').textContent = Math.round(wpm);
    $('#liveAccuracy').textContent = Math.round(accuracy) + '%';
    $('#liveProgress').textContent = Math.round(progressPct) + '%';
  }

  $('#typingInput').addEventListener('input', e => {
    if (!raceText || !currentRoom) return;
    const typed = e.target.value;
    renderTextDisplay(typed);

    const correctPrefix = longestCorrectPrefix(typed);
    const elapsedMin = Math.max((Date.now() - raceStartTime) / 60000, 1 / 600); // avoid /0
    const wpm = (correctPrefix / 5) / elapsedMin;
    const accuracy = typed.length ? (correctPrefix / typed.length) * 100 : 100;
    const progress = correctPrefix / raceText.length;

    updateStats(wpm, accuracy, progress * 100);

    clearTimeout(progressSendTimer);
    progressSendTimer = setTimeout(() => {
      socket.emit('race:progress', { code: currentRoom.code, progress, wpm });
    }, 80);

    if (typed === raceText) {
      e.target.disabled = true;
      socket.emit('race:finish', { code: currentRoom.code, wpm, accuracy });
    }
  });

  // ---------------------------------------------------------------
  // Results screen
  // ---------------------------------------------------------------
  function showResults(results) {
    const sorted = [...results].sort((a, b) => (a.place || 99) - (b.place || 99));
    show('results');
    $('#resultsHeadline').textContent = sorted[0] ? `${sorted[0].name} takes first place! 🎉` : 'Results are in!';

    const top3 = sorted.slice(0, 3);
    const order = ['silver', 'gold', 'bronze'];
    const podiumOrder = [top3[1], top3[0], top3[2]];
    $('#podium').innerHTML = podiumOrder.map((p, i) => {
      if (!p) return '';
      return `
        <div class="podium-spot ${order[i]}">
          ${getAnimalSVG(p.animal, p.color)}
          <div class="podium-name">${escapeHtml(p.name)}</div>
          <div class="podium-bar">${p.place}${ordinalSuffix(p.place)}</div>
        </div>`;
    }).join('');

    $('#resultsList').innerHTML = sorted.map(p => `
      <div class="result-row">
        <span class="r-place">#${p.place || '-'}</span>
        <span class="r-icon">${getAnimalSVG(p.animal, p.color)}</span>
        <span class="r-name">${escapeHtml(p.name)}${p.isBot ? ' 🤖' : ''}</span>
        <span class="r-wpm">${p.wpm || 0} wpm</span>
      </div>
    `).join('');

    if (sorted[0] && !sorted[0].isBot) launchConfetti();
    loadLeaderboard();
  }

  function ordinalSuffix(n) {
    if (!n) return '';
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  function launchConfetti() {
    const colors = COLOR_LIST;
    for (let i = 0; i < 60; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = 2 + Math.random() * 1.6 + 's';
      piece.style.opacity = 0.6 + Math.random() * 0.4;
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 4000);
    }
  }

  $('#raceAgainBtn').addEventListener('click', () => {
    laneEls.clear();
    $('#trackPanel').innerHTML = '';
    goHome();
  });
  $('#backHomeBtn').addEventListener('click', () => {
    laneEls.clear();
    $('#trackPanel').innerHTML = '';
    goHome();
  });

  // ---------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------
  const footerYearEl = $('#footerYear');
  if (footerYearEl) footerYearEl.textContent = new Date().getFullYear();

  if (profile) {
    $('#editProfileBtn').hidden = false;
    identifySocket();
    if (pendingJoinCode) {
      const code = pendingJoinCode;
      pendingJoinCode = null;
      joinFriendsRace(code);
    } else {
      goHome();
    }
  } else {
    showSetup();
  }
})();
