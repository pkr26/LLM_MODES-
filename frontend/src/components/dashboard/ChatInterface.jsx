import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Send, 
  Paperclip, 
  Image, 
  Copy, 
  RefreshCw, 
  ThumbsUp, 
  ThumbsDown,
  Download,
  Upload,
  MessageSquare
} from 'lucide-react';
import { Button } from '../ui/button';
import useChatStore from '../../stores/chatStore';

const ChatInterface = () => {
  // const { user } = useAuthStore();
  const {
    currentChatId,
    currentMode,
    messages,
    sendMessage,
    chats
  } = useChatStore();

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const currentMessages = useMemo(() => messages[currentChatId] || [], [messages, currentChatId]);
  const currentChat = chats[currentMode]?.find(chat => chat.id === currentChatId);

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && uploadedFiles.length === 0) return;

    try {
      setIsLoading(true);
      
      let messageContent = inputText.trim();
      let metadata = null;

      if (uploadedFiles.length > 0) {
        metadata = {
          files: uploadedFiles.map(file => ({
            name: file.name,
            type: file.type,
            size: file.size,
            data: file.data // base64 encoded
          }))
        };
        
        if (!messageContent) {
          messageContent = `Uploaded ${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''} for processing`;
        }
      }

      await sendMessage(currentChatId, messageContent, metadata);
      setInputText('');
      setUploadedFiles([]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (files) => {
    const validFiles = Array.from(files).filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isValidType && isValidSize;
    });

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedFiles(prev => [...prev, {
          name: file.name,
          type: file.type,
          size: file.size,
          data: e.target.result
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (currentMode === 'image_processing') {
      handleFileUpload(files);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
  };

  const MessageBubble = ({ message, isUser }) => (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`max-w-3xl ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Avatar */}
        <div className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
            isUser 
              ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
              : 'bg-gradient-to-br from-gray-400 to-gray-600'
          }`}>
            <span className="text-white text-xs font-medium">
              {isUser ? 'Y' : 'AI'}
            </span>
          </div>

          {/* Message Content */}
          <div className={`relative group ${isUser ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25' : 'bg-white/80 backdrop-blur-sm border border-slate-200/60 shadow-md'} rounded-2xl px-4 py-3`}>
            <div className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </div>

            {/* File attachments */}
            {message.message_metadata?.files && (
              <div className="mt-3 space-y-2">
                {message.message_metadata.files.map((file, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg">
                    <Image className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Message Actions */}
            {!isUser && (
              <div className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-all duration-200">
                <div className="flex items-center space-x-0.5 bg-white/95 backdrop-blur-sm shadow-xl rounded-xl p-1 border border-slate-200/60">
                  <button
                    onClick={() => copyToClipboard(message.content)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors duration-150"
                    title="Copy"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  
                  <button
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors duration-150"
                    title="Regenerate"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                  
                  <button
                    className="p-1.5 hover:bg-green-50 rounded-lg text-slate-500 hover:text-green-600 transition-colors duration-150"
                    title="Good response"
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </button>
                  
                  <button
                    className="p-1.5 hover:bg-red-50 rounded-lg text-slate-500 hover:text-red-600 transition-colors duration-150"
                    title="Poor response"
                  >
                    <ThumbsDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Timestamp */}
            <div className={`text-xs mt-2 ${isUser ? 'text-blue-100' : 'text-gray-400'}`}>
              {new Date(message.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div 
      className="flex-1 flex flex-col h-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Chat Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 tracking-tight">
            {currentChat?.title || 'Untitled Chat'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            {currentMode === 'similar_questions' 
              ? 'Generate and explore similar questions' 
              : 'Process and analyze images'
            } • {currentMessages.length} messages
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {currentMode === 'image_processing' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>Upload</span>
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-slate-50/20 to-white/50">
        {currentMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {currentMode === 'similar_questions' ? (
                  <MessageSquare className="h-6 w-6 text-gray-400" />
                ) : (
                  <Image className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <h3 className="text-base font-medium text-gray-900 mb-2">
                Start the conversation
              </h3>
              <p className="text-sm text-gray-600 max-w-sm mx-auto">
                {currentMode === 'similar_questions'
                  ? 'Ask a question to get started with generating similar alternatives'
                  : 'Upload an image or describe what you\'d like to process'
                }
              </p>
            </div>
          </div>
        ) : (
          <>
            {currentMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isUser={message.role === 'user'}
              />
            ))}
            
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="flex items-start space-x-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">AI</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                    <div className="flex space-x-2">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white/90 backdrop-blur-sm border-t border-slate-200/60 p-4">
        {/* File Upload Preview */}
        {uploadedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <Image className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">{file.name}</span>
                <button
                  onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                currentMode === 'similar_questions'
                  ? 'Ask a question to generate similar alternatives...'
                  : 'Describe what you want to do with your images...'
              }
              className="w-full resize-none border border-slate-300/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 max-h-32 min-h-[48px] text-sm bg-white/80 backdrop-blur-sm shadow-sm transition-all duration-200"
              rows={1}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center space-x-2">
            {currentMode === 'image_processing' && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all duration-150"
                disabled={isLoading}
              >
                <Paperclip className="h-4 w-4" />
              </button>
            )}

            <Button
              onClick={handleSendMessage}
              disabled={isLoading || (!inputText.trim() && uploadedFiles.length === 0)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2.5 rounded-xl flex items-center space-x-2 text-sm font-medium shadow-lg shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </div>
        </div>

        {/* Keyboard Shortcut Hint */}
        <div className="mt-3 text-xs text-slate-400 text-center font-medium">
          Press <kbd className="px-2 py-1 bg-slate-100 rounded-md text-xs font-semibold text-slate-600 shadow-sm">Enter</kbd> to send • <kbd className="px-2 py-1 bg-slate-100 rounded-md text-xs font-semibold text-slate-600 shadow-sm">Shift + Enter</kbd> for new line
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => handleFileUpload(e.target.files)}
        className="hidden"
      />

      {/* Drag overlay */}
      {dragActive && currentMode === 'image_processing' && (
        <div className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-500 flex items-center justify-center z-50">
          <div className="text-center">
            <Upload className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <p className="text-lg font-medium text-blue-800">Drop images here to upload</p>
            <p className="text-blue-600">Supports JPG, PNG, GIF, WebP (up to 10MB)</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;