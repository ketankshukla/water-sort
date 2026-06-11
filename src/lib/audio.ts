let actx: AudioContext | null = null;

function ac(): AudioContext {
  if (!actx) actx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return actx;
}

function blip(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.12) {
  try {
    const a = ac();
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g).connect(a.destination);
    o.start();
    o.stop(a.currentTime + dur);
  } catch (e) {}
}

export function clink() { blip(660, 0.09, "triangle", 0.14); }
export function blockedSound() { blip(150, 0.14, "square", 0.07); }

export function corkPop() {
  try {
    const a = ac();
    const t0 = a.currentTime;

    // The "pop": a fast downward pitch blip for that hollow champagne thunk.
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(950, t0);
    o.frequency.exponentialRampToValueAtTime(170, t0 + 0.07);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.28, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);
    o.connect(g).connect(a.destination);
    o.start(t0);
    o.stop(t0 + 0.15);

    // The "fizz": a short high-passed noise burst right after the pop.
    const dur = 0.28;
    const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buf;
    const hp = a.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2600;
    const ng = a.createGain();
    ng.gain.setValueAtTime(0.0001, t0 + 0.04);
    ng.gain.exponentialRampToValueAtTime(0.05, t0 + 0.075);
    ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04 + dur);
    src.connect(hp).connect(ng).connect(a.destination);
    src.start(t0 + 0.04);
    src.stop(t0 + 0.04 + dur);
  } catch (e) {}
}

export function winJingle() {
  [523, 659, 784, 1047].forEach((f, i) =>
    setTimeout(() => blip(f, 0.22, "triangle", 0.14), i * 120)
  );
}

export function pourSound(durMs: number) {
  try {
    const a = ac();
    const dur = Math.min(2.0, Math.max(0.45, (durMs || 500) / 1000));
    const t0 = a.currentTime;

    const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buf;
    const bp = a.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 7;
    bp.frequency.setValueAtTime(620, t0);
    bp.frequency.linearRampToValueAtTime(1500, t0 + dur);
    const lfo = a.createOscillator();
    lfo.frequency.value = 11;
    const lfoG = a.createGain();
    lfoG.gain.value = 300;
    lfo.connect(lfoG).connect(bp.frequency);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.07);
    g.gain.setValueAtTime(0.09, t0 + Math.max(0.08, dur - 0.14));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp).connect(g).connect(a.destination);
    src.start(t0);
    lfo.start(t0);
    lfo.stop(t0 + dur);

    const nb = Math.max(6, Math.floor(dur * 15));
    for (let i = 0; i < nb; i++) {
      const bt = t0 + 0.06 + Math.random() * (dur - 0.18);
      const o = a.createOscillator();
      o.type = "sine";
      const f0 = 360 + Math.random() * 520;
      o.frequency.setValueAtTime(f0, bt);
      o.frequency.exponentialRampToValueAtTime(f0 * 2.2, bt + 0.05);
      const og = a.createGain();
      og.gain.setValueAtTime(0.0001, bt);
      og.gain.exponentialRampToValueAtTime(0.045 + Math.random() * 0.035, bt + 0.012);
      og.gain.exponentialRampToValueAtTime(0.0001, bt + 0.065);
      o.connect(og).connect(a.destination);
      o.start(bt);
      o.stop(bt + 0.09);
    }
  } catch (e) {}
}
