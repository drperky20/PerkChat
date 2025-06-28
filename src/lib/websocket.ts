import { io, Socket } from 'socket.io-client';

interface TypingData {
  conversationId: string;
  userId: string;
  username: string;
  timestamp: number;
}

interface MessageData {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'file' | 'image';
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
  sender?: {
    username: string;
    avatar_url?: string;
    display_name?: string;
  };
}

interface MessageStatusUpdate {
  messageId: string;
  status: 'delivered' | 'read';
  conversationId: string;
  timestamp: number;
}

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

interface UserPresence {
  userId: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: number;
}

class WebSocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageQueue: any[] = [];
  private isConnected = false;
  private userId: string | null = null;
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionQuality: 'excellent' | 'good' | 'poor' | 'offline' = 'offline';
  private latency = 0;

  // Event handlers
  private onMessageReceived: ((message: MessageData) => void) | null = null;
  private onTypingStart: ((data: TypingData) => void) | null = null;
  private onTypingStop: ((data: TypingData) => void) | null = null;
  private onMessageStatusUpdate: ((data: MessageStatusUpdate) => void) | null = null;
  private onUserPresenceChange: ((data: UserPresence) => void) | null = null;
  private onCallReceived: ((call: CallData) => void) | null = null;
  private onCallStatusUpdate: ((call: CallData) => void) | null = null;
  private onConnectionQualityChange: ((quality: 'excellent' | 'good' | 'poor' | 'offline') => void) | null = null;

  async connect(userId: string, supabaseUrl: string, supabaseKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected && this.userId === userId) {
        resolve();
        return;
      }

      this.userId = userId;
      this.simulateWebSocketConnection(userId);
      resolve();
    });
  }

  private simulateWebSocketConnection(userId: string) {
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.connectionQuality = 'excellent';
    this.latency = 50 + Math.random() * 100; // Simulate 50-150ms latency
    
    if (this.onConnectionQualityChange) {
      this.onConnectionQualityChange(this.connectionQuality);
    }
    
    this.processMessageQueue();
    this.startHeartbeat();
    
    // Simulate periodic connection quality changes
    setInterval(() => {
      this.updateConnectionQuality();
    }, 10000);
    
    // Simulate periodic connection checks
    setInterval(() => {
      if (!this.isConnected && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect();
      }
    }, 5000);

    console.log(`WebSocket connected for user: ${userId}`);
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        const start = Date.now();
        this.emit('ping', { timestamp: start });
        
        // Simulate pong response
        setTimeout(() => {
          this.latency = Date.now() - start;
          this.updateConnectionQuality();
        }, 20 + Math.random() * 80);
      }
    }, 30000);
  }

  private updateConnectionQuality() {
    let newQuality: 'excellent' | 'good' | 'poor' | 'offline';
    
    if (!this.isConnected) {
      newQuality = 'offline';
    } else if (this.latency < 100) {
      newQuality = 'excellent';
    } else if (this.latency < 300) {
      newQuality = 'good';
    } else {
      newQuality = 'poor';
    }

    if (newQuality !== this.connectionQuality) {
      this.connectionQuality = newQuality;
      if (this.onConnectionQualityChange) {
        this.onConnectionQualityChange(newQuality);
      }
    }
  }

  private attemptReconnect() {
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.userId) {
        this.isConnected = true;
        this.connectionQuality = 'good';
        this.processMessageQueue();
        if (this.onConnectionQualityChange) {
          this.onConnectionQualityChange(this.connectionQuality);
        }
        console.log('Reconnected successfully');
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private processMessageQueue() {
    const batchSize = 10;
    let processed = 0;
    
    while (this.messageQueue.length > 0 && this.isConnected && processed < batchSize) {
      const queuedMessage = this.messageQueue.shift();
      this.emit(queuedMessage.event, queuedMessage.data);
      processed++;
    }

    // Process remaining messages in next tick if queue is large
    if (this.messageQueue.length > 0) {
      setTimeout(() => this.processMessageQueue(), 100);
    }
  }

  emit(event: string, data: any) {
    if (!this.isConnected) {
      // Queue message for when connection is restored
      this.messageQueue.push({ event, data, timestamp: Date.now() });
      return;
    }

    // Simulate network delay based on connection quality
    const delay = this.getNetworkDelay();
    
    setTimeout(() => {
      console.log(`WebSocket emit: ${event}`, data);
      this.simulateServerResponse(event, data);
    }, delay);
  }

  private getNetworkDelay(): number {
    switch (this.connectionQuality) {
      case 'excellent': return 10 + Math.random() * 40;
      case 'good': return 50 + Math.random() * 100;
      case 'poor': return 200 + Math.random() * 500;
      default: return 0;
    }
  }

  private simulateServerResponse(event: string, data: any) {
    switch (event) {
      case 'join-conversation':
        setTimeout(() => {
          console.log(`Joined conversation: ${data.conversationId}`);
          // Simulate user presence update
          if (this.onUserPresenceChange) {
            this.onUserPresenceChange({
              userId: this.userId!,
              status: 'online',
              lastSeen: Date.now()
            });
          }
        }, 50);
        break;
        
      case 'send-message':
        setTimeout(() => {
          // Simulate message delivery confirmation
          if (this.onMessageStatusUpdate) {
            this.onMessageStatusUpdate({
              messageId: data.id,
              status: 'delivered',
              conversationId: data.conversation_id,
              timestamp: Date.now()
            });
          }
          
          // Simulate read receipt after a delay
          setTimeout(() => {
            if (this.onMessageStatusUpdate && Math.random() > 0.3) { // 70% chance of read receipt
              this.onMessageStatusUpdate({
                messageId: data.id,
                status: 'read',
                conversationId: data.conversation_id,
                timestamp: Date.now()
              });
            }
          }, 2000 + Math.random() * 8000);
        }, this.getNetworkDelay());
        break;
        
      case 'typing-start':
        // Broadcast typing to other participants
        setTimeout(() => {
          console.log(`User ${data.userId} started typing in ${data.conversationId}`);
        }, 20);
        break;
        
      case 'typing-stop':
        setTimeout(() => {
          console.log(`User ${data.userId} stopped typing in ${data.conversationId}`);
        }, 20);
        break;

      case 'initiate-call':
        setTimeout(() => {
          // Simulate incoming call for other participant
          if (this.onCallReceived) {
            this.onCallReceived({
              id: data.callId,
              conversationId: data.conversationId,
              callerId: data.callerId,
              callerName: data.callerName,
              callerAvatar: data.callerAvatar,
              type: data.type,
              status: 'ringing',
              startTime: Date.now()
            });
          }
        }, this.getNetworkDelay());
        break;

      case 'answer-call':
      case 'reject-call':
      case 'end-call':
        setTimeout(() => {
          if (this.onCallStatusUpdate) {
            this.onCallStatusUpdate({
              id: data.callId,
              conversationId: data.conversationId,
              callerId: data.callerId,
              callerName: data.callerName,
              type: data.type,
              status: event === 'answer-call' ? 'connected' : 'ended',
              startTime: data.startTime,
              endTime: event !== 'answer-call' ? Date.now() : undefined,
              duration: event !== 'answer-call' && data.startTime ? Date.now() - data.startTime : undefined
            });
          }
        }, this.getNetworkDelay());
        break;
    }
  }

  // Enhanced typing indicator with debouncing
  sendTypingIndicator(conversationId: string, isTyping: boolean) {
    if (!this.userId) return;

    const key = `${conversationId}-${this.userId}`;
    
    if (isTyping) {
      // Clear existing timeout
      const existingTimeout = this.typingTimeouts.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Send typing start (debounced)
      this.emit('typing-start', {
        conversationId,
        userId: this.userId,
        timestamp: Date.now()
      });

      // Set timeout to stop typing after 3 seconds of inactivity
      const timeout = setTimeout(() => {
        this.emit('typing-stop', {
          conversationId,
          userId: this.userId,
          timestamp: Date.now()
        });
        this.typingTimeouts.delete(key);
      }, 3000);

      this.typingTimeouts.set(key, timeout);
    } else {
      // Immediately stop typing
      const existingTimeout = this.typingTimeouts.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        this.typingTimeouts.delete(key);
      }

      this.emit('typing-stop', {
        conversationId,
        userId: this.userId,
        timestamp: Date.now()
      });
    }
  }

  // Call management methods
  initiateCall(conversationId: string, type: 'audio' | 'video', callerName: string, callerAvatar?: string) {
    const callId = `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.emit('initiate-call', {
      callId,
      conversationId,
      callerId: this.userId,
      callerName,
      callerAvatar,
      type,
      timestamp: Date.now()
    });

    return callId;
  }

  answerCall(callId: string, conversationId: string) {
    this.emit('answer-call', {
      callId,
      conversationId,
      userId: this.userId,
      timestamp: Date.now()
    });
  }

  rejectCall(callId: string, conversationId: string) {
    this.emit('reject-call', {
      callId,
      conversationId,
      userId: this.userId,
      timestamp: Date.now()
    });
  }

  endCall(callId: string, conversationId: string, startTime?: number) {
    this.emit('end-call', {
      callId,
      conversationId,
      userId: this.userId,
      startTime,
      timestamp: Date.now()
    });
  }

  // Existing methods
  joinConversation(conversationId: string) {
    this.emit('join-conversation', { conversationId, userId: this.userId });
  }

  leaveConversation(conversationId: string) {
    this.emit('leave-conversation', { conversationId, userId: this.userId });
  }

  sendMessage(message: MessageData) {
    this.emit('send-message', message);
  }

  markMessageAsRead(messageId: string, conversationId: string) {
    this.emit('mark-as-read', { messageId, conversationId, userId: this.userId });
  }

  updateUserStatus(status: 'online' | 'offline' | 'away') {
    this.emit('user-status-change', { userId: this.userId, status, timestamp: Date.now() });
  }

  // Event listeners
  onMessage(callback: (message: MessageData) => void) {
    this.onMessageReceived = callback;
  }

  onTyping(
    onStart: (data: TypingData) => void,
    onStop: (data: TypingData) => void
  ) {
    this.onTypingStart = onStart;
    this.onTypingStop = onStop;
  }

  onMessageStatus(callback: (data: MessageStatusUpdate) => void) {
    this.onMessageStatusUpdate = callback;
  }

  onUserPresence(callback: (data: UserPresence) => void) {
    this.onUserPresenceChange = callback;
  }

  onCall(
    onReceived: (call: CallData) => void,
    onStatusUpdate: (call: CallData) => void
  ) {
    this.onCallReceived = onReceived;
    this.onCallStatusUpdate = onStatusUpdate;
  }

  onConnectionQuality(callback: (quality: 'excellent' | 'good' | 'poor' | 'offline') => void) {
    this.onConnectionQualityChange = callback;
  }

  // Utility methods
  getConnectionStatus(): 'connected' | 'disconnected' | 'reconnecting' {
    if (!this.isConnected) {
      return this.reconnectAttempts > 0 ? 'reconnecting' : 'disconnected';
    }
    return 'connected';
  }

  getConnectionQuality(): 'excellent' | 'good' | 'poor' | 'offline' {
    return this.connectionQuality;
  }

  getLatency(): number {
    return this.latency;
  }

  getQueuedMessageCount(): number {
    return this.messageQueue.length;
  }

  disconnect() {
    // Clear all timeouts
    this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
    this.typingTimeouts.clear();
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.userId) {
      this.emit('user-disconnect', { userId: this.userId, timestamp: Date.now() });
    }
    
    this.isConnected = false;
    this.socket = null;
    this.userId = null;
    this.messageQueue = [];
    this.connectionQuality = 'offline';
    
    // Clear event handlers
    this.onMessageReceived = null;
    this.onTypingStart = null;
    this.onTypingStop = null;
    this.onMessageStatusUpdate = null;
    this.onUserPresenceChange = null;
    this.onCallReceived = null;
    this.onCallStatusUpdate = null;
    this.onConnectionQualityChange = null;
  }
}

export const webSocketManager = new WebSocketManager();