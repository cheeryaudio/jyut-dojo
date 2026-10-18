import { Microphone, Play, Stop } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

type Status = "idle" | "recording" | "ready" | "error";

export function VoiceRecorder({ onRecorded }: { onRecorded: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const urlRef = useRef<string | null>(null);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (urlRef.current !== null) URL.revokeObjectURL(urlRef.current);
  }, []);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const url = URL.createObjectURL(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
        if (urlRef.current !== null) URL.revokeObjectURL(urlRef.current);
        urlRef.current = url;
        setRecordedUrl(url);
        setStatus("ready");
        onRecorded();
      };
      recorder.start();
      setStatus("recording");
    } catch {
      setStatus("error");
    }
  };

  const stop = () => recorderRef.current?.state === "recording" && recorderRef.current.stop();
  const play = () => { if (recordedUrl !== null) void new Audio(recordedUrl).play(); };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      {status === "recording" ? (
        <button type="button" onClick={stop} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-700 px-5 font-black text-white active:scale-[0.98]"><Stop size={20} weight="fill" /> 停止錄音</button>
      ) : (
        <button type="button" onClick={() => void start()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ember px-5 font-black text-white active:scale-[0.98]"><Microphone size={20} weight="bold" /> {status === "ready" ? "再錄一次" : "開始錄音"}</button>
      )}
      {status === "ready" && <button type="button" onClick={play} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-stone-300 font-black active:scale-[0.98] dark:border-stone-700"><Play size={18} weight="fill" /> 聽返自己</button>}
      {status === "error" && <p className="mt-3 text-sm font-bold text-red-700 dark:text-red-300" role="alert">无法录音，请检查麦克风权限。</p>}
      <p className="mt-3 text-xs leading-relaxed text-stone-500 dark:text-stone-400">錄音只留喺目前頁面，唔會上載。</p>
    </div>
  );
}
