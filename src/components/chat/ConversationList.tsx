import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { useChatStore } from '../../stores/chatStore';

interface ConversationListProps {
  onConversationSelect: (conversationId: string) => void;
  activeConversation: string | null;
}

export const ConversationList: React.FC<ConversationListProps> = ({ 
  onConversationSelect,
  activeConversation
}) => {
  const { conversations, isLoading } = useChatStore();

  const handleConversationClick = (conversationId: string) => {
    onConversationSelect(conversationId);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Messages</h2>
        
        {conversations.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No conversations yet
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
              Add contacts to start chatting
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <motion.button
                key={conversation.id}
                onClick={() => handleConversationClick(conversation.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full p-4 rounded-xl text-left transition-all duration-200 ${
                  activeConversation === conversation.id
                    ? 'bg-primary-100 dark:bg-primary-900 border-2 border-primary-200 dark:border-primary-800 shadow-sm'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 border-2 border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Avatar
                    src={conversation.other_participant?.avatar_url}
                    alt={conversation.other_participant?.username}
                    status={conversation.other_participant?.status}
                    size="md"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {conversation.other_participant?.display_name || conversation.other_participant?.username}
                      </p>
                      {conversation.last_message && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                          {formatDistanceToNow(new Date(conversation.last_message.created_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {conversation.last_message?.content || 'No messages yet'}
                      </p>
                      {(conversation.unread_count ?? 0) > 0 && (
                        <Badge variant="primary" size="sm" className="ml-2 flex-shrink-0">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};