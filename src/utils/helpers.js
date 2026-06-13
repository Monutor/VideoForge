export const VIDEO_FORMATS = ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'gif'];

export const COMPRESSION_PRESETS = {
  minimal: { label: 'Минимальное', crf: 28, scale: -1 },
  medium: { label: 'Среднее', crf: 23, scale: -1 },
  low: { label: 'Минимальная потеря', crf: 18, scale: -1 },
};

export const RESOLUTION_OPTIONS = [
  { label: 'Оригинал', value: -1 },
  { label: '2160p (4K)', value: 2160 },
  { label: '1080p (Full HD)', value: 1080 },
  { label: '720p (HD)', value: 720 },
  { label: '480p (SD)', value: 480 },
  { label: '360p', value: 360 },
];

export const FPS_OPTIONS = [
  { label: 'Оригинал', value: 0 },
  { label: '60 fps', value: 60 },
  { label: '30 fps', value: 30 },
  { label: '24 fps', value: 24 },
];

export const VIDEO_BITRATE_OPTIONS = [
  { label: 'Высокий (8 Mbps)', value: '8000k' },
  { label: 'Средний (4 Mbps)', value: '4000k' },
  { label: 'Низкий (2 Mbps)', value: '2000k' },
  { label: 'Минимальный (1 Mbps)', value: '1000k' },
];

export function formatFileSize(bytes) {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

export function estimateOutputSize(inputSize, preset, crf) {
  const crfValue = crf ?? (preset ? COMPRESSION_PRESETS[preset]?.crf : 23) ?? 23;

  if (crfValue <= 0) return inputSize;
  if (crfValue <= 18) return Math.round(inputSize * (1.0 - (crfValue / 18) * 0.3));
  if (crfValue <= 23) return Math.round(inputSize * (0.7 - ((crfValue - 18) / 5) * 0.2));
  if (crfValue <= 28) return Math.round(inputSize * (0.5 - ((crfValue - 23) / 5) * 0.2));
  return Math.round(inputSize * (0.3 - ((Math.min(crfValue, 51) - 28) / 23) * 0.25));
}
