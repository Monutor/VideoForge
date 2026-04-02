import { RESOLUTION_OPTIONS, FPS_OPTIONS, VIDEO_BITRATE_OPTIONS } from '../utils/helpers';

export default function QualitySettings({ settings, onChange }) {
  const update = (key, value) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-5">
      <label className="block text-sm font-medium text-gray-300">
        Настройки качества
      </label>

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

      <div>
        <label className="block text-xs text-gray-500 mb-1.5">FPS</label>
        <select
          value={settings.fps}
          onChange={(e) => update('fps', Number(e.target.value))}
          className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        >
          {FPS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Битрейт видео</label>
        <select
          value={settings.videoBitrate}
          onChange={(e) => update('videoBitrate', e.target.value)}
          className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        >
          <option value="">Авто</option>
          {VIDEO_BITRATE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
