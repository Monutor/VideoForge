import { useState, useRef } from 'react';
import ModeTabs from './components/ModeTabs';
import DropZone from './components/DropZone';
import VideoPreview from './components/VideoPreview';
import FormatSelector from './components/FormatSelector';
import QualitySettings from './components/QualitySettings';
import CompressionPresets from './components/CompressionPresets';
import ProgressBar from './components/ProgressBar';
import { useFFmpeg } from './hooks/useFFmpeg';
import { formatFileSize, estimateOutputSize, getExtension } from './utils/helpers';

function formatDuration(sec) {
  if (!sec || !isFinite(sec)) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function App() {
  const [mode, setMode] = useState('convert');
  const [file, setFile] = useState(null);
  const [outputBlob, setOutputBlob] = useState(null);
  const [outputFormat, setOutputFormat] = useState('mp4');
  const [outputName, setOutputName] = useState('');
  const [videoMetadata, setVideoMetadata] = useState(null);
  const [qualitySettings, setQualitySettings] = useState({
    resolution: -1,
    fps: 0,
    videoBitrate: '',
  });
  const [compressionSettings, setCompressionSettings] = useState({
    crf: 23,
    resolution: -1,
    preset: 'medium',
  });

  const {
    load, loaded, loading, progress, timeRemaining, error, processing,
    convert, compress, setError,
  } = useFFmpeg();

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    setOutputBlob(null);
    setError(null);
    setVideoMetadata(null);
    const baseName = selectedFile.name.replace(/\.[^.]+$/, '');
    setOutputName(baseName + '_converted');
  };

  const handleMetadata = (metadata) => {
    setVideoMetadata(metadata);
  };

  const handleProcess = async () => {
    if (!file) return;
    if (!loaded) {
      await load();
    }

    if (mode === 'convert') {
      const result = await convert({
        inputFile: file,
        outputFormat,
        videoBitrate: qualitySettings.videoBitrate,
        resolution: qualitySettings.resolution,
        fps: qualitySettings.fps,
      });
      if (result) setOutputBlob(result);
    } else {
      const result = await compress({
        inputFile: file,
        crf: compressionSettings.crf,
        resolution: compressionSettings.resolution,
      });
      if (result) setOutputBlob(result);
    }
  };

  const handleDownload = () => {
    if (!outputBlob) return;
    const ext = mode === 'compress' ? 'mp4' : outputFormat;
    const url = URL.createObjectURL(outputBlob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = outputName.trim() || 'videoforge_output';
    a.download = `${fileName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const estimatedSize = mode === 'compress'
    ? estimateOutputSize(file?.size || 0, compressionSettings.preset)
    : null;

  return (
    <div className="min-h-screen bg-[#0f0f14]">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <svg className="w-10 h-10 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.63 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.841m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            </svg>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              VideoForge
            </h1>
          </div>
          <p className="text-gray-500">Конвертация и сжатие видео прямо в браузере</p>
        </header>

        {/* Mode Tabs */}
        <div className="flex justify-center mb-8">
          <ModeTabs mode={mode} setMode={setMode} />
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Drop Zone */}
          {!file && <DropZone onFileSelect={handleFileSelect} />}

          {file && (
            <>
              {/* File Info + Metadata */}
              <div className="bg-[#1a1a24] rounded-xl px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <svg className="w-8 h-8 text-violet-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)} • {getExtension(file.name).toUpperCase()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setFile(null); setOutputBlob(null); setError(null); setVideoMetadata(null); }}
                    className="text-gray-500 hover:text-red-400 transition-colors p-2 shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {videoMetadata && (
                  <div className="mt-3 pt-3 border-t border-gray-800 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-400">
                    <span>Разрешение: <span className="text-gray-300">{videoMetadata.width}×{videoMetadata.height}</span></span>
                    <span>Длительность: <span className="text-gray-300">{formatDuration(videoMetadata.duration)}</span></span>
                    <span>Размер: <span className="text-gray-300">{formatFileSize(file.size)}</span></span>
                  </div>
                )}
              </div>

              {/* Settings Panel */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-[#1a1a24] rounded-2xl p-6 space-y-6">
                  {mode === 'convert' ? (
                    <FormatSelector value={outputFormat} onChange={setOutputFormat} />
                  ) : (
                    <CompressionPresets
                      settings={compressionSettings}
                      onChange={setCompressionSettings}
                    />
                  )}

                  {mode === 'convert' && (
                    <QualitySettings
                      settings={qualitySettings}
                      onChange={setQualitySettings}
                    />
                  )}

                  {/* Output filename */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Имя выходного файла
                    </label>
                    <input
                      type="text"
                      value={outputName}
                      onChange={(e) => setOutputName(e.target.value)}
                      placeholder="Введите имя файла..."
                      className="w-full bg-[#12121a] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <VideoPreview file={file} label="Исходный файл" onMetadata={handleMetadata} />

                  {outputBlob && (
                    <VideoPreview blob={outputBlob} label="Результат" />
                  )}

                  {mode === 'compress' && estimatedSize && !outputBlob && (
                    <div className="bg-[#1a1a24] rounded-2xl p-5">
                      <p className="text-sm text-gray-400 mb-1">Ожидаемый размер</p>
                      <div className="flex items-baseline gap-3">
                        <span className="text-2xl font-bold text-violet-400">
                          {formatFileSize(estimatedSize)}
                        </span>
                        <span className="text-sm text-gray-500 line-through">
                          {formatFileSize(file.size)}
                        </span>
                        <span className="text-xs text-emerald-400 font-medium">
                          -{Math.round((1 - estimatedSize / file.size) * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Progress */}
              {processing && (
                <ProgressBar progress={progress} timeRemaining={timeRemaining} label="Обработка..." />
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleProcess}
                  disabled={processing || loading}
                  className={`
                    flex-1 py-3.5 rounded-xl font-medium text-sm transition-all duration-200
                    ${processing || loading
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/25 hover:shadow-violet-500/30'
                    }
                  `}
                >
                  {loading ? 'Загрузка...' : processing ? 'Обработка...' : mode === 'convert' ? 'Конвертировать' : 'Сжать'}
                </button>

                {outputBlob && (
                  <button
                    onClick={handleDownload}
                    className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm transition-all duration-200 shadow-lg shadow-emerald-600/25"
                  >
                    Скачать
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-20 text-center text-xs text-gray-700">
          <p>Видео обрабатывается локально в вашем браузере. Файлы не загружаются на сервер.</p>
          <p className="mt-1">Рекомендуемый размер файла: до 500 MB</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
