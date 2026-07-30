import { Segmented, Toggle } from '../../components/Controls';
import { UI } from '../../lib/ui';
import { useProgress, type AudioSpeed, type Voice } from '../../stores/progress';

const SPEED_OPTIONS: { value: AudioSpeed; label: string }[] = [
  { value: 'normal', label: UI.pg_speedNormal },
  { value: 'slow', label: UI.pg_speedSlow },
];
const VOICE_OPTIONS: { value: Voice; label: string }[] = [
  { value: 'female', label: UI.pg_voiceFemale },
  { value: 'male', label: UI.pg_voiceMale },
];

/** 設定: playback speed, voice, and the analytics opt-in. */
export function PreferencesSection() {
  const audioSpeed = useProgress((state) => state.settings.audioSpeed);
  const voice = useProgress((state) => state.settings.voice);
  const analyticsEnabled = useProgress((state) => state.settings.analyticsEnabled);
  const setAudioSpeed = useProgress((state) => state.setAudioSpeed);
  const setVoice = useProgress((state) => state.setVoice);
  const setAnalyticsEnabled = useProgress((state) => state.setAnalyticsEnabled);

  return (
    <section>
      <h2 className="text-sm font-medium text-tone6 mb-2 px-1">{UI.pg_settings}</h2>
      <div className="card divide-y divide-line">
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-ink">{UI.pg_speed}</span>
            <span className="text-xs text-tone6">{UI.pg_speedHint}</span>
          </div>
          <Segmented
            value={audioSpeed}
            options={SPEED_OPTIONS}
            onChange={setAudioSpeed}
            label={UI.pg_speed}
          />
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-ink">{UI.pg_voice}</span>
            <span className="text-xs text-tone6">{UI.pg_voiceHint}</span>
          </div>
          <Segmented value={voice} options={VOICE_OPTIONS} onChange={setVoice} label={UI.pg_voice} />
        </div>
        <div className="p-4 flex items-center gap-3">
          <div className="flex-1">
            <div className="font-medium text-ink">{UI.pg_analytics}</div>
            <div className="text-xs text-tone6 mt-0.5">{UI.pg_analyticsHint}</div>
          </div>
          <Toggle on={analyticsEnabled} onChange={setAnalyticsEnabled} label={UI.pg_analytics} />
        </div>
      </div>
    </section>
  );
}
