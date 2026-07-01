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

function startBot({ speedKey, text, onProgress, onFinish }) {
  const preset = SPEED_PRESETS[speedKey] || SPEED_PRESETS.steady;
  const totalChars = text.length;
  // Average English word ~= 5 chars. Convert WPM -> chars/sec.
  const baseCharsPerSec = (preset.wpm * 5) / 60;

  let typed = 0;
  let stopped = false;
  const startTime = Date.now();

  function tick() {
    if (stopped) return;
    // Natural variance: occasionally a little burst, occasionally a tiny pause.
    const variance = 0.6 + Math.random() * 0.8; // 0.6x - 1.4x
    const charsThisTick = Math.max(1, Math.round((baseCharsPerSec / 5) * variance));
    typed = Math.min(totalChars, typed + charsThisTick);

    const elapsedMin = (Date.now() - startTime) / 60000;
    const wpm = elapsedMin > 0 ? Math.round((typed / 5) / elapsedMin) : 0;
    const progress = typed / totalChars;

    onProgress({ progress, wpm, typed });

    if (typed >= totalChars) {
      stopped = true;
      onFinish({ wpm });
      return;
    }
    setTimeout(tick, 200);
  }

  const handle = setTimeout(tick, 200);
  return () => {
    stopped = true;
    clearTimeout(handle);
  };
}

module.exports = { SPEED_PRESETS, startBot };
