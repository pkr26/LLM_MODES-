import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { tokenStorage } from '../services/authService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const useChatStore = create(
  persist(
    (set, get) => ({
      // State
      currentMode: 'similar_questions',
      chats: {},
      currentChatId: null,
      messages: {},
      isLoading: false,
      error: null,
      sidebarCollapsed: false,
      settings: {
        similar_questions: {
          max_questions: 5,
          similarity_threshold: 0.8,
          include_context: true
        },
        image_processing: {
          max_file_size: '10MB',
          supported_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          auto_enhance: false
        }
      },

      // Actions
      setCurrentMode: (mode) => {
        set({ currentMode: mode, currentChatId: null });
        get().fetchChats(mode);
      },

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      setCurrentChat: (chatId) => {
        set({ currentChatId: chatId });
        if (chatId) {
          get().fetchMessages(chatId);
        }
      },

      createChat: async (title, mode) => {
        const token = tokenStorage.getAccessToken();
        if (!token) throw new Error('No authentication token');

        try {
          set({ isLoading: true, error: null });
          
          const response = await axios.post(
            `${API_URL}/api/chats/`,
            { title, mode },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const newChat = response.data;
          const { chats, currentMode } = get();
          
          set({
            chats: {
              ...chats,
              [currentMode]: [newChat, ...(chats[currentMode] || [])],
            },
            currentChatId: newChat.id,
            messages: { ...get().messages, [newChat.id]: [] },
            isLoading: false
          });

          return newChat;
        } catch (error) {
          set({ isLoading: false, error: error.response?.data?.detail || error.message });
          throw error;
        }
      },

      fetchChats: async (mode) => {
        const token = tokenStorage.getAccessToken();
        if (!token) return;

        try {
          set({ isLoading: true, error: null });

          const response = await axios.get(`${API_URL}/api/chats/`, {
            params: { mode },
            headers: { Authorization: `Bearer ${token}` }
          });

          const { chats } = get();
          set({
            chats: { ...chats, [mode]: response.data },
            isLoading: false
          });
        } catch (error) {
          set({ isLoading: false, error: error.response?.data?.detail || error.message });
        }
      },

      fetchChatDetail: async (chatId) => {
        const token = tokenStorage.getAccessToken();
        if (!token) return;

        try {
          set({ isLoading: true, error: null });

          const response = await axios.get(`${API_URL}/api/chats/${chatId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          const chatDetail = response.data;
          set({
            messages: { ...get().messages, [chatId]: chatDetail.messages },
            isLoading: false
          });
        } catch (error) {
          set({ isLoading: false, error: error.response?.data?.detail || error.message });
        }
      },

      fetchMessages: async (chatId) => {
        const token = tokenStorage.getAccessToken();
        if (!token) return;

        try {
          const response = await axios.get(`${API_URL}/api/chats/${chatId}/messages`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          set({
            messages: { ...get().messages, [chatId]: response.data }
          });
        } catch (error) {
          console.error('Error fetching messages:', error);
        }
      },

      sendMessage: async (chatId, content, message_metadata = null) => {
        const token = tokenStorage.getAccessToken();
        if (!token) throw new Error('No authentication token');

        try {
          const tempMessage = {
            id: Date.now(),
            chat_id: chatId,
            role: 'user',
            content,
            message_metadata,
            created_at: new Date().toISOString(),
            isTemporary: true
          };

          // Add temporary message immediately
          const { messages } = get();
          set({
            messages: {
              ...messages,
              [chatId]: [...(messages[chatId] || []), tempMessage]
            }
          });

          const response = await axios.post(
            `${API_URL}/api/chats/${chatId}/messages`,
            { content, message_metadata },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          // Replace temporary message with real one
          const realMessage = response.data;
          set({
            messages: {
              ...get().messages,
              [chatId]: get().messages[chatId]
                .filter(msg => msg.id !== tempMessage.id)
                .concat(realMessage)
            }
          });

          // Simulate AI response for demonstration
          setTimeout(() => {
            const aiResponse = {
              id: Date.now() + 1,
              chat_id: chatId,
              role: 'assistant',
              content: get().generateAIResponse(content, get().currentMode),
              metadata: null,
              created_at: new Date().toISOString()
            };

            set({
              messages: {
                ...get().messages,
                [chatId]: [...get().messages[chatId], aiResponse]
              }
            });
          }, 1000);

          return realMessage;
        } catch (error) {
          // Remove temporary message on error
          const { messages } = get();
          set({
            messages: {
              ...messages,
              [chatId]: messages[chatId].filter(msg => !msg.isTemporary)
            }
          });
          throw error;
        }
      },

      generateAIResponse: (userMessage, mode) => {
        if (mode === 'similar_questions') {
          return `Here are some similar questions to "${userMessage}":

1. ${userMessage.replace(/\?/g, '')} - but with a different perspective?
2. What are the implications of ${userMessage.toLowerCase()}?
3. How does ${userMessage.toLowerCase()} relate to current industry trends?
4. What are the best practices for ${userMessage.toLowerCase()}?
5. Can you provide examples of ${userMessage.toLowerCase()}?`;
        } else if (mode === 'image_processing') {
          return `I can help you process images. Please upload an image and I can:

- Analyze the image content
- Enhance image quality
- Apply filters and effects  
- Extract text from images
- Resize and optimize images
- Convert between formats

What would you like to do with your image?`;
        }
        return 'I understand your message. How can I help you further?';
      },

      updateChat: async (chatId, updates) => {
        const token = tokenStorage.getAccessToken();
        if (!token) throw new Error('No authentication token');

        try {
          const response = await axios.put(
            `${API_URL}/api/chats/${chatId}`,
            updates,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const updatedChat = response.data;
          const { chats, currentMode } = get();
          
          set({
            chats: {
              ...chats,
              [currentMode]: chats[currentMode].map(chat =>
                chat.id === chatId ? updatedChat : chat
              )
            }
          });

          return updatedChat;
        } catch (error) {
          throw error;
        }
      },

      deleteChat: async (chatId) => {
        const token = tokenStorage.getAccessToken();
        if (!token) throw new Error('No authentication token');

        try {
          await axios.delete(`${API_URL}/api/chats/${chatId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          const { chats, currentMode, currentChatId, messages } = get();
          const updatedMessages = { ...messages };
          delete updatedMessages[chatId];

          set({
            chats: {
              ...chats,
              [currentMode]: chats[currentMode].filter(chat => chat.id !== chatId)
            },
            currentChatId: currentChatId === chatId ? null : currentChatId,
            messages: updatedMessages
          });
        } catch (error) {
          throw error;
        }
      },

      fetchSettings: async (mode) => {
        const token = tokenStorage.getAccessToken();
        if (!token) return;

        try {
          const response = await axios.get(`${API_URL}/api/chats/settings/${mode}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          set({
            settings: { ...get().settings, [mode]: response.data.settings }
          });
        } catch (error) {
          console.error('Error fetching settings:', error);
        }
      },

      updateSettings: async (mode, newSettings) => {
        const token = tokenStorage.getAccessToken();
        if (!token) throw new Error('No authentication token');

        try {
          await axios.put(
            `${API_URL}/api/chats/settings/${mode}`,
            { settings: newSettings },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          set({
            settings: { ...get().settings, [mode]: newSettings }
          });
        } catch (error) {
          throw error;
        }
      },

      clearError: () => set({ error: null }),

      // Initialize on app start
      initialize: async () => {
        const { currentMode, fetchChats, fetchSettings } = get();
        await Promise.all([
          fetchChats(currentMode),
          fetchSettings('similar_questions'),
          fetchSettings('image_processing')
        ]);
      }
    }),
    {
      name: 'chat-store',
      partialize: (state) => ({
        currentMode: state.currentMode,
        sidebarCollapsed: state.sidebarCollapsed,
        settings: state.settings
      })
    }
  )
);

export default useChatStore;