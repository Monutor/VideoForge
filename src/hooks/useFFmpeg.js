import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import mpegts from 'mpegts.js';

let ffmpegInstance = null;
let ffmpegLoaded = false;

async function loadFFmpeg() {
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

async function toBlobURL(url, mimeType) {
  const resp = await fetch(url);
  const body = await resp.blob();
  return URL.createObjectURL(new Blob([body], { type: mimeType }));
}

function getSupportedMimeType(type) {
  const types = type === 'video'
    ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    : ['audio/webm;codecs=opus', 'audio/webm'];

  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return null;
}

async function tsToMp4(file, onProgress) {
  console.log('[tsToMp4] Начало конвертации файла:', file.name, file.size, 'bytes');
  
  try {
    const ffmpeg = await loadFFmpeg();
    
    await ffmpeg.writeFile('input.ts', await fetchFile(file));
    
    ffmpeg.on('progress', (progress) => {
      const pct = Math.round(progress.progress * 100);
      console.log('[tsToMp4] Прогресс:', pct + '%');
      onProgress(pct);
    });
    
    console.log('[tsToMp4] Перепаковка TS → MP4 без аудио...');
    
    // Перепаковка: копируем видео, удаляем аудио
    await ffmpeg.exec([
      '-i', 'input.ts',
      '-c:v', 'copy',
      '-an',  // Удалить аудио
      '-movflags', '+faststart',
      'output.mp4'
    ]);
    
    const outputData = await ffmpeg.readFile('output.mp4');
    
    await ffmpeg.deleteFile('input.ts');
    await ffmpeg.deleteFile('output.mp4');
    
    console.log('[tsToMp4] Конвертация завершена, размер:', outputData.byteLength);
    
    const outputBlob = new Blob([outputData], { type: 'video/mp4' });
    const baseName = file.name.replace(/\.ts$/i, '');
    const newFile = new File([outputBlob], baseName + '_converted.mp4', { type: 'video/mp4' });
    
    return newFile;
  } catch (error) {
    console.error('[tsToMp4] Ошибка конвертации:', error);
    throw new Error('Не удалось конвертировать TS файл: ' + (error.message || 'неизвестная ошибка'));
  }
}

function formatToType(format) {
  const videoFormats = ['mp4', 'webm', 'gif'];
  const audioFormats = ['mp3', 'aac', 'wav'];
  if (videoFormats.includes(format)) return 'video';
  if (audioFormats.includes(format)) return 'audio';
  return 'video';
}

const SUPPORTED_INPUT_EXTS = ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'ts', 'm4v', '3gp'];

function isValidInputFormat(ext) {
  return SUPPORTED_INPUT_EXTS.includes(ext);
}

export function useFFmpeg() {
  const [loaded] = useState(true);
  const [loading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const abortRef = useRef(false);
  const startTimeRef = useRef(null);

  const load = useCallback(async () => {}, []);

  const updateProgress = useCallback((pct, baseProgress = 0) => {
    // pct: 0-100 (прогресс текущей операции)
    // baseProgress: 0-100 (уже выполненный прогресс)
    const totalProgress = Math.round(baseProgress + (pct / 100) * (100 - baseProgress));
    setProgress(Math.min(totalProgress, 99));
    if (pct > 0 && startTimeRef.current) {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const rate = pct / elapsed;
      const remaining = rate > 0 ? Math.round((100 - totalProgress) / rate) : null;
      setTimeRemaining(remaining);
    }
  }, []);

  const convert = useCallback(async ({
    inputFile,
    outputFormat,
    videoBitrate,
    resolution,
    fps,
  }) => {
    setProcessing(true);
    setProgress(0);
    setTimeRemaining(null);
    setError(null);
    abortRef.current = false;
    startTimeRef.current = Date.now();

    const type = formatToType(outputFormat);
    const ext = inputFile.name.split('.').pop().toLowerCase();

    // Проверяем поддерживаемый ли входной формат
    if (!isValidInputFormat(ext)) {
      setError(`Формат "${ext}" не поддерживается. Поддерживаемые: ${SUPPORTED_INPUT_EXTS.join(', ')}`);
      setProcessing(false);
      return null;
    }

    let workingFile = inputFile;
    const isTS = ext === 'ts';

    if (isTS) {
      try {
        // tsToMp4 теперь сам управляет прогрессом
        workingFile = await tsToMp4(inputFile, setProgress);
        // После TS конвертации прогресс будет 100%, сбрасываем для основной операции
        setProgress(0);
        startTimeRef.current = Date.now();
      } catch (err) {
        setError('Не удалось обработать TS файл: ' + (err.message || 'неизвестная ошибка'));
        setProcessing(false);
        return null;
      }
    }

    try {
      if (type === 'audio') {
        const blob = await extractAudio(workingFile, audioBitrate, (p) => updateProgress(p, 0));
        setProgress(100);
        setTimeRemaining(0);
        return blob;
      }

      if (outputFormat === 'gif') {
        const blob = await convertToGif(workingFile, fps, resolution, abortRef, (p) => updateProgress(p, 0));
        setProgress(100);
        setTimeRemaining(0);
        return blob;
      }

      const blob = await convertVideo(workingFile, outputFormat, videoBitrate, resolution, fps, abortRef, (p) => updateProgress(p, 0));
      setProgress(100);
      setTimeRemaining(0);
      return blob;
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Конвертация отменена');
      } else {
        console.error('Conversion error:', err);
        setError('Ошибка конвертации: ' + (err.message || 'неизвестная ошибка'));
      }
      return null;
    } finally {
      setProcessing(false);
    }
  }, []);

  const compress = useCallback(async ({
    inputFile,
    crf,
    resolution,
  }) => {
    setProcessing(true);
    setProgress(0);
    setTimeRemaining(null);
    setError(null);
    abortRef.current = false;
    startTimeRef.current = Date.now();

    const ext = inputFile.name.split('.').pop().toLowerCase();

    // Проверяем поддерживаемый ли входной формат
    if (!isValidInputFormat(ext)) {
      setError(`Формат "${ext}" не поддерживается. Поддерживаемые: ${SUPPORTED_INPUT_EXTS.join(', ')}`);
      setProcessing(false);
      return null;
    }

    let workingFile = inputFile;
    const isTS = ext === 'ts';

    if (isTS) {
      try {
        // tsToMp4 теперь сам управляет прогрессом
        workingFile = await tsToMp4(inputFile, setProgress);
        // После TS конвертации прогресс будет 100%, сбрасываем для основной операции
        setProgress(0);
        startTimeRef.current = Date.now();
      } catch (err) {
        setError('Не удалось обработать TS файл: ' + (err.message || 'неизвестная ошибка'));
        setProcessing(false);
        return null;
      }
    }

    const bitrateMap = { 0: 1000000, 18: 2000000, 23: 4000000, 28: 8000000 };
    const closestCrf = Object.keys(bitrateMap).reduce((prev, curr) =>
      Math.abs(Number(curr) - crf) < Math.abs(Number(prev) - crf) ? curr : prev
    );
    const videoBitrate = bitrateMap[closestCrf];

    try {
      const blob = await convertVideo(workingFile, 'mp4', videoBitrate, resolution, 0, abortRef, (p) => updateProgress(p, 0));
      setProgress(100);
      setTimeRemaining(0);
      return blob;
    } catch (err) {
      console.error('Compression error:', err);
      setError('Ошибка сжатия: ' + (err.message || 'неизвестная ошибка'));
      return null;
    } finally {
      setProcessing(false);
    }
  }, []);

  return {
    load,
    loaded,
    loading,
    progress,
    timeRemaining,
    error,
    processing,
    convert,
    compress,
    setError,
  };
}

function convertVideo(file, outputFormat, videoBitrate, resolution, fps, abortRef, onProgress) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;';

    const url = URL.createObjectURL(file);
    document.body.appendChild(video);

    const cleanup = () => {
      URL.revokeObjectURL(url);
      if (video.parentNode) video.parentNode.removeChild(video);
    };

    video.onloadedmetadata = async () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      let targetWidth = video.videoWidth;
      let targetHeight = video.videoHeight;

      if (resolution > 0 && targetHeight > resolution) {
        targetHeight = resolution;
        targetWidth = Math.round((resolution / video.videoHeight) * video.videoWidth);
        targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth + 1;
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaElementSource(video);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);

      const targetFps = fps > 0 ? fps : 30;
      const canvasStream = canvas.captureStream(targetFps);
      const audioTrack = dest.stream.getAudioTracks()[0];
      if (audioTrack) canvasStream.addTrack(audioTrack);

      const mimeType = getSupportedMimeType('video');
      if (!mimeType) {
        cleanup();
        audioCtx.close();
        reject(new Error('Ни один видео-формат не поддерживается в этом браузере'));
        return;
      }

      const options = { mimeType };
      if (videoBitrate) options.videoBitsPerSecond = parseInt(videoBitrate);

      const recorder = new MediaRecorder(canvasStream, options);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        cleanup();
        audioCtx.close();
        const blob = new Blob(chunks, { type: mimeType });
        resolve(blob);
      };

      recorder.onerror = (e) => {
        cleanup();
        audioCtx.close();
        reject(e.error);
      };

      const frameInterval = 1000 / targetFps;
      let intervalId = null;
      let lastProgress = 0;
      const duration = video.duration;
      const hasDuration = duration > 0 && isFinite(duration);

      try {
        await video.play();

        recorder.start(100);

        intervalId = setInterval(() => {
          if (abortRef.current) {
            clearInterval(intervalId);
            recorder.stop();
            reject(new DOMException('Aborted', 'AbortError'));
            return;
          }

          if (!video.paused && !video.ended) {
            ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
            let pct;
            if (hasDuration) {
              pct = Math.min(Math.round((video.currentTime / duration) * 100), 99);
            } else {
              pct = Math.min(lastProgress + 1, 99);
            }
            if (pct !== lastProgress) {
              lastProgress = pct;
              onProgress(pct);
            }
          }
        }, frameInterval);

        video.onended = () => {
          clearInterval(intervalId);
          setTimeout(() => recorder.stop(), 200);
        };
      } catch (err) {
        clearInterval(intervalId);
        cleanup();
        audioCtx.close();
        reject(err);
      }
    };

    video.onerror = (e) => {
      console.error('[convertVideo] video error:', e);
      cleanup();
      reject(new Error('Не удалось загрузить видео'));
    };

    video.src = url;
  });
}

function extractAudio(file, audioBitrate, onProgress) {
  return new Promise((resolve, reject) => {
    const audioCtx = new AudioContext();
    const reader = new FileReader();

    // Парсим битрейт (например, '128k' -> 128)
    let targetSampleRate = 44100;
    if (audioBitrate) {
      const bitrateNum = parseInt(audioBitrate);
      // Понижаем sample rate для меньших битрейтов
      if (bitrateNum <= 64) targetSampleRate = 22050;
      else if (bitrateNum <= 128) targetSampleRate = 32000;
      else if (bitrateNum <= 192) targetSampleRate = 44100;
      else targetSampleRate = 48000;
    }

    reader.onload = async (e) => {
      try {
        const audioBuffer = await audioCtx.decodeAudioData(e.target.result);
        
        // Создаём новый буфер с нужным sample rate
        const offlineCtx = new OfflineAudioContext(
          audioBuffer.numberOfChannels,
          audioBuffer.duration * targetSampleRate,
          targetSampleRate
        );
        
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineCtx.destination);
        source.start();
        
        const resampledBuffer = await offlineCtx.startRendering();
        const wavBlob = audioBufferToWav(resampledBuffer);

        onProgress(100);
        audioCtx.close();
        resolve(wavBlob);
      } catch (err) {
        audioCtx.close();
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsArrayBuffer(file);
  });
}

function convertToGif(file, fps, resolution, abortRef, onProgress) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const url = URL.createObjectURL(file);
    
    const cleanup = () => {
      URL.revokeObjectURL(url);
      if (video.parentNode) video.parentNode.removeChild(video);
    };

    video.onloadedmetadata = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      let targetWidth = video.videoWidth;
      let targetHeight = video.videoHeight;

      if (resolution > 0 && targetHeight > resolution) {
        targetHeight = Math.min(resolution, 480);
        targetWidth = Math.round((targetHeight / video.videoHeight) * video.videoWidth);
      }

      targetWidth = Math.min(targetWidth, 640);
      targetHeight = Math.min(targetHeight, 480);
      targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth + 1;
      targetHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight + 1;

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const targetFps = fps > 0 ? Math.min(fps, 15) : 10;
      const frameInterval = 1000 / targetFps;
      const frames = [];
      let lastFrameTime = 0;
      const hasDuration = video.duration > 0 && isFinite(video.duration);

      function captureFrame(timestamp) {
        if (abortRef.current) {
          cleanup();
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }

        if (timestamp - lastFrameTime >= frameInterval) {
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          frames.push(canvas.toDataURL('image/png'));
          if (hasDuration) {
            onProgress(Math.min(Math.round((video.currentTime / video.duration) * 90), 89));
          }
          lastFrameTime = timestamp;
        }

        if (!video.paused && !video.ended) {
          requestAnimationFrame(captureFrame);
        }
      }

      video.onended = async () => {
        onProgress(95);

        try {
          const gifBlob = await createGifFromFrames(frames, targetWidth, targetHeight);
          cleanup();
          onProgress(100);
          resolve(gifBlob);
        } catch (err) {
          cleanup();
          reject(err);
        }
      };

      video.onerror = () => {
        cleanup();
        reject(new Error('Не удалось загрузить видео'));
      };

      video.src = url;
      video.play().catch((err) => {
        cleanup();
        reject(err);
      });
      requestAnimationFrame(captureFrame);
    };
    
    video.onerror = () => {
      cleanup();
      reject(new Error('Не удалось загрузить видео'));
    };
  });
}

async function createGifFromFrames(frames, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const parts = [];
  const delay = 100;

  parts.push('GIF89a');
  parts.push(String.fromCharCode(width & 0xff, (width >> 8) & 0xff));
  parts.push(String.fromCharCode(height & 0xff, (height >> 8) & 0xff));
  parts.push(String.fromCharCode(0xf7, 0, 0));

  const globalPalette = [];
  for (let i = 0; i < 256; i++) {
    globalPalette.push(i * 37 % 256, i * 53 % 256, i * 71 % 256);
  }
  for (let i = 0; i < 256; i++) {
    parts.push(String.fromCharCode(globalPalette[i * 3], globalPalette[i * 3 + 1], globalPalette[i * 3 + 2]));
  }

  // Асинхронно загружаем каждый кадр перед кодированием
  for (let f = 0; f < frames.length; f++) {
    parts.push(String.fromCharCode(0x21, 0xf9, 4, 0));
    parts.push(String.fromCharCode(delay & 0xff, (delay >> 8) & 0xff));
    parts.push(String.fromCharCode(0));

    // Ждём загрузки изображения
    await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);

        const indices = new Uint8Array(width * height);
        for (let i = 0; i < indices.length; i++) {
          indices[i] = Math.floor((imageData.data[i * 4] + imageData.data[i * 4 + 1] + imageData.data[i * 4 + 2]) / 3 / 255 * 255);
        }

        const lzwData = lzwEncode(indices, 8);
        parts.push(String.fromCharCode(0x2c, 0, 0, 0, 0));
        parts.push(String.fromCharCode(width & 0xff, (width >> 8) & 0xff));
        parts.push(String.fromCharCode(height & 0xff, (height >> 8) & 0xff));
        parts.push(String.fromCharCode(0));
        parts.push(String.fromCharCode(8));

        let offset = 0;
        while (offset < lzwData.length) {
          const blockSize = Math.min(255, lzwData.length - offset);
          parts.push(String.fromCharCode(blockSize));
          for (let i = 0; i < blockSize; i++) {
            parts.push(String.fromCharCode(lzwData[offset + i]));
          }
          offset += blockSize;
        }
        parts.push(String.fromCharCode(0));
        resolve();
      };
      img.onerror = reject;
      img.src = frames[f];
    });
  }

  parts.push(String.fromCharCode(0x3b));

  const binary = parts.join('');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i) & 0xff;
  }

  return new Blob([bytes], { type: 'image/gif' });
}

function lzwEncode(data, minCodeSize) {
  const result = [];
  let codeSize = minCodeSize + 1;
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;

  let buffer = 0;
  let bitsInBuffer = 0;

  function writeBits(value, bitCount) {
    buffer |= (value << bitsInBuffer);
    bitsInBuffer += bitCount;
    while (bitsInBuffer >= 8) {
      result.push(buffer & 0xff);
      buffer >>= 8;
      bitsInBuffer -= 8;
    }
  }

  function getDictionaryKey(prefix, char) {
    return (prefix << 8) | char;
  }

  writeBits(clearCode, codeSize);

  let dict = {};
  for (let i = 0; i < 256; i++) dict[i] = i;
  let dictSize = 256;

  if (data.length === 0) {
    writeBits(eoiCode, codeSize);
    if (bitsInBuffer > 0) result.push(buffer & 0xff);
    return result;
  }

  let prefix = data[0];

  for (let i = 1; i < data.length; i++) {
    const char = data[i];
    const key = getDictionaryKey(prefix, char);

    if (key in dict) {
      prefix = dict[key];
    } else {
      writeBits(prefix, codeSize);

      if (dictSize < 4096) {
        if (dictSize >= (1 << codeSize) && codeSize < 12) {
          codeSize++;
        }
        dict[key] = dictSize++;
      } else {
        writeBits(clearCode, codeSize);
        dict = {};
        for (let j = 0; j < 256; j++) dict[j] = j;
        dictSize = 256;
        codeSize = minCodeSize + 1;
      }

      prefix = char;
    }
  }

  writeBits(prefix, codeSize);
  writeBits(eoiCode, codeSize);

  if (bitsInBuffer > 0) result.push(buffer & 0xff);

  return result;
}

function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;

  let interleaved;
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    interleaved = new Float32Array(left.length + right.length);
    for (let i = 0; i < left.length; i++) {
      interleaved[i * 2] = left[i];
      interleaved[i * 2 + 1] = right[i];
    }
  } else {
    interleaved = buffer.getChannelData(0);
  }

  const dataLength = interleaved.length * (bitDepth / 8);
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, totalLength - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < interleaved.length; i++) {
    const sample = Math.max(-1, Math.min(1, interleaved[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}
