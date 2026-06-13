import { useState, useRef, useCallback } from 'react';
import { getFFmpeg, isFFmpegLoaded } from '../ffmpeg/loadFFmpeg';
import { tsToMp4 } from '../ffmpeg/tsToMp4';
import { convertVideo } from '../ffmpeg/convertVideo';
import { extractAudio } from '../ffmpeg/extractAudio';
import { convertToGif } from '../ffmpeg/convertToGif';
import { formatToType, isValidInputFormat } from '../ffmpeg/helpers';

export function useFFmpeg() {
  const [loaded, setLoaded] = useState(isFFmpegLoaded());
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const abortRef = useRef(false);
  const startTimeRef = useRef(null);

  const load = useCallback(async () => {
    if (isFFmpegLoaded()) return;
    setLoading(true);
    try {
      await getFFmpeg();
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProgress = useCallback((pct, baseProgress = 0) => {
    const totalProgress = Math.round(baseProgress + (pct / 100) * (100 - baseProgress));
    setProgress(Math.min(totalProgress, 99));
    if (pct > 0 && startTimeRef.current) {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const rate = pct / elapsed;
      const remaining = rate > 0 ? Math.round((100 - totalProgress) / rate) : null;
      setTimeRemaining(remaining);
    }
  }, [setProgress, setTimeRemaining]);

  const convert = useCallback(async ({
    inputFile,
    outputFormat,
    videoBitrate,
    resolution,
    fps,
    audioBitrate,
  }) => {
    setProcessing(true);
    setProgress(0);
    setTimeRemaining(null);
    setError(null);
    abortRef.current = false;
    startTimeRef.current = Date.now();

    const type = formatToType(outputFormat);
    const ext = inputFile.name.split('.').pop().toLowerCase();

    if (!isValidInputFormat(ext)) {
      setError(`Формат "${ext}" не поддерживается. Поддерживаемые: mp4, webm, avi, mov, mkv, flv, wmv, ts, m4v, 3gp`);
      setProcessing(false);
      return null;
    }

    let workingFile = inputFile;
    const isTS = ext === 'ts';

    if (isTS) {
      try {
        workingFile = await tsToMp4(inputFile, setProgress);
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
  }, [updateProgress]);

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

    if (!isValidInputFormat(ext)) {
      setError(`Формат "${ext}" не поддерживается. Поддерживаемые: mp4, webm, avi, mov, mkv, flv, wmv, ts, m4v, 3gp`);
      setProcessing(false);
      return null;
    }

    let workingFile = inputFile;
    const isTS = ext === 'ts';

    if (isTS) {
      try {
        workingFile = await tsToMp4(inputFile, setProgress);
        setProgress(0);
        startTimeRef.current = Date.now();
      } catch (err) {
        setError('Не удалось обработать TS файл: ' + (err.message || 'неизвестная ошибка'));
        setProcessing(false);
        return null;
      }
    }

    const bitrateMap = { 0: 8000000, 18: 4000000, 23: 2000000, 28: 1000000 };
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
  }, [updateProgress]);

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
