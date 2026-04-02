import { VIDEO_FORMATS } from '../utils/helpers';

const VIDEO_EXTS = ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'gif'];

export default function FormatSelector({ value, onChange }) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-300">
        Выходной формат
      </label>

      <div>
        <p className="text-xs text-gray-500 mb-2">Видео</p>
        <div className="flex flex-wrap gap-2">
          {VIDEO_EXTS.map((fmt) => (
            <button
              key={fmt}
              onClick={() => onChange(fmt)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium uppercase transition-all duration-150
                ${value === fmt
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25'
                  : 'bg-[#1a1a24] text-gray-400 hover:bg-[#252535] hover:text-white'
                }
              `}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
