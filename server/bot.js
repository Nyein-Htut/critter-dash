// Simulates a bot typist. Bots "type" at a target WPM with small natural
// variance (nobody types at a perfectly constant speed), emitting progress
// ticks the same shape as a real player so the client code doesn't need to
// special-case them.

const SPEED_PRESETS = {
  chill: { label: 'Chill', wpm: 25 },
  steady: { label: 'Steady', wpm: 45 },
  swift: { label: 'Swift', wpm: 65 },
  turbo: { label: 'Turbo', wpm: 90 },
};

const TICK_MS = 150;

function startBot({ speedKey, text, onProgress, onFinish }) {
  const preset = SPEED_PRESETS[speedKey] || SPEED_PRESETS.steady;
  const totalChars = text.length;
  // Average English word ~= 5 chars. Convert WPM -> chars/sec.
  const baseCharsPerSec = (preset.wpm * 5) / 60;

  // Accumulate fractional characters each tick rather than forcing a whole
  // character per tick — a hard "at least 1 char per tick" floor would set
  // an artificial minimum speed (e.g. 1 char / 200ms = 60wpm), which is
  // exactly what made every preset below Turbo feel identical.
  let charsAccumulator = 0;
  let typed = 0;
  let stopped = false;
  const startTime = Date.now();

  function tick() {
    if (stopped) return;
    // Natural variance: occasionally a little burst, occasionally a tiny pause.
    const variance = 0.55 + Math.random() * 0.9; // 0.55x - 1.45x
    charsAccumulator += baseCharsPerSec * variance * (TICK_MS / 1000);
    typed = Math.min(totalChars, Math.floor(charsAccumulator));

    const elapsedMin = (Date.now() - startTime) / 60000;
    const wpm = elapsedMin > 0 ? Math.round((typed / 5) / elapsedMin) : 0;
    const progress = typed / totalChars;

    onProgress({ progress, wpm, typed });

    if (typed >= totalChars) {
      stopped = true;
      onFinish({ wpm });
      return;
    }
    setTimeout(tick, TICK_MS);
  }

  const handle = setTimeout(tick, TICK_MS);
  return () => {
    stopped = true;
    clearTimeout(handle);
  };
}

module.exports = { SPEED_PRESETS, startBot };
