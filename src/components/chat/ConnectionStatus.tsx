import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Signal, AlertTriangle } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';

interface ConnectionStatusProps {
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  className = ''
}) => {
  const { connectionStatus } = useChatStore();

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return Wifi;
      case 'reconnecting':
        return Signal;
      default:
        return WifiOff;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-success-600';
      case 'reconnecting':
        return 'text-warning-600';
      default:
        return 'text-error-600';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Real-time connected';
      case 'reconnecting':
        return 'Reconnecting...';
      default:
        return 'Real-time disconnected';
    }
  };

  const getBgColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800';
      case 'reconnecting':
        return 'bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800';
      default:
        return 'bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800';
    }
  };

  // Only show if connection is not optimal
  if (connectionStatus === 'connected') {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`fixed bottom-4 left-4 z-40 ${className}`}
      >
        <div className={`px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm ${getBgColor()}`}>
          <div className="flex items-center space-x-3">
            <motion.div
              animate={connectionStatus === 'reconnecting' ? { rotate: 360 } : {}}
              transition={{ duration: 2, repeat: connectionStatus === 'reconnecting' ? Infinity : 0 }}
            >
              {React.createElement(getStatusIcon(), {
                className: `w-5 h-5 ${getStatusColor()}`
              })}
            </motion.div>
            
            <div className="flex-1">
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </span>
              
              {connectionStatus === 'disconnected' && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Messages will sync when reconnected
                </div>
              )}
            </div>

            {/* Signal strength indicator for connected state */}
            {connectionStatus === 'connected' && (
              <div className="flex items-end space-x-0.5">
                {[1, 2, 3, 4].map((bar) => (
                  <motion.div
                    key={bar}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: bar * 0.1 }}
                    className={`w-1 rounded-sm ${getStatusColor().replace('text-', 'bg-')}`}
                    style={{ height: `${bar * 3 + 4}px` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};