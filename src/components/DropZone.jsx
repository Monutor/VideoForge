import { useCallback, useState } from 'react';

const ACCEPTED_TYPES = [
  'video/mp4', 'video/webm', 'video/x-msvideo', 'video/quicktime',
  'video/x-matroska', 'video/x-flv', 'video/x-ms-wmv',
];
const MAX_SIZE = 500 * 1024 * 1024; // 500MB

export default function DropZone({ onFileSelect, maxSize = MAX_SIZE }) {
  const [dragging, setDragging] = useState(false);
  const [sizeWarning, setSizeWarning] = useState(false);

  const handleFile = useCallback((file) => {
    if (!file) return;
    setSizeWarning(file.size > maxSize);
    onFileSelect(file);
  }, [onFileSelect, maxSize]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleInput = useCallback((e) => {
    handleFile(e.target.files[0]);
  }, [handleFile]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => document.getElementById('file-input')?.click()}
      className={`
        relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
        transition-all duration-300
        ${dragging
          ? 'border-violet-400 bg-violet-500/10 scale-[1.02]'
          : 'border-gray-700 bg-[#1a1a24] hover:border-violet-500/50 hover:bg-[#1e1e2a]'
        }
      `}
    >
      <input
        id="file-input"
        type="file"
        accept="video/*"
        onChange={handleInput}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-4">
        <svg className="w-16 h-16 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>

        <div>
          <p className="text-lg font-medium text-gray-200">
            Перетащите видео сюда
          </p>
          <p className="text-sm text-gray-500 mt-1">
            или нажмите для выбора файла
          </p>
        </div>

        <p className="text-xs text-gray-600">
          MP4, WebM, AVI, MOV, MKV, FLV, WMV, TS • до 500 MB
        </p>

        {sizeWarning && (
          <div className="mt-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
            Файл превышает 500 MB — возможны проблемы с производительностью
          </div>
        )}
      </div>
    </div>
  );
}
