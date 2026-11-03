import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { getVoiceAudioMime } from '../../../utils/voiceAudioUtils';

interface VoicePlayerProps {
  voiceUrl: string;
  duration?: string;
  isSent?: boolean;
  /** True while waiting for a pre-signed URL (realtime). */
  isLoading?: boolean;
}

function isPlayableVoiceUrl(url: string): boolean {
  const value = String(url || '').trim();
  if (!value) return false;
  if (value.startsWith('blob:') || value.startsWith('data:')) return true;
  if (value.startsWith('http://') || value.startsWith('https://')) return true;
  return false;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({
  voiceUrl,
  duration,
  isSent = false,
  isLoading = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playable = isPlayableVoiceUrl(voiceUrl);
  const showLoading = isLoading || (!audioReady && playable && !audioFailed) || (!playable && !audioFailed);

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
    setIsPlaying(false);
    setCurrentTime(0);
    setTotalDuration(0);
    setAudioReady(false);
    setAudioFailed(false);

    if (!audio || !playable || isLoading) {
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    audio.load();
  }, [voiceUrl, audioMime, playable, isLoading]);

  const onLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (Number.isFinite(audio.duration) && !Number.isNaN(audio.duration) && audio.duration > 0) {
      setTotalDuration(audio.duration);
    }
    setAudioReady(true);
  }, []);

  const onCanPlay = useCallback(() => {
    setAudioReady(true);
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
    if (!audio || showLoading || !playable) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    audio
      .play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch((e) => {
        console.error('Playback error:', e);
        setAudioFailed(true);
      });
  }, [isPlaying, showLoading, playable]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || showLoading || !totalDuration || !Number.isFinite(totalDuration)) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const seekTime = percent * totalDuration;
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const progressPercent =
    totalDuration > 0 && Number.isFinite(totalDuration) ? (currentTime / totalDuration) * 100 : 0;

  const validDuration = sanitizeDuration(duration);

  const displayDuration =
    totalDuration > 0 && Number.isFinite(totalDuration) ? formatTime(totalDuration) : validDuration;

  return (
    <div className={`voice-player ${isSent ? 'sent' : 'received'} ${showLoading ? 'is-loading' : ''}`}>
      {playable && !isLoading ? (
        <audio
          ref={audioRef}
          preload="metadata"
          onLoadedMetadata={onLoadedMetadata}
          onCanPlay={onCanPlay}
          onTimeUpdate={onTimeUpdate}
          onEnded={onEnded}
          onError={() => {
            console.error('Voice message failed to load:', voiceUrl);
            setAudioFailed(true);
            setAudioReady(false);
          }}
        >
          <source src={voiceUrl} type={audioMime} />
        </audio>
      ) : null}

      <button
        type="button"
        className="vp-btn"
        onClick={togglePlay}
        disabled={showLoading || audioFailed}
        title={showLoading ? 'Loading voice note' : isPlaying ? 'Pause' : 'Play voice note'}
        aria-label={showLoading ? 'Loading voice note' : isPlaying ? 'Pause' : 'Play voice note'}
        aria-busy={showLoading}
      >
        {showLoading ? (
          <Loader2 size={14} className="vp-spinner" aria-hidden="true" />
        ) : isPlaying ? (
          <Pause size={14} />
        ) : (
          <Play size={14} style={{ marginLeft: 1 }} />
        )}
      </button>

      <div
        className="vp-track"
        onClick={handleSeek}
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
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

      <div className="vp-time">{isPlaying ? formatTime(currentTime) : displayDuration}</div>
    </div>
  );
};
