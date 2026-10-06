"""Female voiceover (Kokoro TTS, voice af_heart) + word timings that drive the visuals.

Writes:
  out/voiceover.wav   48 kHz mono, processed narration placed on the 71 s timeline
  src/vo_timing.js    VO_TIMING = { segId: [[start, end], ...] } per caption word
Run order: NO_VO=1 node dump_timing.js && python3 voice.py && node dump_timing.js && python3 audio.py
Needs: pip install kokoro-onnx soundfile, plus the model files in $KOKORO_DIR:
  https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
  https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
Other female voices to try via VO_VOICE: af_bella, af_nicole, af_sarah, bf_emma, bf_isabella.
"""
import itertools, json, os, re, subprocess, sys
import numpy as np
from scipy import signal
from scipy.io import wavfile
from kokoro_onnx import Kokoro

MODEL_DIR = os.environ.get('KOKORO_DIR', '/tmp/claude-0/-home-user-test/58701296-548b-5073-9081-bc970a693c2b/scratchpad/tts/')
VOICE = os.environ.get('VO_VOICE', 'af_heart')
SR_TTS, SR = 24000, 48000
DUR = 71.0
START, END = 0.35, 68.9  # speaking window (same as the estimated timeline)

# Spoken text per segment. Each string list is one or more utterances; words must line up 1:1
# with the caption words (only spelling and punctuation may differ).
SPOKEN = {
    's1': ['Mistaking a dog breed with AI is harmless, but a false positive on a toxic mushroom can be fatal.'],
    's2': ['The reason computer vision fails so badly is a physical trap called visual occlusion.'],
    's3': ['Take the death cap, a highly toxic mushroom AI frequently mistakes for a harmless edible.'],
    's4a': ['AI relies strictly on surface pixels.'],
    's4b': ["From a top-down smartphone photo, the death cap's shape looks perfectly innocent."],
    's5a': ["But human experts don't just look at the cap."],
    's5b': ['To spot this specific threat, they check for a sack-like structure at the base of the stem.'],
    's6': ['But out in the wild, this crucial root is completely buried under soil and fallen leaves.'],
    's7': ["Because it's blocked from the camera's line of sight, that's visual occlusion, the data doesn't exist."],
    's8': ['And this limitation goes deeper than the dirt.'],
    's9': ['Flipping the cap reveals pure white gills, which drop a white spore print, a classic warning sign.'],
    's10': ["A two-D surface image can never capture what's underneath."],
    's11': ["Because AI can't infer features it can't see, it makes life-or-death guesses using deceptive camouflage."],
    's12': ['And that deadly death cap, missing the buried root and hidden white gills, the AI confidently labels the lethal hazard:',
            'Safe to eat.'],
}
# pause after each segment (seconds, before fitting) and between utterances of one segment
GAP = {'s1': 0.5, 's2': 0.45, 's3': 0.4, 's4a': 0.3, 's4b': 0.45, 's5a': 0.3, 's5b': 0.4, 's6': 0.4,
       's7': 0.45, 's8': 0.3, 's9': 0.45, 's10': 0.4, 's11': 0.45, 's12': 0.0}
INNER_GAP = {'s12': 0.55}
BREAK_PUNCT = re.compile(r'[,.:;!?]$')
VOWELS = set('aeiouyɑɐɒæɔəɘɚɛɜɝɞɪɨʊʉʌʏøœɤɯɵ')


def phoneme_weight(ph):
    w = 0.0
    for ch in ph:
        if ch in 'ˈˌ.  ':
            continue
        if ch == 'ː':
            w += 0.6
        elif ch in VOWELS:
            w += 1.7
        else:
            w += 1.0
    return max(w, 1.0)


def trim(x, thr_db=-42):
    env = np.abs(x)
    thr = env.max() * 10 ** (thr_db / 20)
    idx = np.where(env > thr)[0]
    a = max(0, idx[0] - int(0.01 * SR_TTS))
    b = min(len(x), idx[-1] + int(0.03 * SR_TTS))
    return x[a:b]


def internal_gaps(x, min_len=0.09):
    """silent runs inside an utterance: list of (start_s, end_s), longest first"""
    hop = int(0.005 * SR_TTS)
    frames = len(x) // hop
    rms = np.sqrt(np.convolve(x[:frames * hop] ** 2, np.ones(hop * 4) / (hop * 4), 'same')[::hop])
    thr = rms.max() * 10 ** (-32 / 20)
    quiet = rms < thr
    gaps, i = [], 0
    while i < frames:
        if quiet[i]:
            j = i
            while j < frames and quiet[j]:
                j += 1
            s, e = i * hop / SR_TTS, j * hop / SR_TTS
            if e - s >= min_len and s > 0.05 and e < len(x) / SR_TTS - 0.05:
                gaps.append((s, e))
            i = j
        else:
            i += 1
    return sorted(gaps, key=lambda g: g[0] - g[1])


def layout(n, weights, pairs, total):
    """word [start, end] given pauses pinned after certain words: pairs = [(word_idx, (gap_s, gap_e))]"""
    out, cur, t0 = [None] * n, 0, 0.0
    spans = []
    for b, g in sorted(pairs):
        spans.append((cur, b, t0, g[0]))
        cur, t0 = b + 1, g[1]
    spans.append((cur, n - 1, t0, total))
    for (i0, i1, s, e) in spans:
        tot = sum(weights[i0:i1 + 1])
        c = s
        for i in range(i0, i1 + 1):
            d = (e - s) * weights[i] / tot
            out[i] = [c, c + d]
            c += d
    return out


def align(words_spoken, phonemes, x):
    """word [start, end] within utterance audio x (trimmed).
    Pauses are pinned to punctuation first, then other clear pauses snap the nearest word boundary;
    words between pauses share the time by phoneme weight."""
    total = len(x) / SR_TTS
    n = len(words_spoken)
    weights = [phoneme_weight(p) for p in phonemes]
    breaks = [i for i, w in enumerate(words_spoken[:-1]) if BREAK_PUNCT.search(w)]
    all_gaps = internal_gaps(x, 0.05)
    long_gaps = sorted([g for g in all_gaps if g[1] - g[0] >= 0.09][:len(breaks)])
    wsum = np.cumsum(weights)
    est = {bk: wsum[bk] / wsum[-1] * total for bk in breaks}
    best, pairs = None, []
    for combo in itertools.combinations(breaks, len(long_gaps)):
        cost = sum(abs(est[bk] - (g[0] + g[1]) / 2) for bk, g in zip(combo, long_gaps))
        if best is None or cost < best:
            best, pairs = cost, list(zip(combo, long_gaps))
    used = {g for _, g in pairs}
    for g in all_gaps:  # longest first
        if g in used:
            continue
        cur = layout(n, weights, pairs, total)
        mid = (g[0] + g[1]) / 2
        taken = {b for b, _ in pairs}
        cands = [k for k in range(n - 1) if k not in taken]
        if not cands:
            break
        k = min(cands, key=lambda kk: abs(cur[kk][1] - mid))
        if abs(cur[k][1] - mid) > 0.22:
            continue
        trial = sorted(pairs + [(k, g)])
        if all(trial[i][1][0] < trial[i + 1][1][0] for i in range(len(trial) - 1)):
            pairs = trial
            used.add(g)
    return layout(n, weights, pairs, total)


def synth_all(kok, speed, cap_words):
    segs = {}
    for sid, utts in SPOKEN.items():
        parts = []
        for u in utts:
            x, sr = kok.create(u, voice=VOICE, speed=speed, lang='en-us')
            assert sr == SR_TTS
            x = trim(np.asarray(x, dtype=np.float64))
            words = u.split()
            phs = [kok.tokenizer.phonemize(re.sub(r'[,.:;!?]+$', '', w), 'en-us') for w in words]
            parts.append((x, align(words, phs, x)))
        n = sum(len(p[1]) for p in parts)
        assert n == len(cap_words[sid]), f'{sid}: spoken {n} words vs caption {len(cap_words[sid])}'
        segs[sid] = parts
    return segs


def seg_len(parts, sid):
    return sum(len(x) for x, _ in parts) / SR_TTS + INNER_GAP.get(sid, 0) * (len(parts) - 1)


def main():
    tm = json.load(open('out/timing.json'))
    order = [s['id'] for s in tm['segs']]
    cap_words = {s['id']: [w['text'] for w in s['words']] for s in tm['segs']}
    kok = Kokoro(MODEL_DIR + 'kokoro-v1.0.onnx', MODEL_DIR + 'voices-v1.0.bin')
    window = END - START
    gaps_total = sum(GAP[s] for s in order)
    # measure natural length, then pick the speed that fits the window
    segs = synth_all(kok, 1.0, cap_words)
    speech = sum(seg_len(segs[s], s) for s in order)
    speed = 1.0
    # Kokoro's speed knob isn't exactly proportional, so iterate until the pauses keep their design length
    for _ in range(3):
        target = window - gaps_total
        if abs(speech - target) < 0.4:
            break
        speed = float(np.clip(speed * speech / target, 0.9, 1.3))
        segs = synth_all(kok, speed, cap_words)
        speech = sum(seg_len(segs[s], s) for s in order)
        print(f'speed {speed:.3f} -> speech {speech:.2f}s (target {target:.2f}s)')
    # stretch/squeeze the pauses so the last word lands at END
    gscale = max(0.4, (window - speech) / gaps_total)
    print(f'speech at speed {speech:.2f}s, gap scale {gscale:.2f}')
    track = np.zeros(int(DUR * SR_TTS))
    timing = {}
    t = START
    for sid in order:
        timing[sid] = []
        for pi, (x, al) in enumerate(segs[sid]):
            i0 = int(round(t * SR_TTS))
            track[i0:i0 + len(x)] += x
            timing[sid] += [[round(t + a, 3), round(t + b, 3)] for a, b in al]
            t += len(x) / SR_TTS
            if pi < len(segs[sid]) - 1:
                t += INNER_GAP.get(sid, 0)
        t += GAP[sid] * gscale
    print(f'last word ends at {timing[order[-1]][-1][1]:.2f}s')
    raw = 'out/voiceover_raw.wav'
    wavfile.write(raw, SR_TTS, (track / max(1e-9, np.abs(track).max()) * 0.9 * 32767).astype(np.int16))
    # broadcast-style polish: rumble cut, gentle compression, a little presence, 48 kHz
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af',
                    'highpass=f=75,acompressor=threshold=-22dB:ratio=3:attack=4:release=90:makeup=4dB,'
                    'equalizer=f=3200:t=q:w=1.2:g=2,equalizer=f=180:t=q:w=1:g=1.5,aresample=48000',
                    '-ar', str(SR), 'out/voiceover.wav'], check=True)
    with open('src/vo_timing.js', 'w') as f:
        f.write('// Generated by voice.py: per-word [start, end] of the voiceover, seconds.\n')
        f.write(f'// voice: {VOICE} (Kokoro-82M), speed {speed:.3f}\n')
        f.write('const VO_TIMING = ' + json.dumps(timing, separators=(',', ':')) + ';\n')
    print('wrote out/voiceover.wav and src/vo_timing.js')


if __name__ == '__main__':
    main()
