import { useState, useRef, useCallback, useEffect } from 'react';
import RecordRTC, { StereoAudioRecorder } from 'recordrtc';
import { normalizeVoiceBlob } from '../../../utils/voiceAudioUtils';

export interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isPreviewing: boolean;
  recordingTime: number;
  previewDuration: number;
  previewCurrentTime: number;
  isPlayingPreview: boolean;
  audioBlob: Blob | null;
  audioUrl: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
  discardPreview: () => void;
  togglePlayPreview: () => void;
  seekPreview: (percent: number) => void;
  formatTimer: (seconds: number) => string;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const recorderRef = useRef<RecordRTC | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const recordingTimeRef = useRef<number>(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Timer helper: seconds -> "MM:SS"
  const formatTimer = useCallback((sec: number): string => {
    if (!Number.isFinite(sec) || Number.isNaN(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (recorderRef.current) {
        try {
          recorderRef.current.destroy();
        } catch {}
        recorderRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Start recording using RecordRTC (WAV, 44.1kHz mono PCM - identical to Laravel chat_history.js)
  const startRecording = useCallback(async () => {
    try {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      setAudioBlob(null);
      setIsPreviewing(false);
      setIsPlayingPreview(false);
      setRecordingTime(0);
      recordingTimeRef.current = 0;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Your browser does not support microphone audio recording.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // RecordRTC with StereoAudioRecorder creates standard 16-bit PCM WAV (audio/wav)
      // which is 100% playable on iOS / Android mobile apps and web browsers.
      const recorder = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/wav',
        recorderType: StereoAudioRecorder,
        numberOfAudioChannels: 1,
        desiredSampRate: 44100,
      });

      recorder.startRecording();
      recorderRef.current = recorder;
      setIsRecording(true);

      timerIntervalRef.current = window.setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setIsRecording(false);
      alert('Could not access microphone. Please check your browser permissions.');
    }
  }, [audioUrl]);

  // Stop recording and transition to preview mode
  const stopRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const recorder = recorderRef.current;
    if (!recorder) return;

    setIsRecording(false);

    recorder.stopRecording(() => {
      const rawBlob = recorder.getBlob();
      const blob = normalizeVoiceBlob(rawBlob);

      if (!blob || blob.size === 0) {
        alert('Recording failed. No audio was captured. Please try again.');
        try {
          recorder.destroy();
        } catch {}
        recorderRef.current = null;
        setIsPreviewing(false);
        return;
      }

      try {
        recorder.destroy();
      } catch {}
      recorderRef.current = null;

      const url = URL.createObjectURL(blob);

      setAudioBlob(blob);
      setAudioUrl(url);
      setIsPreviewing(true);

      const fallbackDur = recordingTimeRef.current > 0 ? recordingTimeRef.current : 1;
      setPreviewDuration(fallbackDur);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const audio = new Audio(url);
      audio.preload = 'auto';
      previewAudioRef.current = audio;
      audio.onloadedmetadata = () => {
        if (Number.isFinite(audio.duration) && !Number.isNaN(audio.duration) && audio.duration > 0) {
          setPreviewDuration(audio.duration);
        }
      };
      audio.oncanplaythrough = () => {
        if (Number.isFinite(audio.duration) && !Number.isNaN(audio.duration) && audio.duration > 0) {
          setPreviewDuration(audio.duration);
        }
      };
      audio.onerror = () => {
        console.error('Voice preview failed to load');
      };
      audio.ontimeupdate = () => {
        if (Number.isFinite(audio.currentTime) && !Number.isNaN(audio.currentTime)) {
          setPreviewCurrentTime(audio.currentTime);
        }
      };
      audio.onended = () => {
        setIsPlayingPreview(false);
        setPreviewCurrentTime(0);
      };
      audio.load();
    });
  }, []);

  // Cancel recording and discard everything immediately
  const cancelRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (recorderRef.current) {
      try {
        recorderRef.current.destroy();
      } catch {}
      recorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setIsPreviewing(false);
    setRecordingTime(0);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
  }, [audioUrl]);

  // Discard preview
  const discardPreview = useCallback(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (recorderRef.current) {
      try {
        recorderRef.current.destroy();
      } catch {}
      recorderRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setIsPreviewing(false);
    setIsPlayingPreview(false);
    setPreviewDuration(0);
    setPreviewCurrentTime(0);
    setRecordingTime(0);
  }, [audioUrl]);

  // Toggle preview playback
  const togglePlayPreview = useCallback(() => {
    const audio = previewAudioRef.current;
    if (!audio) return;

    if (isPlayingPreview) {
      audio.pause();
      setIsPlayingPreview(false);
    } else {
      audio.play().then(() => {
        setIsPlayingPreview(true);
      }).catch((e) => {
        console.error('Audio play error:', e);
      });
    }
  }, [isPlayingPreview]);

  // Seek preview
  const seekPreview = useCallback((percent: number) => {
    const audio = previewAudioRef.current;
    if (!audio || !audio.duration) return;
    const seekTime = (percent / 100) * audio.duration;
    audio.currentTime = seekTime;
    setPreviewCurrentTime(seekTime);
  }, []);

  return {
    isRecording,
    isPreviewing,
    recordingTime,
    previewDuration,
    previewCurrentTime,
    isPlayingPreview,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    cancelRecording,
    discardPreview,
    togglePlayPreview,
    seekPreview,
    formatTimer,
  };
}

