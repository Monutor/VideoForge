import { COMPRESSION_PRESETS, RESOLUTION_OPTIONS } from '../utils/helpers';

export default function CompressionPresets({ settings, onChange }) {
  const update = (key, value) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-5">
      <label className="block text-sm font-medium text-gray-300">
        Пресет сжатия
      </label>

      <div className="grid grid-cols-3 gap-2">
        {Object.entries(COMPRESSION_PRESETS).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => {
              onChange({ ...settings, crf: preset.crf, resolution: preset.scale, preset: key });
            }}
            className={`
              px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 text-center
              ${settings.preset === key
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25'
                : 'bg-[#1a1a24] text-gray-400 hover:bg-[#252535] hover:text-white'
              }
            `}
          >
            <div>{preset.label}</div>
            <div className="text-xs opacity-60 mt-1">CRF {preset.crf}</div>
          </button>
        ))}
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1.5">
          Ручная настройка CRF: {settings.crf}
        </label>
        <input
          type="range"
          min="0"
          max="51"
          value={settings.crf}
          onChange={(e) => update('crf', Number(e.target.value))}
          className="w-full accent-violet-600"
        />
        <div className="flex justify-between text-xs text-gray-600">
          <span>Лучшее качество (0)</span>
          <span>Макс. сжатие (51)</span>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Разрешение</label>
        <select
          value={settings.resolution}
          onChange={(e) => update('resolution', Number(e.target.value))}
          className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        >
          {RESOLUTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
