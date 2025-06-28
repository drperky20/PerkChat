import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { useChatStore } from '../../stores/chatStore';

interface MessageInputProps {
  conversationId: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({ conversationId }) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const { sendMessage, startTyping, stopTyping } = useChatStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up typing indicator when component unmounts or conversation changes
  useEffect(() => {
    return () => {
      stopTyping(conversationId);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, stopTyping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const messageContent = message.trim();
    setMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    // Stop typing indicator immediately when sending
    stopTyping(conversationId);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    try {
      await sendMessage(conversationId, messageContent);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessage(messageContent);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }

    // Handle typing indicators with proper debouncing
    if (value.trim()) {
      // Start typing if not already started
      startTyping(conversationId);
      
      // Clear existing timeout and set new one
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Auto-stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(conversationId);
        typingTimeoutRef.current = null;
      }, 2000);
    } else {
      // Stop typing immediately if input is empty
      stopTyping(conversationId);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  }, [conversationId, startTyping, stopTyping]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Stop typing when input loses focus
    setTimeout(() => {
      stopTyping(conversationId);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }, 100); // Small delay to prevent flickering
  }, [conversationId, stopTyping]);

  const handleFileUpload = () => {
    console.log('File upload clicked');
    // TODO: Implement file upload functionality
  };

  const handleEmojiPicker = () => {
    console.log('Emoji picker clicked');
    // TODO: Implement emoji picker functionality
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0"
    >
      {/* Mobile-optimized input container */}
      <div className="p-3 md:p-4">
        <form onSubmit={handleSubmit}>
          <div className="flex items-end space-x-2 md:space-x-3">
            {/* Attachment button */}
            <motion.button
              type="button"
              onClick={handleFileUpload}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 md:p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0 touch-manipulation"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </motion.button>
            
            {/* Text input container */}
            <div className="flex-1 relative">
              <motion.div
                animate={{
                  scale: isFocused ? 1.02 : 1,
                  boxShadow: isFocused 
                    ? '0 0 0 2px rgb(59 130 246 / 0.5)' 
                    : '0 1px 3px 0 rgb(0 0 0 / 0.1)'
                }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  placeholder="Type a message..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-2xl resize-none focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200 scrollbar-thin text-base md:text-sm"
                  rows={1}
                  style={{ 
                    minHeight: '48px', 
                    maxHeight: '120px',
                    lineHeight: '1.5',
                    fontSize: window.innerWidth < 768 ? '16px' : '14px' // Prevent zoom on iOS
                  }}
                />
                
                {/* Emoji button */}
                <motion.button
                  type="button"
                  onClick={handleEmojiPicker}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute right-3 bottom-3 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 touch-manipulation"
                  title="Add emoji"
                >
                  <Smile className="w-5 h-5" />
                </motion.button>
              </motion.div>
            </div>
            
            {/* Send button */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                type="submit"
                disabled={!message.trim()}
                className="shrink-0 transition-all duration-200 rounded-2xl px-4 md:px-6 h-12 touch-manipulation"
                size="md"
              >
                <Send className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
            </motion.div>
          </div>
        </form>
      </div>
    </motion.div>
  );
};