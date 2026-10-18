let activeAudio: HTMLAudioElement | null = null;

export const playStaticAudio = async (path: string): Promise<void> => {
  if (activeAudio !== null) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
  }

  const audio = new Audio(path);
  activeAudio = audio;

  try {
    await audio.play();
  } finally {
    audio.addEventListener(
      "ended",
      () => {
        if (activeAudio === audio) activeAudio = null;
      },
      { once: true },
    );
  }
};
