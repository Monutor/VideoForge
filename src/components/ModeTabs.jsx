export default function ModeTabs({ mode, setMode }) {
  return (
    <div className="flex gap-1 bg-[#1a1a24] p-1 rounded-xl w-fit">
      <button
        onClick={() => setMode('convert')}
        className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
          mode === 'convert'
            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        Конвертация
      </button>
      <button
        onClick={() => setMode('compress')}
        className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
          mode === 'compress'
            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        Сжатие
      </button>
    </div>
  );
}
