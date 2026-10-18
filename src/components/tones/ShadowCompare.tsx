import { ArrowsLeftRight, Microphone, SpeakerHigh, Stop } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { toneItems } from "../../data";
import { decodePitchTrack, type PitchTrack } from "../../lib/pitch/extractPitch";
import type { ToneItem } from "../../types/domain";
import { PitchOverlay } from "./PitchOverlay";

type RecordingStatus = "idle" | "recording" | "analysing" | "ready" | "error";

interface ComparedTracks {
  reference: PitchTrack;
  user: PitchTrack;
}

export function ShadowCompare() {
  const references = toneItems.filter((item) => item.setId === "si").sort((a, b) => a.tone - b.tone);
  const [selected, setSelected] = useState<ToneItem>(() => {
    const first = references[0];
    if (first === undefined) throw new Error("Tone reference data is missing");
    return first;
  });
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [referencePlayed, setReferencePlayed] = useState(false);
  const [referencePlaying, setReferencePlaying] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [tracks, setTracks] = useState<ComparedTracks | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const referenceAudioRef = useRef<HTMLAudioElement | null>(null);
  const recordedUrlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const clearResult = () => {
    if (recordedUrlRef.current !== null) URL.revokeObjectURL(recordedUrlRef.current);
    recordedUrlRef.current = null;
    setRecordedUrl(null);
    setTracks(null);
    setStatus("idle");
    setErrorMessage(null);
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      releaseStream();
      userAudioRef.current?.pause();
      referenceAudioRef.current?.pause();
      if (recordedUrlRef.current !== null) URL.revokeObjectURL(recordedUrlRef.current);
    };
  }, []);

  const selectReference = (item: ToneItem) => {
    if (status === "recording" || status === "analysing") return;
    clearResult();
    referenceAudioRef.current?.pause();
    setSelected(item);
    setReferencePlayed(false);
    setReferencePlaying(false);
  };

  const playReference = async () => {
    userAudioRef.current?.pause();
    referenceAudioRef.current?.pause();
    setErrorMessage(null);
    setReferencePlaying(true);
    try {
      const audio = new Audio(selected.audio);
      referenceAudioRef.current = audio;
      audio.addEventListener("ended", () => {
        setReferencePlaying(false);
        setReferencePlayed(true);
      }, { once: true });
      audio.addEventListener("error", () => {
        setReferencePlaying(false);
        setStatus("error");
        setErrorMessage("參考音訊載入失敗，請再試一次。");
      }, { once: true });
      await audio.play();
    } catch {
      setReferencePlaying(false);
      setStatus("error");
      setErrorMessage("參考音訊載入失敗，請再試一次。");
    }
  };

  const analyseRecording = async (blob: Blob, referenceItem: ToneItem) => {
    setStatus("analysing");
    try {
      const [reference, user] = await Promise.all([
        decodePitchTrack(referenceItem.audio),
        decodePitchTrack(blob),
      ]);
      if (mountedRef.current) {
        setTracks({ reference, user });
        setStatus("ready");
      }
    } catch (error) {
      if (!mountedRef.current) return;
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "音高分析失敗，請再錄一次。");
    }
  };

  const startRecording = async () => {
    clearResult();
    setErrorMessage(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("error");
      setErrorMessage("呢個瀏覽器未支援錄音，請用最新版 Chrome、Edge 或 Safari。");
      return;
    }

    try {
      const recordingReference = selected;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const preferredType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : undefined;
      const recorder = preferredType === undefined ? new MediaRecorder(stream) : new MediaRecorder(stream, { mimeType: preferredType });
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        releaseStream();
        if (!mountedRef.current) return;
        const nextUrl = URL.createObjectURL(blob);
        recordedUrlRef.current = nextUrl;
        setRecordedUrl(nextUrl);
        void analyseRecording(blob, recordingReference);
      };
      recorder.start();
      setStatus("recording");
    } catch {
      releaseStream();
      setStatus("error");
      setErrorMessage("未能使用咪高峰。請確認瀏覽器已獲錄音權限。");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const playUser = async () => {
    if (recordedUrl === null) return;
    userAudioRef.current?.pause();
    const audio = new Audio(recordedUrl);
    userAudioRef.current = audio;
    try {
      await audio.play();
    } catch {
      setStatus("error");
      setErrorMessage("錄音播放失敗，請再錄一次。");
    }
  };

  return (
    <section aria-labelledby="shadow-title">
      <div className="max-w-2xl">
        <h2 id="shadow-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">跟住講，再疊線睇</h2>
        <p className="mt-3 leading-relaxed text-stone-600 dark:text-stone-300">先聽參考，再錄自己。系統只畫兩條音高走勢，唔會用一個分數判斷你。</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 sm:p-6">
          <p className="font-semibold">揀一個聲調</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {references.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={status === "recording" || status === "analysing"}
                onClick={() => selectReference(item)}
                className={`min-h-16 rounded-2xl border text-center transition disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] ${selected.id === item.id ? "border-ember bg-sky-50 text-ember-dark dark:bg-sky-950 dark:text-sky-200" : "border-stone-200 hover:border-ember dark:border-stone-700"}`}
                aria-pressed={selected.id === item.id}
              >
                <span className="text-2xl font-semibold">{item.hanzi}</span>
                <span className="block font-jyutping text-xs">{item.jyutping}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-stone-100 p-5 text-center dark:bg-stone-800">
            <p className="text-6xl font-semibold">{selected.hanzi}</p>
            <p className="mt-2 font-jyutping text-lg font-bold text-ember-dark dark:text-sky-300">{selected.jyutping}</p>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{selected.mandarin}</p>
          </div>

          <div className="mt-5 grid gap-3">
            <button type="button" disabled={referencePlaying} onClick={() => void playReference()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-ember px-5 font-bold text-white transition hover:bg-ember-dark disabled:opacity-60 active:scale-[0.98]">
              <SpeakerHigh size={21} weight="fill" /> {referencePlaying ? "播放中" : "先聽參考"}
            </button>
            {status === "recording" ? (
              <button type="button" onClick={stopRecording} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-red-700 px-5 font-bold text-white transition hover:bg-red-800 active:scale-[0.98]">
                <Stop size={21} weight="fill" /> 停止錄音
              </button>
            ) : (
              <button type="button" disabled={!referencePlayed || status === "analysing"} onClick={() => void startRecording()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-stone-300 px-5 font-bold transition hover:border-ember disabled:cursor-not-allowed disabled:opacity-45 active:scale-[0.98] dark:border-stone-600">
                <Microphone size={21} weight="bold" /> 開始錄音
              </button>
            )}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-stone-500 dark:text-stone-400">錄音只喺目前頁面處理，唔會上載或保存到伺服器。</p>
        </div>

        <div className="min-h-96 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 sm:p-6">
          {status === "idle" && (
            <div className="flex min-h-80 flex-col items-center justify-center text-center">
              <ArrowsLeftRight size={44} weight="regular" className="text-stone-400" />
              <p className="mt-4 text-xl font-semibold">先聽，再錄</p>
              <p className="mt-2 max-w-[32ch] text-sm leading-relaxed text-stone-500 dark:text-stone-400">錄完之後，灰色參考線同藍色錄音線會疊喺呢度。</p>
            </div>
          )}
          {status === "recording" && (
            <div className="flex min-h-80 flex-col items-center justify-center text-center" aria-live="polite">
              <span className="recording-pulse h-16 w-16 rounded-full bg-red-700" />
              <p className="mt-5 text-2xl font-semibold">錄緊喇</p>
              <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">講完就撳「停止錄音」。</p>
            </div>
          )}
          {status === "analysing" && (
            <div className="flex min-h-80 flex-col items-center justify-center text-center" aria-live="polite">
              <div className="h-2 w-48 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700"><div className="analysis-sweep h-full w-1/2 bg-ember" /></div>
              <p className="mt-5 text-xl font-semibold">分析音高走勢</p>
            </div>
          )}
          {status === "error" && (
            <div className="flex min-h-80 flex-col items-center justify-center text-center" role="alert">
              <p className="text-xl font-semibold text-red-700 dark:text-red-300">未能完成比較</p>
              <p className="mt-3 max-w-sm leading-relaxed text-stone-600 dark:text-stone-300">{errorMessage}</p>
            </div>
          )}
          {status === "ready" && tracks !== null && (
            <div>
              <PitchOverlay reference={tracks.reference} user={tracks.user} />
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => void playReference()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-stone-300 font-bold transition hover:border-ember active:scale-[0.98] dark:border-stone-600"><SpeakerHigh size={20} weight="fill" /> 播參考</button>
                <button type="button" onClick={() => void playUser()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-blue-500 font-bold text-blue-800 transition hover:bg-blue-50 active:scale-[0.98] dark:text-blue-200 dark:hover:bg-blue-950"><Microphone size={20} weight="bold" /> 播我錄音</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
