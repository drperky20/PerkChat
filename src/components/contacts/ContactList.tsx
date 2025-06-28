import React, { useState } from 'react';
import { Search, UserPlus, Users, UserX, Clock, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useContactStore } from '../../stores/contactStore';
import { useChatStore } from '../../stores/chatStore';

export const ContactList: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'contacts' | 'pending' | 'blocked'>('contacts');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const {
    contacts,
    pendingRequests,
    blockedUsers,
    isLoading,
    fetchContacts,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    blockUser,
    unblockUser,
    searchUsers,
  } = useContactStore();

  const { createConversation, setActiveConversation } = useChatStore();

  React.useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 2) {
      setIsSearching(true);
      try {
        const results = await searchUsers(query);
        setSearchResults(results);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleStartChat = async (contactId: string) => {
    try {
      const conversationId = await createConversation(contactId);
      setActiveConversation(conversationId);
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  const handleSendFriendRequest = async (username: string) => {
    await sendFriendRequest(username);
    setSearchQuery('');
    setSearchResults([]);
  };

  const tabs = [
    { id: 'contacts', label: 'Contacts', icon: Users, count: contacts.length },
    { id: 'pending', label: 'Pending', icon: Clock, count: pendingRequests.length },
    { id: 'blocked', label: 'Blocked', icon: UserX, count: blockedUsers.length },
  ];

  const getCurrentList = () => {
    switch (activeTab) {
      case 'pending':
        return pendingRequests;
      case 'blocked':
        return blockedUsers;
      default:
        return contacts;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
          
          {/* Search Results */}
          {searchQuery.length > 2 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto mb-2"></div>
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <div key={user.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar
                          src={user.avatar_url}
                          alt={user.username}
                          status={user.status}
                          size="sm"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.display_name || user.username}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            @{user.username}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendFriendRequest(user.username)}
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">No users found</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <Badge variant="secondary" size="sm">
                    {tab.count}
                  </Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            Loading...
          </div>
        ) : getCurrentList().length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No {activeTab} yet</p>
            {activeTab === 'contacts' && (
              <p className="text-sm mt-2">Search for users above to add contacts</p>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {getCurrentList().map((contact) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar
                      src={contact.contact_profile.avatar_url}
                      alt={contact.contact_profile.username}
                      status={contact.contact_profile.status}
                      size="md"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {contact.contact_profile.display_name || contact.contact_profile.username}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        @{contact.contact_profile.username}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {contact.contact_profile.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {activeTab === 'contacts' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartChat(contact.contact_id)}
                          title="Start chat"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => blockUser(contact.id)}
                          title="Block user"
                        >
                          <UserX className="w-4 h-4" />
                        </Button>
                      </>
                    )}

                    {activeTab === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => acceptFriendRequest(contact.id)}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectFriendRequest(contact.id)}
                        >
                          Reject
                        </Button>
                      </>
                    )}

                    {activeTab === 'blocked' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => unblockUser(contact.id)}
                      >
                        Unblock
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};