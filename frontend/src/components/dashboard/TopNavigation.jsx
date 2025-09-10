import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Settings, ChevronDown, MessageSquare, Image } from 'lucide-react';
// import { Button } from '../ui/button';
import useAuthStore from '../../stores/authStore';
import useChatStore from '../../stores/chatStore';

const TopNavigation = () => {
  const { user, logout } = useAuthStore();
  const { currentMode, setCurrentMode } = useChatStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const modes = [
    {
      id: 'similar_questions',
      label: 'Similar Questions',
      icon: MessageSquare,
      description: 'Generate semantically related questions'
    },
    {
      id: 'image_processing',
      label: 'Image Processing',
      icon: Image,
      description: 'Process and analyze images'
    }
  ];

  const currentModeData = modes.find(mode => mode.id === currentMode);

  return (
    <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-4 py-2.5 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      {/* Left Section - Logo and Brand */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2.5">
          <div className="h-6 w-6 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25">
            <span className="text-white font-bold text-[10px] tracking-tight">LM</span>
          </div>
          <h1 className="text-base font-semibold text-slate-900 tracking-tight">LLM Modes</h1>
        </div>
      </div>

      {/* Center Section - Mode Selector Tabs */}
      <div className="flex items-center bg-slate-50/80 rounded-xl p-0.5 shadow-inner border border-slate-200/50">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;
          
          return (
            <button
              key={mode.id}
              onClick={() => setCurrentMode(mode.id)}
              className={`
                relative flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium text-sm transition-all duration-200 ease-out
                ${isActive 
                  ? 'bg-white text-blue-700 shadow-md shadow-slate-200/50 border border-slate-200/50' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-white/60'
                }
              `}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right Section - User Menu */}
      <div className="flex items-center space-x-3">
        {/* Mode Description */}
        <div className="hidden lg:block text-right">
          <p className="text-xs text-slate-500 font-medium">{currentModeData?.description}</p>
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 text-slate-700 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 rounded-xl p-1.5 hover:bg-slate-50 transition-all duration-150"
          >
            <div className="h-6 w-6 bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-semibold text-[10px]">
                {user?.first_name?.[0]?.toUpperCase()}{user?.last_name?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-900">{user?.first_name} {user?.last_name}</p>
              <p className="text-[10px] text-slate-500 leading-tight">{user?.email}</p>
            </div>
            <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/60 py-2 z-50 animate-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
              </div>
              
              <button className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-3 transition-colors duration-150">
                <User className="h-4 w-4" />
                <span>Profile Settings</span>
              </button>
              
              <button className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-3 transition-colors duration-150">
                <Settings className="h-4 w-4" />
                <span>Preferences</span>
              </button>
              
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-colors duration-150"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
};

export default TopNavigation;