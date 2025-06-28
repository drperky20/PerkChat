import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ConversationList } from '../chat/ConversationList';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';

export const MainLayout: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const navigate = useNavigate();
  const {
    activeConversation,
    fetchConversations,
  } = useChatStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, fetchConversations]);

  const handleConversationSelect = (id: string) => {
    navigate(`/conversation/${id}`);
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Sidebar />
      <div className="flex-1 flex">
        <aside className="w-full md:w-1/3 lg:w-1/4 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <ConversationList
            onConversationSelect={handleConversationSelect}
            activeConversation={activeConversation}
          />
        </aside>

        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
};