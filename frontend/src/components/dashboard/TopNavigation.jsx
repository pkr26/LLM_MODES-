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
    <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      {/* Left Section - Logo and Brand */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">LM</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">LLM_MODES</h1>
        </div>
      </div>

      {/* Center Section - Mode Selector Tabs */}
      <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;
          
          return (
            <button
              key={mode.id}
              onClick={() => setCurrentMode(mode.id)}
              className={`
                relative flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ease-in-out
                ${isActive 
                  ? 'bg-white text-blue-700 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                }
              `}
            >
              <Icon className="h-4 w-4" />
              <span>{mode.label}</span>
              
              {/* Active Indicator */}
              {isActive && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Right Section - User Menu */}
      <div className="flex items-center space-x-3">
        {/* Mode Description */}
        <div className="hidden md:block text-right">
          <p className="text-sm text-gray-600">{currentModeData?.description}</p>
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-2"
          >
            <div className="h-8 w-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {user?.first_name?.[0]?.toUpperCase()}{user?.last_name?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Profile Settings</span>
              </button>
              
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Preferences</span>
              </button>
              
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center space-x-2"
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