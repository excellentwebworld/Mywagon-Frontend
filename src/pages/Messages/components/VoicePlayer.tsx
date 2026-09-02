import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import { getVoiceAudioMime } from '../../../utils/voiceAudioUtils';

interface VoicePlayerProps {
  voiceUrl: string;
  duration?: string;
  isSent?: boolean;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({ voiceUrl, duration, isSent = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatTime = (sec: number) => {
    if (!Number.isFinite(sec) || Number.isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const sanitizeDuration = (raw?: string) => {
    if (!raw || raw.includes('NaN') || raw.includes('Infinity')) return '0:05';
    if (raw.includes(':')) return raw;
    const num = parseFloat(raw);
    if (!Number.isFinite(num) || Number.isNaN(num) || num <= 0) return '0:05';
    const sec = num > 100 ? num / 1000 : num;
    return formatTime(sec);
  };

  const audioMime = getVoiceAudioMime(voiceUrl);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setIsPlaying(false);
    setCurrentTime(0);
    setTotalDuration(0);
    audio.pause();
    audio.currentTime = 0;
    audio.load();
  }, [voiceUrl, audioMime]);

  const onLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (Number.isFinite(audio.duration) && !Number.isNaN(audio.duration) && audio.duration > 0) {
      setTotalDuration(audio.duration);
    }
  }, []);

  const onTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (Number.isFinite(audio.currentTime) && !Number.isNaN(audio.currentTime)) {
      setCurrentTime(audio.currentTime);
    }
    if (Number.isFinite(audio.duration) && !Number.isNaN(audio.duration) && audio.duration > 0) {
      setTotalDuration((prev) => (prev > 0 ? prev : audio.duration));
    }
  }, []);

  const onEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    audio.play().then(() => {
      setIsPlaying(true);
    }).catch((e) => {
      console.error('Playback error:', e);
    });
  }, [isPlaying]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !totalDuration || !Number.isFinite(totalDuration)) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const seekTime = percent * totalDuration;
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const progressPercent = (totalDuration > 0 && Number.isFinite(totalDuration))
    ? (currentTime / totalDuration) * 100
    : 0;

  const validDuration = sanitizeDuration(duration);

  const displayDuration = (totalDuration > 0 && Number.isFinite(totalDuration))
    ? formatTime(totalDuration)
    : validDuration;

  return (
    <div className={`voice-player ${isSent ? 'sent' : 'received'}`}>
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        onError={() => console.error('Voice message failed to load:', voiceUrl)}
      >
        <source src={voiceUrl} type={audioMime} />
      </audio>

      <button
        type="button"
        className="vp-btn"
        onClick={togglePlay}
        title={isPlaying ? 'Pause' : 'Play voice note'}
        aria-label={isPlaying ? 'Pause' : 'Play voice note'}
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 1 }} />}
      </button>

      <div className="vp-track" onClick={handleSeek} role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
        <div className="vp-progress" style={{ width: `${progressPercent}%` }} />
        <div className="vp-waveform">
          {[40, 75, 30, 90, 60, 45, 80, 55, 70, 35, 85, 60, 40, 95, 50, 65, 30, 80].map((h, i) => (
            <span
              key={i}
              className="vp-bar"
              style={{
                height: `${h}%`,
                opacity: (i / 18) * 100 <= progressPercent ? 1 : 0.45,
              }}
            />
          ))}
        </div>
      </div>

      <div className="vp-time">
        {isPlaying ? formatTime(currentTime) : displayDuration}
      </div>
    </div>
  );
};
