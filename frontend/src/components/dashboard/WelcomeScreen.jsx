import React from 'react';
import { MessageSquare, Image, Plus, Lightbulb, Zap, Star } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import useChatStore from '../../stores/chatStore';

const WelcomeScreen = () => {
  const { currentMode, createChat, setCurrentChat } = useChatStore();

  const handleStartChat = async (title) => {
    try {
      const newChat = await createChat(title, currentMode);
      setCurrentChat(newChat.id);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const similarQuestionsData = {
    title: 'Similar Questions Mode',
    description: 'Generate semantically related questions and explore different perspectives on your topics',
    icon: MessageSquare,
    features: [
      'Generate 5-10 similar questions based on your input',
      'Explore different angles and perspectives',
      'Save useful question sets for later reference',
      'Export questions in various formats'
    ],
    examples: [
      'What are the best practices for React performance?',
      'How can I optimize my machine learning model?',
      'What are effective team management strategies?',
      'How do I improve my public speaking skills?'
    ],
    color: 'blue'
  };

  const imageProcessingData = {
    title: 'Image Processing Mode',
    description: 'Upload, analyze, and process images with AI-powered tools',
    icon: Image,
    features: [
      'Upload multiple images via drag-and-drop',
      'Analyze image content and extract information',
      'Apply filters, enhancements, and effects',
      'Extract text from images (OCR)'
    ],
    examples: [
      'Enhance image quality and resolution',
      'Extract text from documents and photos',
      'Apply artistic filters and effects',
      'Batch process multiple images'
    ],
    color: 'purple'
  };

  const currentData = currentMode === 'similar_questions' ? similarQuestionsData : imageProcessingData;
  const Icon = currentData.icon;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-blue-50/30">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${
            currentData.color === 'blue' 
              ? 'from-blue-500 to-blue-600' 
              : 'from-purple-500 to-purple-600'
          } rounded-2xl mb-6 shadow-lg`}>
            <Icon className="h-8 w-8 text-white" />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {currentData.title}
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {currentData.description}
          </p>
        </div>

        {/* Quick Start Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Features Card */}
          <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Star className="h-5 w-5 text-yellow-500" />
                <h2 className="text-xl font-semibold text-gray-900">Key Features</h2>
              </div>
              
              <ul className="space-y-3">
                {currentData.features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      currentData.color === 'blue' ? 'bg-blue-500' : 'bg-purple-500'
                    }`} />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Examples Card */}
          <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Lightbulb className="h-5 w-5 text-orange-500" />
                <h2 className="text-xl font-semibold text-gray-900">Try These Examples</h2>
              </div>
              
              <div className="space-y-3">
                {currentData.examples.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleStartChat(example)}
                    className={`w-full text-left p-3 rounded-lg border border-gray-200 hover:border-${currentData.color}-300 hover:bg-${currentData.color}-50/50 transition-colors group`}
                  >
                    <span className="text-gray-700 group-hover:text-gray-900">
                      {example}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Start New Chat */}
        <div className="text-center">
          <Button
            onClick={() => handleStartChat(
              currentMode === 'similar_questions' 
                ? 'New Question Session' 
                : 'New Image Processing'
            )}
            size="lg"
            className={`${
              currentData.color === 'blue'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-purple-600 hover:bg-purple-700'
            } text-white px-8 py-4 text-lg font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200`}
          >
            <Plus className="h-5 w-5 mr-2" />
            Start New {currentData.title.split(' ')[0]} Session
          </Button>
          
          <p className="text-gray-500 text-sm mt-4">
            Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Cmd + N</kbd> to quickly create a new chat
          </p>
        </div>

        {/* Mode-specific tips */}
        <Card className="mt-8 shadow-lg border-0 bg-gradient-to-r from-gray-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <Zap className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Pro Tips</h3>
                {currentMode === 'similar_questions' ? (
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Be specific with your questions for better similar suggestions</li>
                    <li>• Use follow-up questions to explore different aspects</li>
                    <li>• Pin important conversations for quick access</li>
                    <li>• Export your question sets for presentations or documents</li>
                  </ul>
                ) : (
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Drag and drop images directly into the chat</li>
                    <li>• Supported formats: JPG, PNG, GIF, WebP (up to 10MB)</li>
                    <li>• Use batch processing for multiple similar operations</li>
                    <li>• Download processed images in your preferred format</li>
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WelcomeScreen;