import { create } from 'zustand';
import { supabase, createRealtimeSubscription } from '../lib/supabase';
import { messageCacheManager } from '../hooks/useMessageCache';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'file' | 'image';
  file_url?: string;
  file_name?: string;
  status: 'sent' | 'delivered' | 'read';
  edited: boolean;
  created_at: string;
  updated_at: string;
  sender?: {
    username: string;
    avatar_url?: string;
    display_name?: string;
  };
}

interface Conversation {
  id: string;
  participant_one: string;
  participant_two: string;
  created_at: string;
  updated_at: string;
  other_participant?: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    status: 'online' | 'offline' | 'away';
  };
  last_message?: Message;
  unread_count?: number;
}

interface TypingIndicator {
  conversationId: string;
  userId: string;
  username: string;
  timestamp: number;
}

interface ChatState {
  conversations: Conversation[];
  messages: { [conversationId: string]: Message[] };
  activeConversation: string | null;
  typingIndicators: TypingIndicator[];
  isLoading: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  
  // Actions
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  loadMoreMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, type?: 'text' | 'file' | 'image') => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  setActiveConversation: (conversationId: string | null) => void;
  addTypingIndicator: (indicator: TypingIndicator) => void;
  removeTypingIndicator: (conversationId: string, userId: string) => void;
  createConversation: (participantId: string) => Promise<string>;
  subscribeToRealtime: () => Promise<void>;
  unsubscribeFromRealtime: () => void;
  hasMoreMessages: (conversationId: string) => boolean;
  startTyping: (conversationId: string) => Promise<void>;
  stopTyping: (conversationId: string) => Promise<void>;
  setUserOnline: () => Promise<void>;
  setUserOffline: () => Promise<void>;
}

const MESSAGES_PER_PAGE = 50;

// Store for real-time subscriptions and state
let messageChannel: any = null;
let typingChannel: any = null;
let conversationChannel: any = null;
let profileChannel: any = null;
let typingTimeouts: Map<string, NodeJS.Timeout> = new Map();
let currentUserId: string | null = null;

export const useChatStore = create<ChatState>((set, get) => {
  return {
    conversations: [],
    messages: {},
    activeConversation: null,
    typingIndicators: [],
    isLoading: false,
    connectionStatus: 'disconnected',

    setUserOnline: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
          .from('profiles')
          .update({ status: 'online', updated_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch (error) {
        console.error('Failed to set user online:', error);
      }
    },

    setUserOffline: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
          .from('profiles')
          .update({ status: 'offline', updated_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch (error) {
        console.error('Failed to set user offline:', error);
      }
    },

    fetchConversations: async () => {
      set({ isLoading: true });
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log('No authenticated user, skipping conversation fetch');
          set({ isLoading: false, conversations: [] });
          return;
        }

        currentUserId = user.id;

        const { data: conversations, error } = await supabase
          .from('conversations')
          .select(`
            *,
            participant_one_profile:profiles!conversations_participant_one_fkey (
              id,
              username,
              display_name,
              avatar_url,
              status
            ),
            participant_two_profile:profiles!conversations_participant_two_fkey (
              id,
              username,
              display_name,
              avatar_url,
              status
            )
          `)
          .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
          .order('updated_at', { ascending: false });

        if (error) throw error;

        // Get last message for each conversation
        const conversationsWithMessages = await Promise.all(
          (conversations || []).map(async (conv) => {
            const { data: lastMessage } = await supabase
              .from('messages')
              .select(`
                *,
                sender:profiles!messages_sender_id_fkey (
                  username,
                  avatar_url,
                  display_name
                )
              `)
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            // Get unread count
            const { count: unreadCount } = await supabase
              .from('messages')
              .select('*', { count: 'exact' })
              .eq('conversation_id', conv.id)
              .neq('sender_id', user.id)
              .neq('status', 'read');

            const otherParticipant = conv.participant_one === user.id 
              ? conv.participant_two_profile 
              : conv.participant_one_profile;

            return {
              ...conv,
              other_participant: otherParticipant,
              last_message: lastMessage,
              unread_count: unreadCount || 0
            };
          })
        );

        set({ conversations: conversationsWithMessages, isLoading: false });
      } catch (error: any) {
        console.error('Failed to fetch conversations:', error);
        toast.error('Failed to fetch conversations');
        set({ isLoading: false });
      }
    },

    fetchMessages: async (conversationId: string) => {
      try {
        // Check cache first
        const cachedMessages = messageCacheManager.getCachedMessages(conversationId);
        if (cachedMessages.length > 0) {
          set(state => ({
            messages: {
              ...state.messages,
              [conversationId]: cachedMessages,
            },
          }));
          return;
        }

        const { data: messages, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey (
              username,
              avatar_url,
              display_name
            )
          `)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(MESSAGES_PER_PAGE);

        if (error) throw error;

        const sortedMessages = (messages || []).reverse();
        
        // Cache messages
        messageCacheManager.setCachedMessages(conversationId, sortedMessages);
        
        set(state => ({
          messages: {
            ...state.messages,
            [conversationId]: sortedMessages,
          },
        }));

        // Mark messages as read when fetching
        await get().markAsRead(conversationId);
      } catch (error: any) {
        console.error('Failed to fetch messages:', error);
        toast.error('Failed to fetch messages');
      }
    },

    loadMoreMessages: async (conversationId: string) => {
      try {
        const existingMessages = get().messages[conversationId] || [];
        if (existingMessages.length === 0) return;

        const oldestMessage = existingMessages[0];
        
        const { data: messages, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey (
              username,
              avatar_url,
              display_name
            )
          `)
          .eq('conversation_id', conversationId)
          .lt('created_at', oldestMessage.created_at)
          .order('created_at', { ascending: false })
          .limit(MESSAGES_PER_PAGE);

        if (error) throw error;

        if (messages && messages.length > 0) {
          const sortedMessages = messages.reverse();
          const updatedMessages = [...sortedMessages, ...existingMessages];
          
          // Update cache
          messageCacheManager.setCachedMessages(conversationId, updatedMessages);
          
          set(state => ({
            messages: {
              ...state.messages,
              [conversationId]: updatedMessages,
            },
          }));
        }
      } catch (error: any) {
        console.error('Failed to load more messages:', error);
        toast.error('Failed to load more messages');
      }
    },

    sendMessage: async (conversationId: string, content: string, type: 'text' | 'file' | 'image' = 'text') => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Stop typing when sending message
        await get().stopTyping(conversationId);

        const { data: message, error } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content,
            message_type: type,
            status: 'sent'
          })
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey (
              username,
              avatar_url,
              display_name
            )
          `)
          .single();

        if (error) throw error;

        // Update conversation timestamp
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);

        // Real-time subscription will handle adding the message to the store
      } catch (error: any) {
        console.error('Failed to send message:', error);
        toast.error('Failed to send message');
      }
    },

    editMessage: async (messageId: string, content: string) => {
      try {
        const { error } = await supabase
          .from('messages')
          .update({ 
            content, 
            edited: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', messageId);

        if (error) throw error;
        
        // Real-time subscription will handle the update
      } catch (error: any) {
        console.error('Failed to edit message:', error);
        toast.error('Failed to edit message');
      }
    },

    deleteMessage: async (messageId: string) => {
      try {
        const { error } = await supabase
          .from('messages')
          .delete()
          .eq('id', messageId);

        if (error) throw error;
        
        // Real-time subscription will handle the deletion
      } catch (error: any) {
        console.error('Failed to delete message:', error);
        toast.error('Failed to delete message');
      }
    },

    markAsRead: async (conversationId: string) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Mark all unread messages in this conversation as read
        const { error } = await supabase
          .from('messages')
          .update({ 
            status: 'read',
            updated_at: new Date().toISOString()
          })
          .eq('conversation_id', conversationId)
          .neq('sender_id', user.id)
          .neq('status', 'read');

        if (error) throw error;

        // Update conversation state
        set(state => ({
          conversations: state.conversations.map(conv => 
            conv.id === conversationId 
              ? { ...conv, unread_count: 0 }
              : conv
          )
        }));
      } catch (error: any) {
        console.error('Failed to mark messages as read:', error);
      }
    },

    setActiveConversation: (conversationId: string | null) => {
      set({ activeConversation: conversationId });
      
      // Mark messages as read when setting active conversation
      if (conversationId) {
        get().markAsRead(conversationId);
      }
    },

    addTypingIndicator: (indicator: TypingIndicator) => {
      set(state => {
        const filtered = state.typingIndicators.filter(
          t => !(t.conversationId === indicator.conversationId && t.userId === indicator.userId)
        );
        return {
          typingIndicators: [...filtered, indicator]
        };
      });
    },

    removeTypingIndicator: (conversationId: string, userId: string) => {
      set(state => ({
        typingIndicators: state.typingIndicators.filter(
          t => !(t.conversationId === conversationId && t.userId === userId)
        )
      }));
    },

    createConversation: async (participantId: string): Promise<string> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Check if conversation already exists
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .or(`and(participant_one.eq.${user.id},participant_two.eq.${participantId}),and(participant_one.eq.${participantId},participant_two.eq.${user.id})`)
          .maybeSingle();

        if (existingConv) {
          return existingConv.id;
        }

        // Create new conversation
        const { data: conversation, error } = await supabase
          .from('conversations')
          .insert({
            participant_one: user.id,
            participant_two: participantId
          })
          .select('id')
          .single();

        if (error) throw error;

        // Refresh conversations
        await get().fetchConversations();

        return conversation.id;
      } catch (error: any) {
        console.error('Failed to create conversation:', error);
        toast.error('Failed to create conversation');
        throw error;
      }
    },

    subscribeToRealtime: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;
        if (!user) return;
        
        currentUserId = user.id;
        set({ connectionStatus: 'connected' });

        // Subscribe to messages
        messageChannel = createRealtimeSubscription(
          'messages',
          undefined,
          // onInsert
          (payload) => {
            const newMessage = payload.new;
            set(state => {
              const conversationMessages = state.messages[newMessage.conversation_id] || [];
              
              // Add sender profile info
              const messageWithSender = {
                ...newMessage,
                sender: {
                  username: 'Unknown',
                  avatar_url: undefined,
                  display_name: undefined
                }
              };

              return {
                messages: {
                  ...state.messages,
                  [newMessage.conversation_id]: [...conversationMessages, messageWithSender]
                }
              };
            });

            // Update conversation timestamp and refresh conversations
            get().fetchConversations();
          },
          // onUpdate
          (payload) => {
            const updatedMessage = payload.new;
            set(state => {
              const conversationMessages = state.messages[updatedMessage.conversation_id] || [];
              return {
                messages: {
                  ...state.messages,
                  [updatedMessage.conversation_id]: conversationMessages.map(msg =>
                    msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
                  )
                }
              };
            });
          },
          // onDelete
          (payload) => {
            const deletedMessage = payload.old;
            set(state => {
              const conversationMessages = state.messages[deletedMessage.conversation_id] || [];
              return {
                messages: {
                  ...state.messages,
                  [deletedMessage.conversation_id]: conversationMessages.filter(msg => msg.id !== deletedMessage.id)
                }
              };
            });
          }
        );

        // Subscribe to typing indicators
        typingChannel = createRealtimeSubscription(
          'typing_indicators',
          undefined,
          // onInsert
          (payload) => {
            const indicator = payload.new;
            if (indicator.user_id !== currentUserId) {
              get().addTypingIndicator({
                conversationId: indicator.conversation_id,
                userId: indicator.user_id,
                username: indicator.username,
                timestamp: Date.now()
              });
            }
          },
          // onUpdate
          (payload) => {
            const indicator = payload.new;
            if (indicator.user_id !== currentUserId) {
              get().addTypingIndicator({
                conversationId: indicator.conversation_id,
                userId: indicator.user_id,
                username: indicator.username,
                timestamp: Date.now()
              });
            }
          },
          // onDelete
          (payload) => {
            const indicator = payload.old;
            get().removeTypingIndicator(indicator.conversation_id, indicator.user_id);
          }
        );

        // Subscribe to conversation updates
        conversationChannel = createRealtimeSubscription(
          'conversations',
          `participant_one=eq.${user.id},participant_two=eq.${user.id}`,
          // onInsert
          () => {
            get().fetchConversations();
          },
          // onUpdate
          () => {
            get().fetchConversations();
          },
          // onDelete
          () => {
            get().fetchConversations();
          }
        );

        // Subscribe to profile updates (for online status)
        profileChannel = createRealtimeSubscription(
          'profiles',
          undefined,
          undefined,
          // onUpdate
          (payload) => {
            const updatedProfile = payload.new;
            set(state => ({
              conversations: state.conversations.map(conv => 
                conv.other_participant?.id === updatedProfile.id
                  ? {
                      ...conv,
                      other_participant: {
                        ...conv.other_participant,
                        status: updatedProfile.status
                      }
                    }
                  : conv
              )
            }));
          },
          undefined
        );

        // Set user as online
        get().setUserOnline();
      } catch (error: any) {
        console.error('Failed to subscribe to realtime:', error);
        set({ connectionStatus: 'disconnected' });
      }
    },

    unsubscribeFromRealtime: () => {
      if (messageChannel) {
        supabase.removeChannel(messageChannel);
        messageChannel = null;
      }
      if (typingChannel) {
        supabase.removeChannel(typingChannel);
        typingChannel = null;
      }
      if (conversationChannel) {
        supabase.removeChannel(conversationChannel);
        conversationChannel = null;
      }
      if (profileChannel) {
        supabase.removeChannel(profileChannel);
        profileChannel = null;
      }
      
      // Clear typing timeouts
      typingTimeouts.forEach(timeout => clearTimeout(timeout));
      typingTimeouts.clear();
      
      // Set user as offline
      get().setUserOffline();
      
      set({ connectionStatus: 'disconnected', typingIndicators: [] });
    },

    hasMoreMessages: (conversationId: string) => {
      const messages = get().messages[conversationId] || [];
      return messages.length >= MESSAGES_PER_PAGE && messages.length % MESSAGES_PER_PAGE === 0;
    },

    startTyping: async (conversationId: string) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get user profile for username
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (!profile) return;

        // Upsert typing indicator
        await supabase
          .from('typing_indicators')
          .upsert({
            conversation_id: conversationId,
            user_id: user.id,
            username: profile.username,
            updated_at: new Date().toISOString()
          });

        // Clear existing timeout
        const timeoutKey = `${conversationId}-${user.id}`;
        if (typingTimeouts.has(timeoutKey)) {
          clearTimeout(typingTimeouts.get(timeoutKey));
        }

        // Set timeout to auto-stop typing
        const timeout = setTimeout(async () => {
          await get().stopTyping(conversationId);
        }, 3000);
        
        typingTimeouts.set(timeoutKey, timeout);
      } catch (error: any) {
        console.error('Failed to start typing:', error);
      }
    },

    stopTyping: async (conversationId: string) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Delete typing indicator
        await supabase
          .from('typing_indicators')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id);

        // Clear timeout
        const timeoutKey = `${conversationId}-${user.id}`;
        if (typingTimeouts.has(timeoutKey)) {
          clearTimeout(typingTimeouts.get(timeoutKey));
          typingTimeouts.delete(timeoutKey);
        }
      } catch (error: any) {
        console.error('Failed to stop typing:', error);
      }
    },
  };
});