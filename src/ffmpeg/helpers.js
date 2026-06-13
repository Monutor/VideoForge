export const SUPPORTED_INPUT_EXTS = ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'ts', 'm4v', '3gp'];

export function formatToType(format) {
  const videoFormats = ['mp4', 'webm', 'gif'];
  const audioFormats = ['mp3', 'aac', 'wav'];
  if (videoFormats.includes(format)) return 'video';
  if (audioFormats.includes(format)) return 'audio';
  return 'video';
}

export function isValidInputFormat(ext) {
  return SUPPORTED_INPUT_EXTS.includes(ext);
}
