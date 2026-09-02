/** MIME type for voice URL playback — mirrors Laravel chat_history.js getVoiceAudioMime. */
export function getVoiceAudioMime(url: string): string {
  if (url.startsWith('blob:')) {
    return 'audio/wav';
  }

  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || '';
  if (ext === 'm4a' || ext === 'mp4') return 'audio/mp4';
  if (ext === 'mp3') return 'audio/mpeg';
  if (ext === 'wav') return 'audio/wav';
  if (ext === 'ogg') return 'audio/ogg';
  if (ext === 'caf') return 'audio/x-caf';
  if (ext === 'webm') return 'audio/webm';
  return 'audio/wav';
}

/** Upload filename — mirrors Laravel getVoiceUploadFileName (defaults to .wav). */
export function getVoiceUploadFileName(blob: Blob): string {
  const type = blob.type || '';
  if (type === 'audio/wav') return 'voice_note.wav';
  if (type === 'audio/mpeg') return 'voice_note.mp3';
  if (type === 'audio/mp4' || type === 'audio/m4a') return 'voice_note.m4a';
  if (type === 'audio/webm') return 'voice_note.webm';
  if (type === 'audio/ogg') return 'voice_note.ogg';
  return 'voice_note.wav';
}

/** RecordRTC WAV blobs often have an empty type — normalize so preview + upload work. */
export function normalizeVoiceBlob(blob: Blob): Blob {
  if (!blob || blob.size === 0) return blob;
  if (blob.type === 'audio/wav' || blob.type === 'audio/wave') return blob;
  return new Blob([blob], { type: 'audio/wav' });
}
