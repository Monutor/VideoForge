import { FFmpeg } from '@ffmpeg/ffmpeg';

let ffmpegInstance = null;
let ffmpegLoaded = false;

async function toBlobURL(url, mimeType) {
  const resp = await fetch(url);
  const body = await resp.blob();
  return URL.createObjectURL(new Blob([body], { type: mimeType }));
}

export async function getFFmpeg() {
  if (ffmpegLoaded && ffmpegInstance) {
    return ffmpegInstance;
  }

  console.log('[FFmpeg] Загрузка ffmpeg.wasm...');
  ffmpegInstance = new FFmpeg();

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

  ffmpegInstance.on('log', ({ message }) => {
    console.log('[FFmpeg]', message);
  });

  await ffmpegInstance.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  ffmpegLoaded = true;
  console.log('[FFmpeg] Загружен');
  return ffmpegInstance;
}

export function isFFmpegLoaded() {
  return ffmpegLoaded;
}
