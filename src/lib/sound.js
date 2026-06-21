// A tiny synthesized "success" chime via the Web Audio API — no audio files to
// bundle. Browsers require a user gesture before audio can play, so call
// primeAudio() inside the Convert click and playSuccessChime() on success.
let ctx = null;

export function primeAudio() {
  try {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      ctx = new AudioCtx();
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    /* audio unsupported — silently skip */
  }
}

export function playSuccessChime() {
  if (!ctx) return; // never primed (no user gesture yet)
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5 → E5 → G5, a cheerful arpeggio
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const start = now + i * 0.085;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.32);
    });
  } catch {
    /* ignore playback errors */
  }
}
