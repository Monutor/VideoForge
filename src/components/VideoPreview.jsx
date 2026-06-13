import { useEffect, useRef, useState } from 'react';
import { formatFileSize } from '../utils/helpers';

export default function VideoPreview({ file, blob, label, onMetadata }) {
  const videoRef = useRef(null);
  const [metadata, setMetadata] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const video = videoRef.current;
    const source = blob || file;
    if (!source || !video) return;

    const url = URL.createObjectURL(source);
    video.src = url;

    return () => {
      URL.revokeObjectURL(url);
      video.src = '';
    };
  }, [file, blob]);

  const handleVideoError = () => {
    const video = videoRef.current;
    setLoadError(video?.error?.message || 'Ошибка загрузки видео');
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    const data = {
      width: video.videoWidth,
      height: video.videoHeight,
      duration: video.duration,
    };
    setMetadata(data);
    if (onMetadata) onMetadata(data);
  };

  if (!file && !blob) return null;

  const size = blob ? blob.size : file?.size;
  const name = blob ? 'Результат' : file?.name;

  function formatDuration(sec) {
    if (!sec || !isFinite(sec)) return '—';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  return (
    <div className="bg-[#1a1a24] rounded-2xl overflow-hidden">
      {label && (
        <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-300">{label}</span>
          <span className="text-xs text-gray-500">{formatFileSize(size)}</span>
        </div>
      )}

      {loadError && (
        <div className="px-5 py-8 text-center">
          <p className="text-red-400 text-sm">{loadError}</p>
        </div>
      )}

      <video
        ref={videoRef}
        controls
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleVideoError}
        className="w-full max-h-80 object-contain bg-black"
      />

      <div className="px-5 py-3 border-t border-gray-800 space-y-2">
        <p className="text-sm text-gray-400 truncate">{name}</p>
        {metadata && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>{metadata.width}×{metadata.height}</span>
            <span>{formatDuration(metadata.duration)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
