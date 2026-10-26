import React from 'react';

const Badge = ({ type = 'default', children, className = '' }) => {
  const getStyles = () => {
    switch (type.toUpperCase()) {
      // Difficulty
      case 'EASY':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'HARD':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'VERY_HARD':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';

      // Importance / Priority
      case 'LOW':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
      case 'HIGH':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse';

      // Status
      case 'NOT_STARTED':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'LEARNING':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'REVIEWING':
        return 'bg-violet-500/10 text-violet-400 border-violet-500/30';
      case 'MASTERED':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 font-semibold';

      // Recall Ratings
      case 'FORGOT':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'GOOD':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';

      default:
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide uppercase ${getStyles()} ${className}`}
    >
      {children || type}
    </span>
  );
};

export default Badge;
