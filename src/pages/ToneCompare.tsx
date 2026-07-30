import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { words, sentences } from '../lib/data';
import { JyutpingText } from '../components/JyutpingText';
import { PlayButton } from '../components/PlayButton';
import { MicIcon } from '../components/icons';
import { useHoldToRecord } from '../hooks/useHoldToRecord';
import { decodeAudioPath, decodeBlob, playBuffer, toast } from '../lib/audio';
import { canRecord, extractPitchTrack, type PitchPoint } from '../lib/pitch';
import { dtwScore } from '../lib/pitchScore';
import { UI } from '../lib/ui';

interface RefItem {
  key: string;
  hanzi: string;
  jyutping: string;
  mandarin: string;
  audio: string;
  kind: string;
}

const CATALOG: RefItem[] = [
  ...words.map((w) => ({ key: `w-${w.id}`, hanzi: w.hanzi, jyutping: w.jyutping, mandarin: w.mandarin, audio: w.audio, kind: UI.tc_kindWord })),
  ...sentences.map((s) => ({ key: `s-${s.id}`, hanzi: s.hanzi, jyutping: s.jyutping, mandarin: s.mandarin, audio: s.audio, kind: UI.tc_kindSentence })),
];

function drawTracks(canvas: HTMLCanvasElement, ref: PitchPoint[], user: PitchPoint[]) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  // midline
  ctx.strokeStyle = '#E8E2D8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  const pad = 12;
  const spanST = 12; // +/- 6 semitones fills the height
  const line = (track: PitchPoint[], color: string, width: number) => {
    if (track.length < 2) return;
    const tmin = track[0].t;
    const tmax = track[track.length - 1].t || 1;
    const dur = tmax - tmin || 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    track.forEach((p, i) => {
      const x = pad + ((p.t - tmin) / dur) * (w - pad * 2);
      const clamped = Math.max(-spanST / 2, Math.min(spanST / 2, p.semitone));
      const y = h / 2 - (clamped / spanST) * (h - pad * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  };

  line(ref, '#9A948B', 5);
  line(user, '#C4622D', 3);
}

function ScoreRing({ value }: { value: number }) {
  const size = 64;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / 100));
  const color = value >= 75 ? '#3E9E6E' : value >= 50 ? '#C4622D' : '#B8503A';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E8E2D8" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold tabular-nums" style={{ color }}>{value}</span>
      </div>
    </div>
  );
}

export function ToneCompare() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<RefItem | null>(null);
  const [refTrack, setRefTrack] = useState<PitchPoint[]>([]);
  const [userTrack, setUserTrack] = useState<PitchPoint[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const refBuffer = useRef<AudioBuffer | null>(null);
  const userBuffer = useRef<AudioBuffer | null>(null);

  const recordable = useMemo(() => canRecord(), []);
  const { recording, startRecording, stopRecording, cancelRecording } = useHoldToRecord({
    enabled: recordable,
    onComplete: async (blob) => {
      try {
        const buf = await decodeBlob(blob);
        userBuffer.current = buf;
        const uTrack = extractPitchTrack(buf);
        setUserTrack(uTrack);
        if (refBuffer.current) {
          const rTrack = extractPitchTrack(refBuffer.current);
          const sc = dtwScore(rTrack.map((p) => p.semitone), uTrack.map((p) => p.semitone));
          setScore(sc);
          setHistory((h) => [sc, ...h].slice(0, 5));
        }
      } catch {
        toast(UI.toast_recordFailed);
      }
    },
    onStartError: () => toast(UI.toast_micUnavailable),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? CATALOG.filter((i) => i.hanzi.includes(q) || i.jyutping.toLowerCase().includes(q) || i.mandarin.includes(q))
      : CATALOG;
    return list.slice(0, 40);
  }, [query]);

  useEffect(() => {
    if (canvasRef.current) drawTracks(canvasRef.current, refTrack, userTrack);
  }, [refTrack, userTrack]);

  const pick = async (item: RefItem) => {
    setSelected(item);
    setUserTrack([]);
    setScore(null);
    setHistory([]);
    userBuffer.current = null;
    try {
      const buf = await decodeAudioPath(item.audio);
      refBuffer.current = buf;
      setRefTrack(extractPitchTrack(buf));
    } catch {
      refBuffer.current = null;
      setRefTrack([]);
      toast(UI.toast_audioMissing);
    }
  };

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <Link to="/tones" className="text-sm text-accent">{UI.tc_back}</Link>
        <h1 className="hero-han text-2xl font-bold text-ink mt-2">{UI.tc_title}</h1>
        <p className="text-sm text-tone6 mt-1">{UI.tc_sub}</p>
      </header>

      {!selected && (
        <div className="space-y-3">
          <label htmlFor="tone-compare-search" className="sr-only">{UI.tc_search}</label>
          <input
            id="tone-compare-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={UI.tc_search}
            className="w-full rounded-2xl border border-line bg-card px-4 py-3 text-ink outline-none focus:border-accent"
          />
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filtered.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => void pick(item)}
                className="card w-full text-left p-3 flex items-center gap-3 active:scale-[0.99]"
              >
                <span className="text-[10px] text-tone6 border border-line rounded px-1.5 py-0.5">{item.kind}</span>
                <span className="hero-han text-lg flex-1">{item.hanzi}</span>
                <JyutpingText jyutping={item.jyutping} className="text-xs" />
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div className="space-y-4">
          <div className="card p-4 flex items-center justify-between gap-3">
            <div>
              <div className="hero-han text-2xl">{selected.hanzi}</div>
              <JyutpingText jyutping={selected.jyutping} className="text-sm" />
              <div className="text-xs text-tone6 mt-1">{selected.mandarin}</div>
            </div>
            <div className="flex flex-col gap-2">
              <PlayButton audio={selected.audio} label={UI.tc_ref} />
              <button type="button" onClick={() => setSelected(null)} className="text-xs text-tone6">{UI.tc_change}</button>
            </div>
          </div>

          <div className="card p-3">
            <div className="flex items-center justify-between px-1 pb-2 text-xs">
              <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-1 rounded bg-[#9A948B]" /> {UI.tc_ref}</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-1 rounded bg-accent" /> {UI.tc_you}</span>
            </div>
            <canvas ref={canvasRef} className="w-full h-40" />
            {refTrack.length < 2 && (
              <p className="text-center text-xs text-tone6 py-2">{UI.tc_noRef}</p>
            )}
          </div>

          {score !== null && (
            <div className="card p-4">
              <div className="flex items-center gap-4">
                <ScoreRing value={score} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-ink">{UI.tc_simTitle}</div>
                  <p className="text-[11px] text-tone6 mt-0.5 leading-snug">{UI.tc_simDesc}</p>
                  {history.length > 1 && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-tone6">{UI.tc_recent}</span>
                      {history.map((h, i) => (
                        <span
                          key={i}
                          className="text-[11px] tabular-nums rounded px-1.5 py-0.5 bg-line/60 text-tone6"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {recordable ? (
            <button
              type="button"
              onPointerDown={() => void startRecording()}
              onPointerUp={stopRecording}
              onPointerLeave={() => recording && stopRecording()}
              onPointerCancel={cancelRecording}
              className={`btn w-full py-4 ${recording ? 'bg-tone1 text-white' : 'btn-primary'}`}
            >
              <MicIcon /> {recording ? UI.tc_recording : UI.tc_holdToRecord}
            </button>
          ) : (
            <div className="card p-4 text-sm text-tone6">{UI.tc_micHelp}</div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => refBuffer.current && playBuffer(refBuffer.current)}
              className="btn-outline flex-1"
            >
              ▶ {UI.tc_ref}
            </button>
            <button
              type="button"
              disabled={!userBuffer.current}
              onClick={() => userBuffer.current && playBuffer(userBuffer.current)}
              className="btn-ghost flex-1 disabled:opacity-40"
            >
              ▶ {UI.tc_yourVoice}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
