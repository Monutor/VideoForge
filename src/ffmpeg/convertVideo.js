function getSupportedMimeType(type) {
  const types = type === 'video'
    ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    : ['audio/webm;codecs=opus', 'audio/webm'];

  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return null;
}

export function convertVideo(file, outputFormat, videoBitrate, resolution, fps, abortRef, onProgress) {
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
      if (videoBitrate) {
        if (typeof videoBitrate === 'number') {
          options.videoBitsPerSecond = videoBitrate;
        } else {
          const match = videoBitrate.match(/^(\d+)(k|m)?$/i);
          if (match) {
            let bits = parseInt(match[1]);
            if (match[2]?.toLowerCase() === 'k') bits *= 1000;
            else if (match[2]?.toLowerCase() === 'm') bits *= 1000000;
            options.videoBitsPerSecond = bits;
          }
        }
      }

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
