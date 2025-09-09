import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Star, 
  MoreHorizontal, 
  Trash2, 
  Edit, 
  // Archive,
  ChevronLeft,
  ChevronRight,
  Settings,
  MessageSquare
} from 'lucide-react';
import { Button } from '../ui/button';
import useChatStore from '../../stores/chatStore';

const Sidebar = () => {
  const {
    currentMode,
    chats,
    currentChatId,
    setCurrentChat,
    createChat,
    updateChat,
    deleteChat,
    sidebarCollapsed,
    setSidebarCollapsed
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  const currentChats = chats[currentMode] || [];
  
  const filteredChats = currentChats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedChats = {
    pinned: filteredChats.filter(chat => chat.is_pinned),
    today: filteredChats.filter(chat => {
      const today = new Date();
      const chatDate = new Date(chat.updated_at);
      return !chat.is_pinned && chatDate.toDateString() === today.toDateString();
    }),
    yesterday: filteredChats.filter(chat => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const chatDate = new Date(chat.updated_at);
      return !chat.is_pinned && chatDate.toDateString() === yesterday.toDateString();
    }),
    thisWeek: filteredChats.filter(chat => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const chatDate = new Date(chat.updated_at);
      return !chat.is_pinned && chatDate > weekAgo && chatDate < yesterday;
    }),
    older: filteredChats.filter(chat => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const chatDate = new Date(chat.updated_at);
      return !chat.is_pinned && chatDate <= weekAgo;
    })
  };

  const handleCreateChat = async () => {
    try {
      setIsCreatingChat(true);
      const title = currentMode === 'similar_questions' 
        ? 'New Question Session' 
        : 'New Image Processing';
      
      const newChat = await createChat(title, currentMode);
      setCurrentChat(newChat.id);
    } catch (error) {
      console.error('Error creating chat:', error);
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleEditChat = (chat) => {
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const handleSaveEdit = async () => {
    try {
      await updateChat(editingChatId, { title: editingTitle });
      setEditingChatId(null);
      setEditingTitle('');
    } catch (error) {
      console.error('Error updating chat:', error);
    }
  };

  const handleTogglePin = async (chat) => {
    try {
      await updateChat(chat.id, { is_pinned: !chat.is_pinned });
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const handleDeleteChat = async (chatId) => {
    if (window.confirm('Are you sure you want to delete this chat?')) {
      try {
        await deleteChat(chatId);
      } catch (error) {
        console.error('Error deleting chat:', error);
      }
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const ChatItem = ({ chat }) => {
    const [showActions, setShowActions] = useState(false);
    
    return (
      <div
        className={`group relative rounded-lg px-3 py-2 cursor-pointer transition-colors duration-150 ${
          currentChatId === chat.id
            ? 'bg-blue-100 border-l-2 border-blue-500'
            : 'hover:bg-gray-100'
        }`}
        onClick={() => setCurrentChat(chat.id)}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {editingChatId === chat.id ? (
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') {
                    setEditingChatId(null);
                    setEditingTitle('');
                  }
                }}
                className="w-full text-sm font-medium bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded"
                autoFocus
              />
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {chat.title}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(chat.updated_at)}
                  </span>
                  {chat.message_count > 0 && (
                    <span className="text-xs text-gray-400">
                      • {chat.message_count} messages
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Chat Actions */}
          {(showActions || currentChatId === chat.id) && editingChatId !== chat.id && (
            <div className="flex items-center space-x-1">
              {chat.is_pinned && <Star className="h-3 w-3 text-yellow-500 fill-current" />}
              
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Toggle actions menu
                  }}
                  className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-3 w-3 text-gray-500" />
                </button>
                
                {/* Actions dropdown would go here */}
              </div>
            </div>
          )}
        </div>

        {/* Quick actions on hover */}
        {showActions && editingChatId !== chat.id && (
          <div className="absolute right-2 top-2 flex items-center space-x-1 bg-white shadow-sm rounded border p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePin(chat);
              }}
              className="p-1 hover:bg-gray-100 rounded"
              title={chat.is_pinned ? 'Unpin' : 'Pin'}
            >
              <Star className={`h-3 w-3 ${chat.is_pinned ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditChat(chat);
              }}
              className="p-1 hover:bg-gray-100 rounded"
              title="Rename"
            >
              <Edit className="h-3 w-3 text-gray-400" />
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteChat(chat.id);
              }}
              className="p-1 hover:bg-red-100 rounded"
              title="Delete"
            >
              <Trash2 className="h-3 w-3 text-red-400" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const ChatGroup = ({ title, chats, icon: Icon }) => {
    if (chats.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="flex items-center space-x-2 px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
          {Icon && <Icon className="h-3 w-3" />}
          <span>{title}</span>
          <span className="text-gray-400">({chats.length})</span>
        </div>
        <div className="space-y-1 mt-2">
          {chats.map(chat => (
            <ChatItem key={chat.id} chat={chat} />
          ))}
        </div>
      </div>
    );
  };

  if (sidebarCollapsed) {
    return (
      <div className="w-12 bg-white border-r border-gray-200 flex flex-col items-center py-4 space-y-4">
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Expand sidebar"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
        
        <button
          onClick={handleCreateChat}
          disabled={isCreatingChat}
          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          title="New chat"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Sidebar Header */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {currentMode === 'similar_questions' ? 'Questions' : 'Image Processing'}
          </h2>
          
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {/* New Chat Button */}
        <Button
          onClick={handleCreateChat}
          disabled={isCreatingChat}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-2 mb-4"
        >
          <Plus className="h-4 w-4" />
          <span>{isCreatingChat ? 'Creating...' : 'New Chat'}</span>
        </Button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {filteredChats.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {searchQuery ? 'No chats found' : 'No chats yet'}
            </p>
            {!searchQuery && (
              <p className="text-gray-400 text-xs mt-1">
                Create your first chat to get started
              </p>
            )}
          </div>
        ) : (
          <>
            <ChatGroup title="Pinned" chats={groupedChats.pinned} icon={Star} />
            <ChatGroup title="Today" chats={groupedChats.today} />
            <ChatGroup title="Yesterday" chats={groupedChats.yesterday} />
            <ChatGroup title="Previous 7 days" chats={groupedChats.thisWeek} />
            <ChatGroup title="Older" chats={groupedChats.older} />
          </>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="px-4 py-3 border-t border-gray-200">
        <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Settings className="h-4 w-4" />
          <span>Chat Settings</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;