import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PitchShadow } from '../components/PitchShadow';
import {
  useHoldToRecord,
  type UseHoldToRecordOptions,
  type UseHoldToRecordResult,
} from './useHoldToRecord';

vi.mock('../lib/audio', () => ({
  decodeAudioPath: vi.fn(),
  decodeBlob: vi.fn(),
  toast: vi.fn(),
}));

class MockMediaRecorder {
  static instances: MockMediaRecorder[] = [];

  state: RecordingState = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onstop: ((event: Event) => void) | null = null;

  constructor(readonly stream: MediaStream) {
    MockMediaRecorder.instances.push(this);
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    if (this.state === 'inactive') return;
    this.state = 'inactive';
    this.onstop?.(new Event('stop'));
  }

  emitError() {
    this.onerror?.(new Event('error'));
  }
}

interface MockStream {
  stream: MediaStream;
  stop: ReturnType<typeof vi.fn<() => void>>;
}

function makeStream(): MockStream {
  const stop = vi.fn<() => void>();
  const track = { stop } as unknown as MediaStreamTrack;
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  return { stream, stop };
}

let controls: UseHoldToRecordResult | null = null;
let renderer: ReactTestRenderer | null = null;
let getUserMedia: ReturnType<typeof vi.fn<(constraints: MediaStreamConstraints) => Promise<MediaStream>>>;

function Harness({ options }: { options: UseHoldToRecordOptions }) {
  controls = useHoldToRecord(options);
  return null;
}

function currentControls(): UseHoldToRecordResult {
  if (!controls) throw new Error('Hook controls are unavailable');
  return controls;
}

function renderHook(options: Partial<UseHoldToRecordOptions> = {}) {
  const complete = options.onComplete ?? vi.fn();
  act(() => {
    renderer = create(createElement(Harness, { options: { onComplete: complete, ...options } }));
  });
  return complete;
}

async function startRecording() {
  await act(async () => {
    await currentControls().startRecording();
  });
}

beforeEach(() => {
  controls = null;
  renderer = null;
  MockMediaRecorder.instances = [];
  getUserMedia = vi.fn<(constraints: MediaStreamConstraints) => Promise<MediaStream>>();
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
  vi.stubGlobal('MediaRecorder', MockMediaRecorder as unknown as typeof MediaRecorder);
  vi.stubGlobal('window', { isSecureContext: true });
  vi.stubGlobal('location', { hostname: 'localhost' });
});

afterEach(() => {
  if (renderer) act(() => renderer?.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useHoldToRecord resource lifecycle', () => {
  it('stops every stream track on a normal stop and completes the recording', async () => {
    const first = makeStream();
    const secondTrackStop = vi.fn<() => void>();
    const secondTrack = { stop: secondTrackStop } as unknown as MediaStreamTrack;
    const stream = {
      getTracks: () => [first.stream.getTracks()[0], secondTrack],
    } as unknown as MediaStream;
    getUserMedia.mockResolvedValue(stream);
    const onComplete = vi.fn();
    renderHook({ onComplete });

    await startRecording();
    act(() => currentControls().stopRecording());

    expect(first.stop).toHaveBeenCalledOnce();
    expect(secondTrackStop).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('stops tracks on cancellation without completing the recording', async () => {
    const mock = makeStream();
    getUserMedia.mockResolvedValue(mock.stream);
    const onComplete = vi.fn();
    renderHook({ onComplete });

    await startRecording();
    act(() => currentControls().cancelRecording());

    expect(mock.stop).toHaveBeenCalledOnce();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('stops tracks when the component unmounts', async () => {
    const mock = makeStream();
    getUserMedia.mockResolvedValue(mock.stream);
    renderHook();
    await startRecording();

    act(() => renderer?.unmount());
    renderer = null;

    expect(mock.stop).toHaveBeenCalledOnce();
  });

  it('stops tracks and reports a recorder error', async () => {
    const mock = makeStream();
    getUserMedia.mockResolvedValue(mock.stream);
    const onRecordingError = vi.fn();
    renderHook({ onRecordingError });
    await startRecording();

    act(() => MockMediaRecorder.instances[0].emitError());

    expect(mock.stop).toHaveBeenCalledOnce();
    expect(onRecordingError).toHaveBeenCalledOnce();
  });

  it('automatically stops after the 30 second cap', async () => {
    vi.useFakeTimers();
    const mock = makeStream();
    getUserMedia.mockResolvedValue(mock.stream);
    const onComplete = vi.fn();
    renderHook({ onComplete });
    await startRecording();

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(mock.stop).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('prevents overlapping starts while microphone permission is pending', async () => {
    const mock = makeStream();
    let resolveStream: ((stream: MediaStream) => void) | null = null;
    getUserMedia.mockImplementation(() => new Promise((resolve) => {
      resolveStream = resolve;
    }));
    renderHook();

    let firstStart: Promise<void> | null = null;
    await act(async () => {
      firstStart = currentControls().startRecording();
      await currentControls().startRecording();
    });
    expect(getUserMedia).toHaveBeenCalledOnce();

    await act(async () => {
      if (!resolveStream || !firstStart) throw new Error('Pending start was not created');
      resolveStream(mock.stream);
      await firstStart;
    });
  });

  it('keeps the permission lock after cancelling a pending start', async () => {
    const first = makeStream();
    const second = makeStream();
    let resolveFirst: ((stream: MediaStream) => void) | null = null;
    getUserMedia
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveFirst = resolve;
      }))
      .mockResolvedValueOnce(second.stream);
    renderHook();

    let firstStart: Promise<void> | null = null;
    await act(async () => {
      firstStart = currentControls().startRecording();
      currentControls().cancelRecording();
      await currentControls().startRecording();
    });
    expect(getUserMedia).toHaveBeenCalledOnce();

    await act(async () => {
      if (!resolveFirst || !firstStart) throw new Error('Pending start was not created');
      resolveFirst(first.stream);
      await firstStart;
    });
    expect(first.stop).toHaveBeenCalledOnce();

    await startRecording();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it('releases an inactive session before replacing it', async () => {
    const first = makeStream();
    const second = makeStream();
    getUserMedia.mockResolvedValueOnce(first.stream).mockResolvedValueOnce(second.stream);
    renderHook();
    await startRecording();

    MockMediaRecorder.instances[0].state = 'inactive';
    await startRecording();

    expect(first.stop).toHaveBeenCalledOnce();
    expect(MockMediaRecorder.instances).toHaveLength(2);
  });
});

describe('PitchShadow recorder controls', () => {
  it('maps pointer cancellation to stream cleanup', async () => {
    const mock = makeStream();
    getUserMedia.mockResolvedValue(mock.stream);
    act(() => {
      renderer = create(createElement(PitchShadow, { audio: '/reference.mp3' }));
    });
    const button = renderer?.root.findByType('button');
    if (!button) throw new Error('PitchShadow record button was not rendered');
    const props = button.props as {
      onPointerDown: () => void;
      onPointerCancel: () => void;
    };

    await act(async () => {
      props.onPointerDown();
      await Promise.resolve();
    });
    act(() => props.onPointerCancel());

    expect(mock.stop).toHaveBeenCalledOnce();
  });
});
