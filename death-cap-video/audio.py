"""Procedural score + sound design for the death-cap video, synced to out/timing.json."""
import json, math
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
DUR = 71.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

tm = json.load(open('out/timing.json'))
SEG = {s['id']: s for s in tm['segs']}


def T(seg, word=None, which='start'):
    s = SEG[seg]
    if word is None or word == 'start':
        return s['start']
    if word == 'end':
        return s['end']
    if isinstance(word, int):
        w = s['words'][word]
    else:
        clean = lambda x: ''.join(ch for ch in x.lower() if ch.isalnum() or ch in "'-")
        w = next((x for x in s['words'] if clean(x['text']) == word), None) or next(x for x in s['words'] if x['text'].lower().startswith(word))
    return w[which]


def b(seg):
    return T(seg) - 0.12


# ---------------- buses ----------------
music = np.zeros((2, N))
sfx = np.zeros((2, N))
send = np.zeros((2, N))  # reverb send


def place(bus, t0, mono_or_stereo, gain=1.0, pan=0.0, rev=0.0):
    x = np.asarray(mono_or_stereo, dtype=np.float64)
    if x.ndim == 1:
        l = math.cos((pan + 1) * math.pi / 4)
        r = math.sin((pan + 1) * math.pi / 4)
        x = np.vstack([x * l * 1.414, x * r * 1.414])
    i0 = int(round(t0 * SR))
    if i0 < 0:
        x = x[:, -i0:]
        i0 = 0
    n = min(x.shape[1], N - i0)
    if n <= 0:
        return
    bus[:, i0:i0 + n] += x[:, :n] * gain
    if rev > 0:
        send[:, i0:i0 + n] += x[:, :n] * gain * rev


def tt(d):
    return np.arange(int(d * SR)) / SR


def sine(f, d, ph=0.0):
    n = int(d * SR)
    f = np.broadcast_to(np.asarray(f, dtype=np.float64), (n,))
    return np.sin(2 * np.pi * np.cumsum(f) / SR + ph)


def saw(f, d):
    n = int(d * SR)
    f = np.broadcast_to(np.asarray(f, dtype=np.float64), (n,))
    p = np.cumsum(f) / SR
    return 2 * (p % 1.0) - 1


def square(f, d, duty=0.5):
    n = int(d * SR)
    f = np.broadcast_to(np.asarray(f, dtype=np.float64), (n,))
    p = np.cumsum(f) / SR
    return np.where((p % 1.0) < duty, 1.0, -1.0)


def noise(d):
    return rng.standard_normal(int(d * SR))


def lp(x, fc, order=2):
    bb, aa = signal.butter(order, min(fc, SR * 0.45) / (SR / 2), 'low')
    return signal.lfilter(bb, aa, x)


def hp(x, fc, order=2):
    bb, aa = signal.butter(order, fc / (SR / 2), 'high')
    return signal.lfilter(bb, aa, x)


def bp(x, lo, hi, order=2):
    bb, aa = signal.butter(order, [lo / (SR / 2), min(hi, SR * 0.45) / (SR / 2)], 'band')
    return signal.lfilter(bb, aa, x)


def tv_lp(x, fc):
    """time-varying one-pole lowpass; fc array same length as x"""
    a = 1 - np.exp(-2 * np.pi * np.asarray(fc) / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def env(d, a=0.005, decay=0.3, hold=0.0, shape='exp'):
    t = tt(d)
    e = np.ones_like(t)
    if a > 0:
        e *= np.clip(t / a, 0, 1)
    if shape == 'exp':
        e *= np.where(t < a + hold, 1.0, np.exp(-(t - a - hold) / decay))
    else:
        e *= np.clip(1 - (t - a - hold) / decay, 0, 1)
    return e


def fade(x, fi=0.01, fo=0.05):
    n = len(x)
    e = np.ones(n)
    ni, no = int(fi * SR), int(fo * SR)
    if ni > 0:
        e[:ni] = np.linspace(0, 1, ni)
    if no > 0:
        e[-no:] *= np.linspace(1, 0, no)
    return x * e


def note(n):
    """midi note to Hz"""
    return 440.0 * 2 ** ((n - 69) / 12)


# ---------------- SFX library ----------------
def whoosh(d=0.6, lo=300, hi=4000, peak=0.6):
    n = int(d * SR)
    t = np.linspace(0, 1, n)
    shape = np.where(t < peak, (t / peak) ** 2, ((1 - t) / (1 - peak)) ** 1.5)
    fc = lo + (hi - lo) * shape
    x = tv_lp(noise(d), fc) - tv_lp(noise(d), fc * 0.25) * 0.5
    return fade(x * shape * 2.2, 0.005, 0.03)


def impact(d=2.2, f0=95, f1=32, weight=1.0):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t / 0.12)
    body = sine(f, d) * np.exp(-t / 0.55)
    sub = sine(f1 * 0.9 + 0 * t, d) * np.exp(-t / 1.0) * 0.6
    crack = lp(noise(d), 2500) * np.exp(-t / 0.05) * 0.8
    tail = lp(noise(d), 400) * np.exp(-t / 0.6) * 0.35
    x = (body + sub) * weight + crack + tail
    return fade(np.tanh(x * 1.4), 0.001, 0.2)


def braam(d=2.6, root=38):
    t = tt(d)
    x = np.zeros(int(d * SR))
    for m, g in [(root, 1), (root + 12, 0.6), (root + 7, 0.5), (root + 19, 0.25)]:
        for det in (-0.12, 0.12):
            x += saw(note(m + det), d) * g
    fc = 300 + 1600 * np.exp(-t / 0.35)
    x = tv_lp(x, fc)
    e = np.clip(t / 0.03, 0, 1) * np.exp(-t / 1.1)
    return fade(np.tanh(x * e * 0.6) * 1.2, 0.001, 0.3)


def blip(f=1500, d=0.07, f2=None, g=1.0):
    t = tt(d)
    fr = f if f2 is None else np.linspace(f, f2, len(t))
    return fade(sine(fr, d) * np.exp(-t / (d * 0.35)) * g, 0.001, 0.01)


def lock():
    return np.concatenate([blip(1800, 0.05), np.zeros(int(0.02 * SR)), blip(2400, 0.08)])


def tick():
    d = 0.012
    return hp(noise(d), 3000) * np.exp(-tt(d) / 0.003)


def typing(d=0.45, rate=26):
    out = np.zeros(int(d * SR) + 2000)
    k = 0
    tcur = 0.0
    while tcur < d:
        i = int(tcur * SR)
        c = tick() * (0.5 + 0.5 * rng.random())
        out[i:i + len(c)] += c
        tcur += 1 / rate * (0.7 + 0.6 * rng.random())
        k += 1
    return out


def fill_sweep(d=0.8, f0=400, f1=1400):
    t = tt(d)
    x = sine(np.linspace(f0, f1, len(t)), d) * 0.5 + square(np.linspace(f0, f1, len(t)) / 2, d, 0.25) * 0.08
    trem = 0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 30 * t))
    return fade(lp(x, 4000) * trem * np.linspace(0.3, 1, len(t)), 0.01, 0.05)


def alert(n=2, f=880):
    seg = np.concatenate([square(f, 0.09, 0.5) * 0.4, np.zeros(int(0.06 * SR))])
    return lp(np.tile(seg, n), 3000)


def err_buzz(d=0.5, f=110):
    t = tt(d)
    x = square(f, d) * 0.5 + square(f * 1.5, d) * 0.3
    gate = (np.sin(2 * np.pi * 9 * t) > 0).astype(float)
    return fade(lp(x * gate, 2400), 0.005, 0.05)


def glitch(d=0.3, seed=0):
    r = np.random.default_rng(seed)
    out = np.zeros(int(d * SR))
    i = 0
    while i < len(out):
        L = int(r.integers(200, 2400))
        kind = r.integers(0, 4)
        tseg = np.arange(L) / SR
        if kind == 0:
            seg = np.sign(np.sin(2 * np.pi * r.uniform(80, 2000) * tseg))
        elif kind == 1:
            seg = r.standard_normal(L)
            seg = np.round(seg * 3) / 3
        elif kind == 2:
            seg = np.sin(2 * np.pi * r.uniform(2000, 6000) * tseg)
        else:
            seg = np.zeros(L)
        hold = int(r.integers(1, 12))
        seg = np.repeat(seg[::hold], hold)[:L]
        out[i:i + L] = seg[:max(0, min(L, len(out) - i))]
        i += L
    return fade(out * 0.45, 0.002, 0.02)


def shutter():
    a = hp(noise(0.02), 1500) * np.exp(-tt(0.02) / 0.004)
    bb = hp(noise(0.03), 900) * np.exp(-tt(0.03) / 0.006)
    x = np.zeros(int(0.12 * SR))
    x[:len(a)] += a
    x[int(0.07 * SR):int(0.07 * SR) + len(bb)] += bb * 0.8
    return x * 1.2


def riser(d=2.5, f0=200, f1=1600):
    t = tt(d)
    k = t / d
    f = f0 * (f1 / f0) ** k
    x = saw(f, d) * 0.3 + saw(f * 1.01, d) * 0.3
    x = tv_lp(x, 300 + 5000 * k ** 2)
    nz = tv_lp(noise(d), 500 + 9000 * k ** 2) * 0.5
    return fade((x + nz) * k ** 2.2, 0.01, 0.01)


def heartbeat():
    def thump(d=0.25, f=52):
        t = tt(d)
        return sine(f + 30 * np.exp(-t / 0.03), d) * np.exp(-t / 0.07)
    x = np.zeros(int(0.6 * SR))
    a = thump()
    bb = thump(f=46) * 0.7
    x[:len(a)] += a
    j = int(0.2 * SR)
    x[j:j + len(bb)] += bb
    return lp(x, 300) * 1.4


def monitor_beep(f=1040, d=0.13):
    return fade(sine(f, d) * 0.5, 0.004, 0.03)


def shing(d=1.4):
    t = tt(d)
    x = np.zeros(len(t))
    for f, g, dc in [(2093, 0.5, 0.6), (3349, 0.35, 0.45), (5274, 0.25, 0.3), (7040, 0.15, 0.2), (1244, 0.3, 0.8)]:
        x += sine(f * (1 + 0.002 * np.sin(2 * np.pi * 6 * t)), d) * g * np.exp(-t / dc)
    sw = whoosh(0.35, 2000, 12000, 0.3)
    x[:len(sw)] += sw * 0.6
    return fade(x, 0.001, 0.1)


def tear(d=0.6):
    t = tt(d)
    x = np.zeros(len(t))
    for i in range(140):
        p = int(rng.random() * (len(t) - 600))
        c = bp(noise(0.012), 800, 5000) * np.exp(-tt(0.012) / 0.003)
        x[p:p + len(c)] += c * rng.random()
    return x * np.sin(np.pi * t / d) * 1.2


def rumble(d=2.0):
    t = tt(d)
    x = lp(np.cumsum(noise(d)) * 0.02, 180)
    x = x / (np.abs(x).max() + 1e-9)
    crack = np.zeros(len(t))
    for i in range(380):
        p = int(rng.random() * (len(t) - 400))
        c = bp(noise(0.006), 1500, 7000) * np.exp(-tt(0.006) / 0.0015)
        crack[p:p + len(c)] += c * rng.random() * 0.5
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.7
    return (x * 0.9 + crack) * e


def rustle(d=0.5):
    t = tt(d)
    x = bp(noise(d), 2500, 9000) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 13 * t + rng.random() * 6)))
    return x * np.sin(np.pi * t / d) * 0.35


def wind(d):
    t = tt(d)
    x = bp(noise(d), 200, 1200)
    mod = 0.5 + 0.5 * np.sin(2 * np.pi * 0.17 * t) * np.sin(2 * np.pi * 0.29 * t + 1)
    return x * mod * 0.5


def chirp_bird():
    d = 0.18
    t = tt(d)
    f = 3200 + 1600 * np.sin(np.pi * t / d) + 300 * np.sin(2 * np.pi * 40 * t)
    return sine(f, d) * np.sin(np.pi * t / d) ** 2 * 0.25


def bell(freqs, d=2.5, g=1.0):
    t = tt(d)
    x = np.zeros(len(t))
    for f in freqs:
        for k, (mul, gg, dc) in enumerate([(1, 1, 1.0), (2.76, 0.35, 0.4), (5.4, 0.15, 0.2)]):
            x += sine(f * mul, d) * gg * np.exp(-t / (dc * d / 2.5))
    return fade(x * g / len(freqs), 0.002, 0.2)


def stamp():
    t = tt(0.5)
    x = sine(70 + 60 * np.exp(-t / 0.02), 0.5) * np.exp(-t / 0.09)
    slap = bp(noise(0.5), 400, 3000) * np.exp(-t / 0.03) * 0.8
    return np.tanh((x + slap) * 1.5)


def slam_metal():
    t = tt(1.4)
    x = impact(1.4, 120, 45, 0.8)
    ring = (sine(310, 1.4) * 0.3 + sine(470, 1.4) * 0.2 + sine(1130, 1.4) * 0.1) * np.exp(-t / 0.35)
    return x + ring


def servo(d=0.5, f0=180, f1=420):
    t = tt(d)
    f = np.linspace(f0, f1, len(t))
    x = square(f, d, 0.3) * 0.3 + saw(f * 2.01, d) * 0.2
    return fade(lp(x, 2500) * (0.6 + 0.4 * np.sin(2 * np.pi * 45 * t)), 0.02, 0.05)


def sonar(f=880):
    t = tt(1.2)
    return sine(f, 1.2) * np.exp(-t / 0.3) * 0.6


def dive(d=2.6):
    t = tt(d)
    f = 160 * (28 / 160) ** (t / d)
    x = sine(f, d) * 0.9 + saw(f * 2, d) * 0.15
    x = lp(x, 900) * np.minimum(1, t / 0.3) * np.exp(-np.maximum(0, t - d * 0.6) / 0.6)
    return x + whoosh(d, 150, 1500, 0.35) * 0.5


def chatter(d=1.5, rate=40):
    out = np.zeros(int(d * SR) + 4000)
    tc = 0.0
    while tc < d:
        f = rng.choice([1200, 1500, 1800, 2400, 3000])
        c = blip(f, 0.025) * (0.3 + 0.4 * rng.random())
        i = int(tc * SR)
        out[i:i + len(c)] += c
        tc += 1 / rate * (0.5 + rng.random())
    return out


# ---------------- MUSIC ----------------
BEAT = 0.6  # 100 bpm


def pad_chord(t0, t1, notes, gain=0.12, cutoff=900, att=0.6, rel=0.9, wob=0.15):
    d = t1 - t0 + rel
    t = tt(d)
    x = np.zeros((2, len(t)))
    for m in notes:
        for ch, det in ((0, -0.08), (1, 0.08)):
            x[ch] += saw(note(m + det), d) * 0.5 + saw(note(m - det * 0.5) * 1.002, d) * 0.3
    lfo = 1 + wob * np.sin(2 * np.pi * 0.23 * t + t0)
    for ch in (0, 1):
        x[ch] = lp(x[ch], cutoff, 2) * lfo
    e = np.clip(t / att, 0, 1) * np.clip((t1 - t0 + rel - t) / rel, 0, 1)
    x *= e * gain / max(1, len(notes) ** 0.5)
    place(music, t0, x, rev=0.5)


def sub_drone(t0, t1, m, gain=0.25):
    d = t1 - t0
    t = tt(d)
    x = sine(note(m), d) * 0.8 + sine(note(m) * 2, d) * 0.15
    e = np.clip(t / 0.8, 0, 1) * np.clip((d - t) / 0.8, 0, 1)
    place(music, t0, x * e * gain)


def pluck_bass(t0, t1, roots, step=0.3, gain=0.18, cut=900, pattern=None):
    """roots: list of (time, midi) changes"""
    tc = t0
    k = 0
    while tc < t1 - 0.01:
        m = roots[0][1]
        for (rt, rm) in roots:
            if tc >= rt - 1e-6:
                m = rm
        oct_ = 12 if (pattern and pattern[k % len(pattern)]) else 0
        d = step * 1.6
        tl = tt(d)
        x = saw(note(m + oct_), d) * 0.6 + square(note(m + oct_) * 0.5, d, 0.5) * 0.3
        x = tv_lp(x, 120 + cut * np.exp(-tl / 0.07))
        x *= np.exp(-tl / (step * 0.8))
        place(music, tc, fade(x, 0.002, 0.02), gain=gain * (1.0 if k % 2 == 0 else 0.75))
        tc += step
        k += 1


def hats(t0, t1, step=0.3, gain=0.05, offbeat=True):
    tc = t0 + (step / 2 if offbeat else 0)
    while tc < t1:
        d = 0.05
        x = hp(noise(d), 7000) * np.exp(-tt(d) / 0.012)
        place(music, tc, x, gain=gain, pan=0.3 * math.sin(tc * 3))
        tc += step


def kicks(t0, t1, step=0.6, gain=0.35):
    tc = t0
    while tc < t1:
        d = 0.35
        t = tt(d)
        x = sine(48 + 90 * np.exp(-t / 0.025), d) * np.exp(-t / 0.12)
        place(music, tc, x, gain=gain)
        tc += step


def build_music():
    D2, F2, G2, A2, Bb1, C2, Eb2 = 38, 41, 43, 45, 34, 36, 39
    fatal = T('s1', 'fatal')
    # --- intro: tension pulse
    pad_chord(0.0, fatal - 0.15, [50, 57, 65], gain=0.10, cutoff=700)
    sub_drone(0.0, fatal - 0.1, D2, 0.18)
    pluck_bass(0.35, fatal - 0.1, [(0, D2)], step=0.3, gain=0.10, cut=500)
    hats(0.35, fatal - 0.1, 0.3, 0.035)
    # --- s2 cold
    s2, s3 = b('s2'), b('s3')
    pad_chord(s2, s3, [46, 53, 62], gain=0.11, cutoff=1100)
    sub_drone(s2, s3, Bb1, 0.16)
    # --- s3 / s4 groove
    s5 = b('s5a')
    prog = [(s3, D2, [50, 57, 65]), (T('s3', 'ai') - 0.25, Bb1, [46, 53, 62]), (b('s4a'), G2, [43, 55, 62]), (b('s4b'), A2, [45, 52, 61])]
    for i, (t0, r, ch) in enumerate(prog):
        t1 = prog[i + 1][0] if i + 1 < len(prog) else s5
        pad_chord(t0, t1, ch, gain=0.10, cutoff=1000)
        sub_drone(t0, t1, r, 0.11)
    pluck_bass(s3 + 0.1, s5 - 0.1, [(p[0], p[1]) for p in prog], step=0.3, gain=0.12, cut=900, pattern=[0, 0, 1, 0])
    hats(s3 + 0.1, s5 - 0.1, 0.3, 0.035)
    kicks(T('s4a') - 0.1, s5 - 0.2, 0.6, 0.22)
    # --- s5 / s6 mystery
    s7 = b('s7')
    prog2 = [(s5, D2, [50, 57, 62, 65]), (b('s5b'), Bb1, [46, 53, 62]), (b('s6'), F2, [41, 53, 60, 65]), (T('s6', 'completely') - 0.3, A2, [45, 52, 57, 61])]
    for i, (t0, r, ch) in enumerate(prog2):
        t1 = prog2[i + 1][0] if i + 1 < len(prog2) else s7
        pad_chord(t0, t1, ch, gain=0.10, cutoff=800, wob=0.25)
        sub_drone(t0, t1, r, 0.10)
    pluck_bass(s5 + 0.1, s7 - 0.1, [(p[0], p[1]) for p in prog2], step=0.6, gain=0.09, cut=600)
    # --- s7 tension on dominant, 16ths
    s8 = b('s8')
    pad_chord(s7, s8, [45, 52, 56, 61], gain=0.11, cutoff=1200)
    sub_drone(s7, s8, A2 - 12, 0.2)
    pluck_bass(s7 + 0.1, s8 - 0.25, [(s7, A2)], step=0.15, gain=0.09, cut=1100)
    hats(s7 + 0.1, s8 - 0.25, 0.15, 0.03, offbeat=False)
    kicks(s7 + 0.1, s8 - 0.3, 0.6, 0.25)
    # --- s8 / s9 dark phrygian
    s10 = b('s10')
    pad_chord(s8, s8 + 3.2, [38, 50, 57], gain=0.12, cutoff=500)
    sub_drone(s8, s10, D2 - 12, 0.22)
    pad_chord(s8 + 3.0, s8 + 5.4, [39, 51, 58], gain=0.11, cutoff=600)
    pad_chord(s8 + 5.2, s10, [38, 50, 57, 65], gain=0.11, cutoff=700)
    pluck_bass(T('s9', 'open') - 0.05, s10 - 0.1, [(0, D2)], step=0.3, gain=0.10, cut=700)
    # --- s10 / s11
    s11, s12 = b('s11'), b('s12')
    pad_chord(s10, s11, [46, 53, 58, 62], gain=0.10, cutoff=1100)
    sub_drone(s10, s11, Bb1, 0.14)
    pad_chord(s11, s12, [38, 50, 51, 57], gain=0.10, cutoff=650, wob=0.3)
    sub_drone(s11, s12, D2, 0.18)
    pluck_bass(s11 + 0.1, s12 - 0.1, [(0, D2), (s11 + 8 * BEAT, Eb2)], step=0.3, gain=0.08, cut=600)
    # --- s12 build to the drop
    tLethal, tSafe = T('s12', 'lethal'), T('s12', 'safe')
    drop0 = tSafe - 0.32
    pad_chord(s12, s12 + 3.2, [46, 53, 62], gain=0.11, cutoff=900)
    pad_chord(s12 + 3.0, drop0, [48, 55, 64, 67], gain=0.12, cutoff=1300)
    sub_drone(s12, drop0, Bb1, 0.16)
    pluck_bass(s12 + 0.1, tLethal - 0.05, [(s12, Bb1), (s12 + 3.0, C2)], step=0.15, gain=0.10, cut=1200)
    hats(s12 + 0.1, drop0, 0.15, 0.03, offbeat=False)
    kicks(s12 + 0.1, tLethal - 0.05, 0.6, 0.28)
    # ironic major resolve + ominous low drone underneath
    pad_chord(tSafe, DUR, [50, 54, 57, 62, 66], gain=0.12, cutoff=2200, att=0.05, rel=0.4)
    pad_chord(tSafe + 1.0, DUR, [37, 38, 49], gain=0.10, cutoff=400, att=1.2, rel=0.3)


# ---------------- SFX cues ----------------
def build_sfx():
    tBut, tFalse, tToxic, tFatal, tHarm = T('s1', 'but'), T('s1', 'false'), T('s1', 'toxic'), T('s1', 'fatal'), T('s1', 'harmless')
    # s1
    place(sfx, 0.02, whoosh(0.7, 200, 3500, 0.5), 0.35, pan=-0.5)
    place(sfx, 0.55, fill_sweep(0.8, 300, 900), 0.10)
    place(sfx, 1.0, lock(), 0.22, pan=-0.2)
    place(sfx, 1.15, typing(0.45), 0.25)
    place(sfx, 1.3, fill_sweep(0.85, 500, 1500), 0.12)
    place(sfx, tHarm - 0.5, typing(0.4), 0.2)
    place(sfx, tHarm + 0.06, stamp(), 0.45, rev=0.2)
    place(sfx, tHarm + 0.1, blip(1320, 0.12) + 0, 0.15)
    place(sfx, tBut - 0.14, whoosh(0.7, 200, 3500, 0.5), 0.35, pan=0.5)
    place(sfx, tBut + 0.35, fill_sweep(0.8, 300, 900), 0.10)
    place(sfx, tBut + 0.55, lock(), 0.22, pan=0.2)
    place(sfx, tBut + 0.6, typing(0.5), 0.25)
    place(sfx, tBut + 0.75, fill_sweep(0.85, 500, 1600), 0.12)
    place(sfx, tFalse + 0.05, alert(3, 988), 0.22)
    place(sfx, tToxic, braam(1.4, 37), 0.18, rev=0.3)
    place(sfx, tFatal - 0.02, impact(2.6, 110, 30, 1.2), 0.9, rev=0.35)
    place(sfx, tFatal - 0.02, glitch(0.35, 1), 0.4)
    place(sfx, tFatal + 0.1, braam(2.4, 26), 0.35, rev=0.4)
    # s2
    s2 = b('s2')
    place(sfx, s2 - 0.1, glitch(0.3, 2), 0.35)
    place(sfx, s2 + 0.05, servo(0.6, 150, 500), 0.22)
    place(sfx, s2 + 0.7, fill_sweep(0.8, 200, 2000), 0.1)
    tFail = T('s2', 'fails')
    place(sfx, tFail, err_buzz(0.7, 98), 0.18)
    place(sfx, tFail + 0.05, glitch(0.25, 3), 0.2)
    tTrap = T('s2', 'physical')
    place(sfx, tTrap - 0.05, whoosh(0.5, 100, 1500, 0.8), 0.45)
    place(sfx, tTrap + 0.38, slam_metal(), 0.55, rev=0.3)
    tVis, tOcc = T('s2', 'visual'), T('s2', 'occlusion')
    place(sfx, tVis - 0.08, whoosh(0.4, 400, 6000, 0.8), 0.25)
    place(sfx, tOcc - 0.05, impact(2.0, 90, 34, 1.0), 0.6, rev=0.3)
    place(sfx, tOcc + 0.35, whoosh(0.6, 100, 900, 0.5), 0.3, pan=0.4)
    place(sfx, tOcc + 0.9, stamp(), 0.25)
    # s3
    s3 = b('s3')
    place(sfx, s3 - 0.15, whoosh(0.5, 1000, 9000, 0.7), 0.25)
    place(sfx, s3, whoosh(1.0, 120, 1200, 0.4), 0.4)
    place(sfx, T('s3', 'death') - 0.1, braam(2.8, 38), 0.42, rev=0.4)
    place(sfx, T('s3', 'highly'), lock(), 0.18, pan=0.5)
    place(sfx, T('s3', 'highly') + 0.35, lock(), 0.15, pan=-0.5)
    place(sfx, T('s3', 'ai') - 0.25, whoosh(0.8, 200, 3000, 0.5), 0.3, pan=0.6)
    place(sfx, T('s3', 'mistakes') - 0.1, fill_sweep(0.9, 300, 1200), 0.1)
    tHE = T('s3', 'harmless')
    place(sfx, tHE + 0.1, bell([1318.5, 1975.5], 1.2), 0.22, rev=0.3)
    place(sfx, tHE - 0.1, typing(0.6, 30), 0.18)
    # s4a pixels
    s4 = b('s4a')
    place(sfx, s4 - 0.2, whoosh(0.6, 200, 3000, 0.5), 0.25, pan=0.7)
    tRel = T('s4a', 'relies')
    d = 1.1
    t = tt(d)
    crunch = glitch(d, 9) * np.linspace(0.2, 1, len(t))
    crunch = lp(crunch, 3000)
    place(sfx, tRel - 0.1, crunch, 0.28)
    place(sfx, tRel - 0.1, servo(1.0, 900, 120), 0.12)
    place(sfx, T('s4a', 'surface') - 0.05, chatter(1.3, 35), 0.22)
    place(sfx, T('s4a', 'surface') - 0.05, impact(1.0, 140, 60, 0.6), 0.2)
    # s4b phone
    s4b = b('s4b')
    place(sfx, s4b - 0.15, whoosh(0.6, 300, 5000, 0.6), 0.35)
    place(sfx, s4b + 0.05, whoosh(0.8, 150, 1500, 0.4), 0.25)
    place(sfx, T('s4b', 'top-down') - 0.1, blip(900, 0.08, 1400), 0.12)
    tPh = T('s4b', 'photo')
    place(sfx, tPh - 0.02, shutter(), 0.6)
    place(sfx, tPh, whoosh(0.4, 2000, 9000, 0.1), 0.15)
    place(sfx, tPh + 0.2, fill_sweep(0.7, 600, 2200), 0.1)
    place(sfx, tPh + 0.6, lock(), 0.2)
    tSh = T('s4b', 'shape')
    for k, dt in enumerate([-0.2, 0.1, 0.4]):
        place(sfx, tSh + dt, blip(1600 + k * 300, 0.06), 0.15)
    place(sfx, T('s4b', 'perfectly'), bell([1046.5, 1318.5, 1568], 1.4), 0.25, rev=0.3)
    place(sfx, T('s4b', 'perfectly'), whoosh(0.3, 1000, 6000, 0.3), 0.12)
    # s5 experts
    s5 = b('s5a')
    place(sfx, s5 - 0.15, whoosh(0.6, 300, 5000, 0.6), 0.35)
    place(sfx, s5 + 0.35, lock(), 0.18, pan=-0.2)
    place(sfx, T('s5a', 'experts') - 0.2, whoosh(0.8, 300, 2500, 0.5), 0.25, pan=0.7)
    place(sfx, T('s5a', 'look') + 0.2, bell([2637, 3951], 1.5, 0.6), 0.08, rev=0.4, pan=0.2)
    place(sfx, T('s5b') - 0.2, whoosh(2.6, 80, 700, 0.6), 0.35)
    tSack = T('s5b', 'sack-like')
    place(sfx, tSack - 0.05, bell([587.3, 880, 1174.7], 2.4), 0.3, rev=0.5)
    place(sfx, tSack - 0.05, impact(1.4, 80, 40, 0.5), 0.25)
    tBase = T('s5b', 'base')
    for k in range(3):
        place(sfx, tBase + k * 0.37, sonar(740 + k * 0), 0.12, rev=0.4)
    # s6 buried
    s6 = b('s6')
    place(sfx, s6 + 0.05, whoosh(1.2, 100, 1200, 0.4), 0.3)
    place(sfx, s6 + 0.2, wind(b('s7') - s6), 0.25, rev=0.2)
    for k, dt in enumerate([0.8, 1.9, 2.6, 4.1]):
        place(sfx, s6 + dt, chirp_bird(), 0.25, pan=(-0.6 if k % 2 else 0.6), rev=0.5)
    place(sfx, T('s6', 'root') - 0.1, lock(), 0.15, pan=0.4)
    tComp = T('s6', 'completely')
    place(sfx, tComp - 0.3, rumble(2.0), 0.6)
    place(sfx, tComp - 0.25, whoosh(1.4, 60, 600, 0.7), 0.3)
    place(sfx, T('s6', 'buried') + 0.45, impact(1.6, 70, 32, 0.8), 0.35, rev=0.2)
    tF = T('s6', 'fallen') - 0.9
    for k in range(9):
        place(sfx, tF + 0.2 + k * 0.17 + rng.random() * 0.1, rustle(0.4 + rng.random() * 0.3), 0.5, pan=rng.uniform(-0.7, 0.7))
    place(sfx, T('s6', 'buried') + 0.4, braam(2.0, 33), 0.15, rev=0.4)
    # s7 line of sight
    s7 = b('s7')
    place(sfx, s7 - 0.1, whoosh(0.7, 200, 3000, 0.5), 0.3)
    place(sfx, s7 + 0.2, whoosh(0.6, 300, 4000, 0.5), 0.25, pan=-0.7)
    tLine = T('s7', 'line')
    targets_blocked = [0, 0, 0, 0, 0, 0, 1, 1, 1]
    for i, bl in enumerate(targets_blocked):
        tz = tLine - 0.25 + i * 0.06
        place(sfx, tz, blip(2200 + i * 120, 0.09, 3600), 0.08, pan=-0.5 + i * 0.12)
        if bl:
            place(sfx, tz + 0.6 + 0.2, err_buzz(0.18, 140), 0.14)
    place(sfx, tLine + 0.75, stamp(), 0.2)
    tVis7 = T('s7', 'visual')
    place(sfx, tVis7 - 0.08, impact(2.0, 95, 34, 1.0), 0.6, rev=0.3)
    place(sfx, tVis7 + 0.35, rumble(0.7), 0.35)
    tData = T('s7', 'data')
    place(sfx, tData - 0.1, chatter(0.7, 50), 0.22)
    place(sfx, T('s7', 'exist'), glitch(0.35, 5), 0.45)
    place(sfx, T('s7', 'exist') + 0.02, err_buzz(0.4, 82), 0.18)
    # s8 dive
    s8 = b('s8')
    place(sfx, s8 - 0.1, dive(2.8), 0.6, rev=0.2)
    for w in ['deeper', 'than', 'dirt']:
        place(sfx, T('s8', w) - 0.05, impact(1.0, 120 if w != 'dirt' else 80, 40, 0.6), 0.3 if w != 'dirt' else 0.5, rev=0.2)
    rt = s8
    while rt < b('s10') - 0.3:
        place(sfx, rt, tick(), 0.06, pan=0.8)
        rt += 0.25
    # s9 split
    place(sfx, T('s9', 'splitting'), shing(1.6), 0.4, rev=0.4)
    place(sfx, T('s9', 'open') - 0.05, tear(0.7), 0.6)
    place(sfx, T('s9', 'open') - 0.05, whoosh(0.7, 100, 1200, 0.5), 0.25)
    tDark = T('s9', 'dark')
    d = 2.0
    t = tt(d)
    bloom = lp(noise(d), 300) * (t / d) ** 2 * np.exp(-np.maximum(0, t - d * 0.8) / 0.2)
    place(sfx, tDark - 0.35, bloom, 0.5, rev=0.3)
    place(sfx, tDark - 0.3, braam(2.4, 31), 0.25, rev=0.4)
    place(sfx, tDark, lock(), 0.15, pan=-0.5)
    place(sfx, T('s9', 'chemical') - 0.05, lock(), 0.15, pan=0.5)
    tPo = T('s9', 'poison')
    place(sfx, tPo - 0.05, stamp(), 0.55, rev=0.2)
    place(sfx, tPo - 0.05, impact(1.6, 100, 35, 0.9), 0.45, rev=0.3)
    # s10 layers
    s10 = b('s10')
    place(sfx, s10 - 0.1, glitch(0.3, 6), 0.35)
    place(sfx, s10 + 0.05, fill_sweep(0.6, 200, 1000), 0.1)
    place(sfx, T('s10', '2d') - 0.05, impact(1.0, 150, 60, 0.6), 0.3)
    tSu = T('s10', 'surface')
    place(sfx, tSu + 0.1, servo(0.9, 140, 260), 0.2)
    place(sfx, tSu + 0.95, stamp(), 0.18, pan=-0.3)
    place(sfx, tSu + 1.0, stamp(), 0.18, pan=0.3)
    tNe = T('s10', 'never')
    place(sfx, tNe - 0.05, err_buzz(0.25, 120), 0.18)
    place(sfx, tNe + 0.15, err_buzz(0.25, 110), 0.18)
    place(sfx, T('s10', 'internal'), alert(2, 740), 0.12)
    # s11 guess
    s11 = b('s11')
    place(sfx, s11 - 0.15, whoosh(0.6, 300, 5000, 0.6), 0.3)
    for k in range(16):
        place(sfx, s11 + 0.2 + k * 0.045, blip(1000 + (k % 5) * 250, 0.05), 0.08, pan=-0.8 + (k % 5) * 0.4)
    tInf = T('s11', 'infer')
    for k in range(3):
        place(sfx, tInf + k * 0.25, blip(700, 0.12, 520), 0.12, pan=0.2 + k * 0.25)
    hb = s11 + 0.3
    s12 = b('s12')
    period = 0.78
    while hb < s12 - 0.2:
        place(sfx, hb, heartbeat(), 0.6)
        if hb > T('s11', 'life-or-death') - 0.3:
            place(sfx, hb + 0.02, monitor_beep(), 0.08)
        hb += period
        period = max(0.5, period - 0.02)
    # slot reel: decelerating clicks (matches pos = 14 * outCubic(u))
    sStart, sStop = T('s11', 'life-or-death') - 0.15, T('s11', 'camouflage') + 0.2
    last = 0
    for i in range(1, 2000):
        tc = sStart + (sStop - sStart) * i / 2000
        u = i / 2000
        pos = 14 * (1 - (1 - u) ** 3)
        if int(pos) > last:
            last = int(pos)
            place(sfx, tc, tick() * 3, 0.25)
            place(sfx, tc, blip(2600, 0.02), 0.25)
    place(sfx, sStop, stamp(), 0.3)
    place(sfx, T('s11', 'guesses') - 0.05, stamp(), 0.35)
    place(sfx, T('s11', 'deceptive') - 0.1, whoosh(0.8, 2000, 9000, 0.5), 0.12)
    # s12 verdict
    place(sfx, s12 - 0.1, glitch(0.3, 8), 0.35)
    place(sfx, s12 + 0.05, whoosh(0.9, 150, 2000, 0.4), 0.3)
    place(sfx, s12 + 0.3, chatter(1.6, 30), 0.15)
    place(sfx, s12 + 0.5, blip(1600, 0.06), 0.15)
    place(sfx, s12 + 0.7, blip(1900, 0.06), 0.15)
    place(sfx, T('s12', 'missing'), lock(), 0.15)
    place(sfx, T('s12', 'buried') - 0.1, err_buzz(0.3, 130), 0.18)
    place(sfx, T('s12', 'toxic') - 0.1, err_buzz(0.3, 120), 0.18)
    tConf = T('s12', 'confidently')
    place(sfx, tConf - 0.1, fill_sweep(1.2, 300, 2400), 0.14)
    tLe, tSafe = T('s12', 'lethal'), T('s12', 'safe')
    place(sfx, tConf - 0.3, riser(tSafe - 0.35 - (tConf - 0.3), 150, 2200), 0.35)
    place(sfx, tLe - 0.05, glitch(0.4, 11), 0.5)
    place(sfx, tLe - 0.05, braam(1.2, 30), 0.35, rev=0.3)
    place(sfx, tLe - 0.05, impact(1.0, 90, 30, 0.8), 0.4)
    place(sfx, tSafe - 0.27, glitch(0.22, 12), 0.3)
    # the drop: SAFE TO EAT
    place(sfx, tSafe - 0.03, impact(3.0, 120, 30, 1.3), 0.95, rev=0.4)
    place(sfx, tSafe - 0.02, bell([1174.7, 1480, 1760, 2349], 3.0), 0.4, rev=0.5)
    place(sfx, tSafe - 0.02, whoosh(0.5, 3000, 12000, 0.1), 0.2)
    # red truth flickers: same hash as the visuals
    def hash1(n):
        s = math.sin(n * 127.1 + 311.7) * 43758.5453
        return s - math.floor(s)
    for k in range(int((tSafe + 1.2) * 14), int(DUR * 14)):
        t0 = k / 14
        if t0 < tSafe + 1.2:
            continue
        if hash1(k) > 0.82:
            hold = t0 - tSafe
            place(sfx, t0, glitch(1 / 14 + 0.02, 100 + k), 0.5 if hold > 1.6 else 0.3)
            if hold > 1.6:
                place(sfx, t0, braam(0.4, 26), 0.15)
    # flatline under the end card
    fl0 = tSafe + 1.1
    d = DUR - fl0
    t = tt(d)
    flat = sine(1000, d) * 0.5 * np.clip(t / 0.05, 0, 1) * np.clip((d - t) / 0.6, 0, 1)
    place(sfx, fl0, flat, 0.06)


# ---------------- render ----------------
build_music()
build_sfx()

# duck music under the big hits / drop
duck = np.ones(N)
def duck_at(t0, depth=0.35, att=0.02, rel=0.8, pre=0.0):
    i0 = int((t0 - pre) * SR)
    n = int((pre + att + rel) * SR)
    seg = np.ones(n)
    k = np.arange(n) / SR
    seg = 1 - (1 - depth) * np.clip(1 - np.maximum(0, k - pre - att) / rel, 0, 1)
    i1 = min(N, i0 + n)
    duck[i0:i1] = np.minimum(duck[i0:i1], seg[:i1 - i0])

tFatal = T('s1', 'fatal')
duck_at(tFatal - 0.35, 0.0, 0.05, 0.4, 0)
for tt_ in [T('s2', 'occlusion'), T('s7', 'visual'), T('s9', 'poison'), T('s8', 'dirt')]:
    duck_at(tt_, 0.4)
tSafe = T('s12', 'safe')
i0, i1 = int((tSafe - 0.3) * SR), int((tSafe - 0.02) * SR)
duck[i0:i1] = 0.0
music *= duck

# reverb
ir_d = 2.8
t_ir = tt(ir_d)
ir = np.vstack([lp(noise(ir_d), 5000) * np.exp(-t_ir / 0.7), lp(noise(ir_d), 5000) * np.exp(-t_ir / 0.7)])
ir[:, :int(0.015 * SR)] = 0
ir /= np.abs(ir).sum(axis=1, keepdims=True) ** 0.5 * 30
wet = np.vstack([signal.fftconvolve(send[c], ir[c])[:N] for c in (0, 1)])

mix = music * 1.0 + sfx * 1.0 + wet * 0.9
mix = hp(mix, 25)
peak = np.abs(mix).max()
mix = mix / peak * 1.4
mix = np.tanh(mix) * 0.89
fi = int(0.05 * SR)
mix[:, :fi] *= np.linspace(0, 1, fi)
fo = int(0.35 * SR)
mix[:, -fo:] *= np.linspace(1, 0, fo)
wavfile.write('out/soundtrack.wav', SR, (mix.T * 32767).astype(np.int16))
print('wrote out/soundtrack.wav', mix.shape, 'peak', peak)
