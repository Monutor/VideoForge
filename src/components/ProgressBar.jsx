export default function ProgressBar({ progress, timeRemaining, label }) {
  function formatTime(seconds) {
    if (seconds == null) return '...';
    if (seconds < 60) return `${seconds} сек`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} мин ${s} сек`;
  }

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">{label}</span>
          <div className="flex items-center gap-3">
            {timeRemaining !== null && timeRemaining > 0 && (
              <span className="text-xs text-gray-500">~{formatTime(timeRemaining)}</span>
            )}
            <span className="text-violet-400 font-medium">{progress}%</span>
          </div>
        </div>
      )}
      <div className="h-3 bg-[#1a1a24] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-600 to-purple-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
