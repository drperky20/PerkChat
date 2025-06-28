interface Message {
  id: string;
  conversation_id: string;
  content: string;
  sender_id: string;
  created_at: string;
  status: 'sent' | 'delivered' | 'read';
}

interface MessageCache {
  [conversationId: string]: {
    messages: Message[];
    lastFetched: number;
    hasMore: boolean;
  };
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MESSAGES_PER_PAGE = 50;

export class MessageCacheManager {
  private cache: MessageCache = {};
  private batchTimeout: NodeJS.Timeout | null = null;
  private pendingUpdates = new Map<string, Partial<Message>>();

  getCachedMessages(conversationId: string): Message[] {
    const cached = this.cache[conversationId];
    if (!cached) return [];
    
    const now = Date.now();
    if (now - cached.lastFetched > CACHE_DURATION) {
      // Cache expired
      return [];
    }
    
    return cached.messages;
  }

  setCachedMessages(conversationId: string, messages: Message[], hasMore = true) {
    this.cache[conversationId] = {
      messages: [...messages].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
      lastFetched: Date.now(),
      hasMore,
    };
  }

  addMessage(conversationId: string, message: Message) {
    const existing = this.cache[conversationId];
    if (!existing) {
      this.cache[conversationId] = {
        messages: [message],
        lastFetched: Date.now(),
        hasMore: true,
      };
      return;
    }

    // Check if message already exists
    const messageExists = existing.messages.some(m => m.id === message.id);
    if (messageExists) return;

    this.cache[conversationId] = {
      ...existing,
      messages: [...existing.messages, message].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
      lastFetched: Date.now(),
    };
  }

  updateMessage(messageId: string, updates: Partial<Message>) {
    // Add to pending updates for batching
    this.pendingUpdates.set(messageId, {
      ...this.pendingUpdates.get(messageId),
      ...updates,
    });

    // Clear existing timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    // Batch updates to avoid excessive re-renders
    this.batchTimeout = setTimeout(() => {
      const updates = new Map(this.pendingUpdates);
      this.pendingUpdates.clear();

      Object.keys(this.cache).forEach(conversationId => {
        const conversation = this.cache[conversationId];
        let hasUpdates = false;
        
        const updatedMessages = conversation.messages.map(message => {
          const messageUpdates = updates.get(message.id);
          if (messageUpdates) {
            hasUpdates = true;
            return { ...message, ...messageUpdates };
          }
          return message;
        });

        if (hasUpdates) {
          this.cache[conversationId] = {
            ...conversation,
            messages: updatedMessages,
          };
        }
      });
    }, 100); // 100ms batch window
  }

  removeMessage(conversationId: string, messageId: string) {
    const existing = this.cache[conversationId];
    if (!existing) return;

    this.cache[conversationId] = {
      ...existing,
      messages: existing.messages.filter(m => m.id !== messageId),
    };
  }

  prependMessages(conversationId: string, messages: Message[]) {
    const existing = this.cache[conversationId];
    if (!existing) {
      this.cache[conversationId] = {
        messages: [...messages].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
        lastFetched: Date.now(),
        hasMore: messages.length === MESSAGES_PER_PAGE,
      };
      return;
    }

    // Merge and deduplicate messages
    const existingIds = new Set(existing.messages.map(m => m.id));
    const newMessages = messages.filter(m => !existingIds.has(m.id));

    this.cache[conversationId] = {
      ...existing,
      messages: [...newMessages, ...existing.messages].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
      hasMore: messages.length === MESSAGES_PER_PAGE,
    };
  }

  hasMoreMessages(conversationId: string): boolean {
    return this.cache[conversationId]?.hasMore ?? true;
  }

  clearCache(conversationId?: string) {
    if (conversationId) {
      delete this.cache[conversationId];
    } else {
      this.cache = {};
    }
  }
}

// Create a singleton instance
export const messageCacheManager = new MessageCacheManager();