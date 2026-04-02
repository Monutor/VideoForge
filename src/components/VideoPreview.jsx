import { useEffect, useRef, useState, useMemo } from 'react';
import { formatFileSize } from '../utils/helpers';

export default function VideoPreview({ file, blob, label, onMetadata }) {
  const videoRef = useRef(null);
  const fileUrl = useRef(null);
  const blobUrl = useRef(null);
  const [metadata, setMetadata] = useState(null);

  useEffect(() => {
    if (file && !fileUrl.current) {
      fileUrl.current = URL.createObjectURL(file);
    }
    return () => {
      if (fileUrl.current) {
        URL.revokeObjectURL(fileUrl.current);
        fileUrl.current = null;
      }
    };
  }, [file]);

  useEffect(() => {
    if (blob && !blobUrl.current) {
      blobUrl.current = URL.createObjectURL(blob);
    } else if (!blob && blobUrl.current) {
      URL.revokeObjectURL(blobUrl.current);
      blobUrl.current = null;
    }
    return () => {
      if (blobUrl.current) {
        URL.revokeObjectURL(blobUrl.current);
        blobUrl.current = null;
      }
    };
  }, [blob]);

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

  const src = blob ? blobUrl.current : fileUrl.current;
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

      <video
        ref={videoRef}
        src={src}
        controls
        onLoadedMetadata={handleLoadedMetadata}
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
