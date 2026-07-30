import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_MAX_DURATION_MS = 30_000;

interface RecordingSession {
  recorder: MediaRecorder;
  stream: MediaStream;
  chunks: Blob[];
  cancelled: boolean;
  tracksReleased: boolean;
  timeoutId: ReturnType<typeof setTimeout> | null;
}

export interface UseHoldToRecordOptions {
  enabled?: boolean;
  maxDurationMs?: number;
  onComplete: (blob: Blob) => void | Promise<void>;
  onStartError?: (error: unknown) => void;
  onRecordingError?: (event: Event) => void;
}

export interface UseHoldToRecordResult {
  recording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
}

function stopTracks(stream: MediaStream) {
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // Keep releasing the remaining tracks if one browser track throws.
    }
  }
}

function releaseSessionTracks(session: RecordingSession) {
  if (session.tracksReleased) return;
  session.tracksReleased = true;
  stopTracks(session.stream);
}

function clearSessionTimer(session: RecordingSession) {
  if (session.timeoutId !== null) {
    clearTimeout(session.timeoutId);
    session.timeoutId = null;
  }
}

function cancelSession(session: RecordingSession) {
  session.cancelled = true;
  clearSessionTimer(session);
  session.recorder.ondataavailable = null;
  session.recorder.onerror = null;
  session.recorder.onstop = null;
  if (session.recorder.state !== 'inactive') {
    try {
      session.recorder.stop();
    } catch {
      // Track cleanup below is the essential fallback when recorder.stop fails.
    }
  }
  releaseSessionTracks(session);
}

/**
 * Owns the complete lifecycle for a press-and-hold MediaRecorder session.
 * Consumers only process the completed Blob and map pointer events to start,
 * stop, or cancel.
 */
export function useHoldToRecord({
  enabled = true,
  maxDurationMs = DEFAULT_MAX_DURATION_MS,
  onComplete,
  onStartError,
  onRecordingError,
}: UseHoldToRecordOptions): UseHoldToRecordResult {
  const [recording, setRecording] = useState(false);
  const activeSession = useRef<RecordingSession | null>(null);
  const pendingStart = useRef<number | null>(null);
  const requestVersion = useRef(0);
  const mounted = useRef(true);
  const onCompleteRef = useRef(onComplete);
  const onStartErrorRef = useRef(onStartError);
  const onRecordingErrorRef = useRef(onRecordingError);

  onCompleteRef.current = onComplete;
  onStartErrorRef.current = onStartError;
  onRecordingErrorRef.current = onRecordingError;

  const invalidatePendingStart = useCallback(() => {
    // The browser permission request itself cannot be cancelled. Keep its lock
    // until the promise settles so a second getUserMedia request cannot overlap.
    requestVersion.current += 1;
  }, []);

  const cancelRecording = useCallback(() => {
    invalidatePendingStart();
    const session = activeSession.current;
    activeSession.current = null;
    if (session) cancelSession(session);
    if (mounted.current) setRecording(false);
  }, [invalidatePendingStart]);

  const stopRecording = useCallback(() => {
    invalidatePendingStart();
    const session = activeSession.current;
    if (!session) {
      if (mounted.current) setRecording(false);
      return;
    }

    clearSessionTimer(session);
    if (mounted.current) setRecording(false);

    if (session.recorder.state !== 'inactive') {
      try {
        session.recorder.stop();
      } catch {
        session.cancelled = true;
        activeSession.current = null;
        releaseSessionTracks(session);
      }
    } else {
      session.cancelled = true;
      activeSession.current = null;
    }

    // Release immediately on pointer-up rather than relying on a later stop event.
    releaseSessionTracks(session);
  }, [invalidatePendingStart]);

  const startRecording = useCallback(async () => {
    if (!enabled || pendingStart.current !== null) return;

    const existing = activeSession.current;
    if (existing && existing.recorder.state !== 'inactive') return;
    if (existing) {
      activeSession.current = null;
      cancelSession(existing);
    }

    const requestId = ++requestVersion.current;
    pendingStart.current = requestId;
    let acquiredStream: MediaStream | null = null;

    try {
      acquiredStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (
        !mounted.current
        || requestVersion.current !== requestId
        || pendingStart.current !== requestId
      ) {
        stopTracks(acquiredStream);
        return;
      }

      const recorder = new MediaRecorder(acquiredStream);
      const session: RecordingSession = {
        recorder,
        stream: acquiredStream,
        chunks: [],
        cancelled: false,
        tracksReleased: false,
        timeoutId: null,
      };

      recorder.ondataavailable = (event) => {
        if (!session.cancelled && event.data.size > 0) session.chunks.push(event.data);
      };
      recorder.onerror = (event) => {
        session.cancelled = true;
        clearSessionTimer(session);
        recorder.ondataavailable = null;
        recorder.onerror = null;
        recorder.onstop = null;
        if (recorder.state !== 'inactive') {
          try {
            recorder.stop();
          } catch {
            // Track cleanup below still guarantees the microphone is released.
          }
        }
        releaseSessionTracks(session);
        if (activeSession.current === session) activeSession.current = null;
        if (mounted.current) setRecording(false);
        onRecordingErrorRef.current?.(event);
      };
      recorder.onstop = () => {
        clearSessionTimer(session);
        releaseSessionTracks(session);
        if (activeSession.current === session) activeSession.current = null;
        if (mounted.current) setRecording(false);
        if (!session.cancelled) {
          const blob = new Blob(session.chunks, { type: recorder.mimeType || 'audio/webm' });
          void onCompleteRef.current(blob);
        }
      };

      activeSession.current = session;
      pendingStart.current = null;
      recorder.start();
      if (mounted.current) setRecording(true);
      session.timeoutId = setTimeout(stopRecording, maxDurationMs);
    } catch (error: unknown) {
      const session = activeSession.current;
      if (session?.stream === acquiredStream) {
        activeSession.current = null;
        cancelSession(session);
      } else if (acquiredStream) {
        stopTracks(acquiredStream);
      }
      if (mounted.current && requestVersion.current === requestId) {
        setRecording(false);
        onStartErrorRef.current?.(error);
      }
    } finally {
      if (pendingStart.current === requestId) pendingStart.current = null;
    }
  }, [enabled, maxDurationMs, stopRecording]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      invalidatePendingStart();
      const session = activeSession.current;
      activeSession.current = null;
      if (session) cancelSession(session);
    };
  }, [invalidatePendingStart]);

  return { recording, startRecording, stopRecording, cancelRecording };
}
