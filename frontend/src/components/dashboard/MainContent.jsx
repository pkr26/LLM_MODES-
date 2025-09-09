import React from 'react';
import useChatStore from '../../stores/chatStore';
import ChatInterface from './ChatInterface';
import WelcomeScreen from './WelcomeScreen';

const MainContent = () => {
  const { currentChatId } = useChatStore();

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-full">
      {currentChatId ? (
        <ChatInterface />
      ) : (
        <WelcomeScreen />
      )}
    </div>
  );
};

export default MainContent;