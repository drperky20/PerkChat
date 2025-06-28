import React, { useState } from 'react';
import { MessageCircle, Users, Settings, LogOut, X, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../stores/authStore';

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isMobile = false,
  onClose 
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { profile, signOut, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const getActiveView = () => {
    if (location.pathname.startsWith('/contacts')) return 'contacts';
    if (location.pathname.startsWith('/profile')) return 'profile';
    return 'chat';
  };

  const navigationItems = [
    { id: 'chat', label: 'Messages', icon: MessageCircle, path: '/' },
    { id: 'contacts', label: 'Contacts', icon: Users, path: '/contacts' },
    { id: 'profile', label: 'Profile', icon: Settings, path: '/profile' },
  ];

  const activeView = getActiveView();

  return (
    <div className={`bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full ${isMobile ? 'w-80' : 'w-72'}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              PerkChat
            </h1>
          </div>
          
          {isMobile && onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <motion.div 
          className="flex items-center space-x-3 cursor-pointer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleNavigation('/profile')}
        >
          <Avatar
            src={profile?.avatar_url}
            alt={profile?.username}
            status={profile?.status}
            size="md"
          />
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {profile?.display_name || profile?.username}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {profile?.status}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navigationItems.map((item) => (
            <motion.button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeView === item.id
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </motion.button>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <motion.button
          onClick={toggleTheme}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          <span className="font-medium">
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </span>
        </motion.button>
        
        <motion.button
          onClick={signOut}
          disabled={isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-error-600 hover:text-error-700 hover:bg-error-50 dark:hover:bg-error-900/20 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </motion.button>
      </div>
    </div>
  );
};