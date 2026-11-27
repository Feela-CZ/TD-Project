const STORAGE_KEY = 'kethra-sound';
const CANNON_GAP = .13;

function soundPreference() {
  try { return localStorage.getItem(STORAGE_KEY) !== 'off'; }
  catch { return true; }
}

export function createGameAudio() {
  const Audio = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  let enabled = soundPreference();
  let context, output, noise;
  let lastCannon = -Infinity;

  async function unlock() {
    if (!Audio || !enabled) return false;
    try {
      if (!context) {
        context = new Audio();
        output = context.createGain();
        output.gain.value = .42;
        output.connect(context.destination);
        noise = context.createBuffer(1, Math.ceil(context.sampleRate * .14), context.sampleRate);
        const samples = noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      }
      if (context.state !== 'running') await context.resume();
      return context.state === 'running';
    } catch {
      return false;
    }
  }

  function setEnabled(value) {
    enabled = value;
    try { localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off'); }
    catch { /* Sound still works for the current session. */ }
    if (output) output.gain.setTargetAtTime(enabled ? .42 : 0, context.currentTime, .012);
    if (enabled) void unlock();
  }

  function envelope(source, time, duration, volume, attack = .008) {
    const gain = context.createGain();
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + attack);
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    source.connect(gain);
    gain.connect(output);
  }

  function tone(time, type, from, to, duration, volume) {
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, time);
    oscillator.frequency.exponentialRampToValueAtTime(to, time + duration);
    envelope(oscillator, time, duration, volume);
    oscillator.start(time);
    oscillator.stop(time + duration);
  }

  function cannon(time) {
    if (time - lastCannon < CANNON_GAP) return;
    lastCannon = time;
    const burst = context.createBufferSource();
    burst.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, time);
    filter.frequency.exponentialRampToValueAtTime(220, time + .11);
    burst.connect(filter);
    envelope(filter, time, .13, .24, .003);
    burst.start(time);
    tone(time, 'triangle', 125, 43, .18, .26);
  }

  function play(cue) {
    if (!enabled || context?.state !== 'running') return;
    const time = context.currentTime;
    switch (cue) {
      case 'cannon':
        cannon(time);
        break;
      case 'wave':
        tone(time, 'triangle', 147, 147, .32, .17);
        tone(time + .1, 'sine', 220, 220, .37, .18);
        break;
      case 'purchase':
        tone(time, 'sine', 440, 440, .1, .17);
        tone(time + .06, 'triangle', 660, 660, .16, .14);
        break;
      case 'ability':
        tone(time, 'sine', 160, 420, .24, .2);
        tone(time + .07, 'triangle', 330, 520, .19, .12);
        break;
    }
  }

  return { enabled, available: Boolean(Audio), unlock, setEnabled, play };
}
