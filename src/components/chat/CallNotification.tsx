import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Clock } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { useCallStore } from '../../stores/callStore';

export const CallNotification: React.FC = () => {
  const {
    incomingCall,
    answerCall,
    declineCall,
  } = useCallStore();
  const [ringDuration, setRingDuration] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (incomingCall?.status === 'ringing') {
      const startTime = new Date(incomingCall.created_at).getTime();
      interval = setInterval(() => {
        setRingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      setRingDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [incomingCall?.status, incomingCall?.created_at]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallStatusText = () => {
    if (!incomingCall) return '';
    return `Incoming call • ${formatDuration(ringDuration)}`;
  };

  const handleAnswer = () => {
    if (incomingCall) {
      answerCall(incomingCall.id);
    }
  };

  const handleDecline = () => {
    if (incomingCall) {
      declineCall(incomingCall.id);
    }
  };

  const getCallerInfo = () => {
    if (!incomingCall) return null;
    return incomingCall.caller_profile;
  };

  if (!incomingCall || incomingCall.status !== 'ringing') return null;

  const callerInfo = getCallerInfo();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -100, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 min-w-[320px] max-w-md">
          {/* Call Status Indicator */}
          <div className="flex items-center justify-center mb-4">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="p-3 rounded-full bg-primary-100 dark:bg-primary-900"
            >
              <Phone className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </motion.div>
          </div>

          {/* Caller Information */}
          <div className="text-center mb-4">
            <Avatar
              src={callerInfo?.avatar_url}
              alt={callerInfo?.username || 'Caller'}
              size="lg"
              className="mx-auto mb-3"
            />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {callerInfo?.display_name || callerInfo?.username}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {getCallStatusText()}
            </p>
          </div>

          {/* Ring Duration */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center mb-4 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <Clock className="w-4 h-4 text-gray-500 mr-2" />
            <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
              {formatDuration(ringDuration)}
            </span>
          </motion.div>

          {/* Call Actions */}
          <div className="flex justify-center space-x-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={handleDecline}
                variant="danger"
                size="lg"
                className="rounded-full w-14 h-14 p-0"
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Button
                onClick={handleAnswer}
                className="rounded-full w-14 h-14 p-0 bg-green-600 hover:bg-green-700"
              >
                <Phone className="w-6 h-6" />
              </Button>
            </motion.div>
          </div>

          {/* Missed Call Indicator */}
          {call.status === 'missed' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg"
            >
              <p className="text-sm text-warning-700 dark:text-warning-300 text-center">
                You missed a call from {call.callerName}
              </p>
              {call.endTime && (
                <p className="text-xs text-warning-600 dark:text-warning-400 text-center mt-1">
                  {new Date(call.endTime).toLocaleTimeString()}
                </p>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};