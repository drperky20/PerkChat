import React, { useEffect, useRef, useState, useCallback } from 'react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { Check, CheckCheck, MoreHorizontal, Edit, Trash2, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { TypingIndicator } from './TypingIndicator';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';

interface MessageListProps {
  conversationId: string;
}

export const MessageList: React.FC<MessageListProps> = ({ conversationId }) => {
  const { 
    messages, 
    typingIndicators, 
    editMessage, 
    deleteMessage, 
    loadMoreMessages,
    hasMoreMessages 
  } = useChatStore();
  const { user } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const conversationMessages = messages[conversationId] || [];
  const typingUsers = typingIndicators
    .filter(t => t.conversationId === conversationId && t.userId !== user?.id)
    .map(t => ({
      userId: t.userId,
      username: t.username,
      avatar_url: undefined
    }));

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-scroll to bottom for new messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    
    if (isNearBottom && !isUserScrolling) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else if (!isNearBottom) {
      setShowScrollToBottom(true);
    }
  }, [conversationMessages, isUserScrolling]);

  // Handle scroll events
  const handleScroll = useCallback(async () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    const isAtTop = scrollTop < 100;
    
    setShowScrollToBottom(!isNearBottom);
    
    // Detect user scrolling
    setIsUserScrolling(true);
    clearTimeout(window.scrollTimeout);
    window.scrollTimeout = setTimeout(() => {
      setIsUserScrolling(false);
    }, 150);

    // Load more messages when scrolling to top
    if (isAtTop && !isLoadingMore && hasMoreMessages(conversationId)) {
      setIsLoadingMore(true);
      const previousScrollHeight = scrollHeight;
      const previousScrollTop = scrollTop;
      
      try {
        await loadMoreMessages(conversationId);
        
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            const heightDifference = newScrollHeight - previousScrollHeight;
            container.scrollTop = previousScrollTop + heightDifference;
          }
        });
      } finally {
        setIsLoadingMore(false);
      }
    }
  }, [conversationId, isLoadingMore, hasMoreMessages, loadMoreMessages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollToBottom(false);
    setIsUserScrolling(false);
  }, []);

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM d, HH:mm');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1 }}>
            <Check className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
          </motion.div>
        );
      case 'delivered':
        return (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}>
            <CheckCheck className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
          </motion.div>
        );
      case 'read':
        return (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }}>
            <CheckCheck className="w-3 h-3 md:w-4 md:h-4 text-primary-500" />
          </motion.div>
        );
      default:
        return null;
    }
  };

  const groupMessagesByDate = (messages: any[]) => {
    const groups: { [key: string]: any[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.created_at);
      let dateKey;
      
      if (isToday(date)) {
        dateKey = 'Today';
      } else if (isYesterday(date)) {
        dateKey = 'Yesterday';
      } else {
        dateKey = format(date, 'MMMM d, yyyy');
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return groups;
  };

  const messageGroups = groupMessagesByDate(conversationMessages);

  return (
    <div className="flex-1 flex flex-col relative min-h-0">
      {/* Fixed height scrollable container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500"
        onScroll={handleScroll}
        style={{
          height: isMobile ? 'calc(100vh - 180px)' : 'calc(100vh - 200px)',
          maxHeight: isMobile ? 'calc(100vh - 180px)' : 'calc(100vh - 200px)',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch' // Smooth scrolling on iOS
        }}
      >
        {/* Load more indicator */}
        <AnimatePresence>
          {isLoadingMore && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="sticky top-0 z-10 p-3 md:p-4 text-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700"
            >
              <div className="animate-spin rounded-full h-5 w-5 md:h-6 md:w-6 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-2">Loading more messages...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages content */}
        <div className="p-3 md:p-4 space-y-4 md:space-y-6 min-h-full">
          {Object.entries(messageGroups).map(([dateKey, groupMessages]) => (
            <div key={dateKey}>
              {/* Date separator */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center my-4 md:my-6"
              >
                <div className="bg-gray-100 dark:bg-gray-700 px-3 md:px-4 py-1.5 md:py-2 rounded-full shadow-sm sticky top-4 z-10">
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    {dateKey}
                  </span>
                </div>
              </motion.div>

              {/* Messages for this date */}
              <div className="space-y-3 md:space-y-4">
                <AnimatePresence>
                  {groupMessages.map((message, index) => {
                    const isOwn = message.sender_id === user?.id;
                    const showAvatar = !isOwn && (
                      index === 0 || 
                      groupMessages[index - 1].sender_id !== message.sender_id ||
                      new Date(message.created_at).getTime() - new Date(groupMessages[index - 1].created_at).getTime() > 300000
                    );
                    
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
                      >
                        <div className={`flex items-end space-x-2 max-w-[85%] md:max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          {showAvatar && !isOwn && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              <Avatar
                                src={message.sender?.avatar_url}
                                alt={message.sender?.username}
                                size="sm"
                              />
                            </motion.div>
                          )}
                          
                          <div className={`${showAvatar || isOwn ? '' : 'ml-8 md:ml-10'}`}>
                            <motion.div
                              whileHover={!isMobile ? { scale: 1.02 } : {}}
                              className={`relative px-3 md:px-4 py-2.5 md:py-3 rounded-2xl transition-all duration-200 ${
                                isOwn
                                  ? 'bg-primary-600 text-white shadow-lg'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-md'
                              }`}
                            >
                              <p className="text-sm md:text-sm leading-relaxed break-words">{message.content}</p>
                              
                              {message.edited && (
                                <span className="text-xs opacity-70 italic"> (edited)</span>
                              )}

                              {/* Message actions - Hidden on mobile for better UX */}
                              {isOwn && !isMobile && (
                                <div className="absolute top-0 right-0 -mr-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="flex items-center space-x-1">
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => {
                                        const newContent = prompt('Edit message:', message.content);
                                        if (newContent && newContent !== message.content) {
                                          editMessage(message.id, newContent);
                                        }
                                      }}
                                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                      title="Edit message"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </motion.button>
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => {
                                        if (confirm('Delete this message?')) {
                                          deleteMessage(message.id);
                                        }
                                      }}
                                      className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                      title="Delete message"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </motion.button>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                            
                            <div className={`flex items-center mt-1 space-x-1 text-xs text-gray-500 dark:text-gray-400 ${isOwn ? 'justify-end' : ''}`}>
                              <span>{formatMessageDate(message.created_at)}</span>
                              {isOwn && getStatusIcon(message.status)}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}

          {/* Typing indicators */}
          <TypingIndicator typingUsers={typingUsers} />

          {/* Scroll anchor */}
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollToBottom && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-4 right-4 z-20"
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Button
                onClick={scrollToBottom}
                variant="primary"
                size="sm"
                className="rounded-full shadow-lg bg-primary-600 hover:bg-primary-700 text-white border-2 border-white dark:border-gray-800 w-12 h-12 p-0 touch-manipulation"
              >
                <ChevronUp className="w-4 h-4 transform rotate-180" />
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};