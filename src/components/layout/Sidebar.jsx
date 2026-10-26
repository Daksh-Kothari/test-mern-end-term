import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookMarked, 
  RotateCcw, 
  History, 
  Calendar, 
  Target, 
  FileText
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Subjects & Topics', path: '/subjects', icon: BookMarked },
  { name: 'Revision Queue', path: '/revisions', icon: RotateCcw, highlight: true },
  { name: 'Study History', path: '/sessions', icon: History },
  { name: 'Exam Planner', path: '/exams', icon: Calendar },
  { name: 'Study Goals', path: '/goals', icon: Target },
  { name: 'Academic Notes', path: '/notes', icon: FileText },
];

const Sidebar = () => {
  return (
    <aside className="w-64 bg-slate-950/70 border-r border-slate-800/80 p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-6">
        <div className="px-3 pt-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Study Mastery Hub
          </p>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm shadow-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.name}</span>
                {item.highlight && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-3 bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-slate-900/50 rounded-2xl border border-indigo-500/20 text-xs text-slate-400">
        <p className="font-semibold text-slate-300 mb-1">SM-2 Spaced Repetition</p>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Optimizes intervals based on your recall quality to cement knowledge into long-term memory.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
