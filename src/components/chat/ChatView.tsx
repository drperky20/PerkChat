import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useChatStore } from '../../stores/chatStore';

export const ChatView: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { conversations, fetchMessages, setActiveConversation } = useChatStore();
  
  useEffect(() => {
    setActiveConversation(conversationId ?? null);
  }, [conversationId, setActiveConversation]);

  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId);
    }
  }, [conversationId, fetchMessages]);
  
  const otherParticipant = conversations.find(c => c.id === conversationId)?.other_participant;

  if (!conversationId || !otherParticipant) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-500">Conversation not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <ChatHeader otherParticipant={otherParticipant} />
      <div className="flex-1 min-h-0">
        <MessageList conversationId={conversationId} />
      </div>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <MessageInput conversationId={conversationId} />
      </div>
    </div>
  );
}; 