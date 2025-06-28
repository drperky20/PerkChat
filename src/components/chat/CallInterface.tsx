import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Clock,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { useCallStore } from '../../stores/callStore';

export const CallInterface: React.FC = () => {
  const {
    currentCall,
    isCallActive,
    isMuted,
    endCall,
    toggleMute,
  } = useCallStore();

  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentCall?.status === 'connected' && currentCall.answered_at) {
      interval = setInterval(() => {
        const startTime = new Date(currentCall.answered_at!).getTime();
        setCallDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      setCallDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentCall?.status, currentCall?.answered_at]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallStatusText = () => {
    switch (currentCall?.status) {
      case 'initiating':
        return 'Initiating call...';
      case 'ringing':
        return 'Ringing...';
      case 'connected':
        return `Connected • ${formatDuration(callDuration)}`;
      default:
        return '';
    }
  };

  const handleEndCall = () => {
    if (currentCall) {
      endCall(currentCall.id);
    }
  };

  const getContactInfo = () => {
    if (!currentCall) return null;
    
    // Determine if current user is caller or recipient
    const { data: { user } } = useCallStore.getState() as any;
    const isUserCaller = currentCall.caller_id === user?.id;
    
    return isUserCaller ? currentCall.recipient_profile : currentCall.caller_profile;
  };

  if (!isCallActive || !currentCall) return null;

  const contactInfo = getContactInfo();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className={`fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl transition-all duration-300 ${
          isMinimized 
            ? 'bottom-4 right-4 w-80' 
            : 'bottom-4 left-1/2 transform -translate-x-1/2 w-96'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar
                  src={contactInfo?.avatar_url}
                  alt={contactInfo?.username || 'Contact'}
                  size="md"
                />
                {currentCall.status === 'connected' && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                )}
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {contactInfo?.display_name || contactInfo?.username}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {getCallStatusText()}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-4 h-4 flex items-center justify-center">
                {isMinimized ? '□' : '─'}
              </div>
            </button>
          </div>
        </div>

        {/* Call Status & Duration */}
        {!isMinimized && currentCall.status === 'connected' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50"
          >
            <div className="flex items-center justify-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                {formatDuration(callDuration)}
              </span>
            </div>
          </motion.div>
        )}

        {/* Controls */}
        <div className={`p-4 ${isMinimized ? 'px-2' : ''}`}>
          <div className="flex justify-center space-x-4">
            {/* Mute Button */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={toggleMute}
                variant={isMuted ? 'danger' : 'outline'}
                size={isMinimized ? 'sm' : 'md'}
                className={`rounded-full ${isMinimized ? 'w-10 h-10' : 'w-12 h-12'} p-0`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <MicOff className={`${isMinimized ? 'w-4 h-4' : 'w-5 h-5'}`} />
                ) : (
                  <Mic className={`${isMinimized ? 'w-4 h-4' : 'w-5 h-5'}`} />
                )}
              </Button>
            </motion.div>

            {/* End Call Button */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={handleEndCall}
                variant="danger"
                size={isMinimized ? 'sm' : 'md'}
                className={`rounded-full ${isMinimized ? 'w-10 h-10' : 'w-12 h-12'} p-0 bg-red-600 hover:bg-red-700`}
                title="End call"
              >
                <PhoneOff className={`${isMinimized ? 'w-4 h-4' : 'w-5 h-5'}`} />
              </Button>
            </motion.div>

            {/* Volume Indicator (visual only for now) */}
            {!isMinimized && currentCall.status === 'connected' && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center justify-center w-12 h-12 rounded-full border border-gray-300 dark:border-gray-600"
              >
                <Volume2 className="w-5 h-5 text-gray-500" />
              </motion.div>
            )}
          </div>

          {/* Connection Status Indicator */}
          {!isMinimized && (
            <div className="mt-3 flex items-center justify-center">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
                currentCall.status === 'connected' 
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                  : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  currentCall.status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                <span>
                  {currentCall.status === 'connected' ? 'Connected' : 'Connecting...'}
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}; 