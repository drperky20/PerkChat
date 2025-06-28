import React from 'react';
import { Phone, Video, MoreVertical, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Profile } from '../../stores/authStore';

interface ChatHeaderProps {
  otherParticipant: Profile;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ otherParticipant }) => {
  if (!otherParticipant) {
    return null; // Or a loading/placeholder state
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Avatar
              src={otherParticipant.avatar_url}
              alt={otherParticipant.username}
              status={otherParticipant.status}
              size="md"
            />
          </motion.div>
          
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {otherParticipant.display_name || otherParticipant.username}
            </h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                otherParticipant.status === 'online' ? 'bg-green-500' :
                otherParticipant.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
              }`} />
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                {otherParticipant.status}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              variant="ghost" 
              size="sm"
              className="relative"
            >
              <Phone className="w-4 h-4" />
            </Button>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              variant="ghost" 
              size="sm"
              className="relative"
            >
              <Video className="w-4 h-4" />
            </Button>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button variant="ghost" size="sm">
              <Info className="w-4 h-4" />
            </Button>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};