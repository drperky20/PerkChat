import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, VideoOff, Clock } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

interface CallData {
  id: string;
  conversationId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'connected' | 'ended' | 'missed';
  startTime?: number;
  endTime?: number;
  duration?: number;
}

interface CallNotificationProps {
  call: CallData | null;
  onAnswer: (callId: string) => void;
  onReject: (callId: string) => void;
  onEnd: (callId: string) => void;
  className?: string;
}

export const CallNotification: React.FC<CallNotificationProps> = ({
  call,
  onAnswer,
  onReject,
  onEnd,
  className = ''
}) => {
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (call?.status === 'connected' && call.startTime) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - call.startTime!) / 1000));
      }, 1000);
    } else {
      setCallDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [call?.status, call?.startTime]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallStatusText = () => {
    switch (call?.status) {
      case 'ringing':
        return 'Incoming call...';
      case 'connected':
        return `Connected • ${formatDuration(callDuration)}`;
      case 'ended':
        return 'Call ended';
      case 'missed':
        return 'Missed call';
      default:
        return '';
    }
  };

  const getCallIcon = () => {
    if (call?.type === 'video') {
      return call.status === 'connected' ? Video : VideoOff;
    }
    return call?.status === 'connected' ? Phone : PhoneOff;
  };

  if (!call) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -100, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 min-w-[320px] max-w-md">
          {/* Call Status Indicator */}
          <div className="flex items-center justify-center mb-4">
            <motion.div
              animate={call.status === 'ringing' ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 1, repeat: call.status === 'ringing' ? Infinity : 0 }}
              className={`p-3 rounded-full ${
                call.status === 'connected' 
                  ? 'bg-success-100 dark:bg-success-900' 
                  : call.status === 'ringing'
                  ? 'bg-primary-100 dark:bg-primary-900'
                  : 'bg-error-100 dark:bg-error-900'
              }`}
            >
              {React.createElement(getCallIcon(), {
                className: `w-6 h-6 ${
                  call.status === 'connected' 
                    ? 'text-success-600 dark:text-success-400' 
                    : call.status === 'ringing'
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-error-600 dark:text-error-400'
                }`
              })}
            </motion.div>
          </div>

          {/* Caller Information */}
          <div className="text-center mb-4">
            <Avatar
              src={call.callerAvatar}
              alt={call.callerName}
              size="lg"
              className="mx-auto mb-3"
            />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {call.callerName}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {getCallStatusText()}
            </p>
            
            {call.type === 'video' && (
              <div className="flex items-center justify-center mt-2">
                <Video className="w-4 h-4 text-gray-400 mr-1" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Video Call</span>
              </div>
            )}
          </div>

          {/* Call Duration for Connected Calls */}
          {call.status === 'connected' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center mb-4 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <Clock className="w-4 h-4 text-gray-500 mr-2" />
              <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                {formatDuration(callDuration)}
              </span>
            </motion.div>
          )}

          {/* Call Actions */}
          <div className="flex justify-center space-x-4">
            {call.status === 'ringing' && (
              <>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={() => onReject(call.id)}
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
                    onClick={() => onAnswer(call.id)}
                    className="rounded-full w-14 h-14 p-0 bg-success-600 hover:bg-success-700"
                  >
                    {call.type === 'video' ? (
                      <Video className="w-6 h-6" />
                    ) : (
                      <Phone className="w-6 h-6" />
                    )}
                  </Button>
                </motion.div>
              </>
            )}

            {call.status === 'connected' && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={() => onEnd(call.id)}
                  variant="danger"
                  size="lg"
                  className="rounded-full w-14 h-14 p-0"
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>
              </motion.div>
            )}
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