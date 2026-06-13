export function convertToGif(file, fps, resolution, abortRef, onProgress) {
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

  for (let f = 0; f < frames.length; f++) {
    parts.push(String.fromCharCode(0x21, 0xf9, 4, 0));
    parts.push(String.fromCharCode(delay & 0xff, (delay >> 8) & 0xff));
    parts.push(String.fromCharCode(0));

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
