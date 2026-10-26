import React from 'react';

const ProgressBar = ({ value = 0, max = 100, label, showValue = true, size = 'md', colorClass }) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const getColor = () => {
    if (colorClass) return colorClass;
    if (percentage >= 80) return 'from-emerald-500 to-teal-400';
    if (percentage >= 50) return 'from-indigo-500 to-blue-400';
    if (percentage >= 25) return 'from-amber-500 to-orange-400';
    return 'from-rose-500 to-red-400';
  };

  const getHeight = () => {
    if (size === 'sm') return 'h-1.5';
    if (size === 'lg') return 'h-3';
    return 'h-2';
  };

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between items-center text-xs mb-1.5 text-slate-400">
          {label && <span className="font-medium text-slate-300">{label}</span>}
          {showValue && <span className="font-mono text-slate-300">{percentage}%</span>}
        </div>
      )}
      <div className={`w-full bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50 ${getHeight()}`}>
        <div
          className={`h-full rounded-full bg-gradient-to-r ${getColor()} transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
