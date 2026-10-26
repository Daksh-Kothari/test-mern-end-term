import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { 
  Bell, 
  Flame, 
  Timer, 
  LogOut, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  BookOpen, 
  Calendar,
  X
} from 'lucide-react';

const Navbar = ({ onOpenTimer }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'REVISION_OVERDUE':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'EXAM_APPROACHING':
        return <Calendar className="w-4 h-4 text-amber-400" />;
      case 'REVISION_DUE':
        return <Clock className="w-4 h-4 text-indigo-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
              StudyFlow
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Academic Engine
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Study Timer CTA Button */}
        <button
          onClick={onOpenTimer}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-md shadow-indigo-600/20 active:scale-95"
        >
          <Timer className="w-4 h-4" />
          <span className="hidden sm:inline">Start Study Session</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-panel rounded-2xl shadow-2xl border border-slate-700/60 p-4 z-50">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold text-sm text-white">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-sm">
                    No academic alerts at this time.
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n._id || n.id}
                      onClick={() => !n.isRead && markAsRead(n._id || n.id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        n.isRead
                          ? 'bg-slate-900/40 border-slate-800 text-slate-400'
                          : 'bg-indigo-950/30 border-indigo-500/30 text-slate-200 hover:border-indigo-500/60'
                      }`}
                    >
                      <div className="flex items-start space-x-2.5">
                        <div className="mt-0.5">{getNotificationIcon(n.type)}</div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-200 mb-0.5">{n.title}</p>
                          <p className="text-slate-400 leading-relaxed">{n.message}</p>
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
          <img
            src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || 'Student')}`}
            alt={user?.name}
            className="w-8 h-8 rounded-full border border-indigo-500/40 object-cover"
          />
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-white leading-tight">{user?.name}</p>
            <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
