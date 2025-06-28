import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../ui/Avatar';

interface TypingUser {
  userId: string;
  username: string;
  avatar_url?: string;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  className?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  typingUsers, 
  className = '' 
}) => {
  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].username} is typing`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].username} and ${typingUsers[1].username} are typing`;
    } else {
      return `${typingUsers[0].username} and ${typingUsers.length - 1} others are typing`;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={`flex items-center space-x-3 px-4 py-2 ${className}`}
      >
        {/* Show avatars for up to 3 typing users */}
        <div className="flex -space-x-2">
          {typingUsers.slice(0, 3).map((user, index) => (
            <motion.div
              key={user.userId}
              initial={{ scale: 0, x: 20 }}
              animate={{ scale: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Avatar
                src={user.avatar_url}
                alt={user.username}
                size="sm"
                className="border-2 border-white dark:border-gray-800"
              />
            </motion.div>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-2xl"
          >
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {getTypingText()}
              </span>
              
              {/* Animated dots */}
              <div className="flex space-x-1">
                {[0, 1, 2].map((index) => (
                  <motion.div
                    key={index}
                    className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full"
                    animate={{
                      y: [0, -4, 0],
                      opacity: [0.4, 1, 0.4]
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: index * 0.2,
                      ease: 'easeInOut'
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};