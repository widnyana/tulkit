let ctx: AudioContext | null = null;

/** Call from a click handler: browsers only allow audio after a user gesture. */
export function unlockAudio(): void {
  try {
    ctx ??= new AudioContext();
    void ctx.resume();
  } catch {
    ctx = null;
  }
}

/** Short sine beep. Silent no-op when audio is unavailable or not unlocked. */
export function beep(freq = 880, ms = 150): void {
  try {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.15;
    osc.frequency.value = freq;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + ms / 1000);
  } catch {
    // Audio is a nice-to-have cue; text cues still work.
  }
}
