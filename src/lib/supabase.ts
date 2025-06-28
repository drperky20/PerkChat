import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          username: string;
          display_name?: string;
          bio?: string;
          avatar_url?: string;
          status: 'online' | 'offline' | 'away';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          username: string;
          display_name?: string;
          bio?: string;
          avatar_url?: string;
          status?: 'online' | 'offline' | 'away';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string;
          display_name?: string;
          bio?: string;
          avatar_url?: string;
          status?: 'online' | 'offline' | 'away';
          created_at?: string;
          updated_at?: string;
        };
      };
      contacts: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string;
          status: 'pending' | 'accepted' | 'blocked';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          contact_id: string;
          status?: 'pending' | 'accepted' | 'blocked';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: 'pending' | 'accepted' | 'blocked';
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          participant_one: string;
          participant_two: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          participant_one: string;
          participant_two: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          updated_at?: string;
        };
      };
      messages: {
        Row: {
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
        };
        Insert: {
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type?: 'text' | 'file' | 'image';
          file_url?: string;
          file_name?: string;
          status?: 'sent' | 'delivered' | 'read';
          edited?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          status?: 'sent' | 'delivered' | 'read';
          edited?: boolean;
          updated_at?: string;
        };
      };
      typing_indicators: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          username: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
          username: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          updated_at?: string;
        };
      };
      call_sessions: {
        Row: {
          id: string;
          caller_id: string;
          recipient_id: string;
          conversation_id: string;
          status: 'initiating' | 'ringing' | 'connected' | 'ended' | 'missed' | 'declined';
          created_at: string;
          answered_at?: string;
          ended_at?: string;
          duration?: number;
        };
        Insert: {
          caller_id: string;
          recipient_id: string;
          conversation_id: string;
          status?: 'initiating' | 'ringing' | 'connected' | 'ended' | 'missed' | 'declined';
          created_at?: string;
          answered_at?: string;
          ended_at?: string;
          duration?: number;
        };
        Update: {
          status?: 'initiating' | 'ringing' | 'connected' | 'ended' | 'missed' | 'declined';
          answered_at?: string;
          ended_at?: string;
          duration?: number;
        };
      };
    };
  };
};

// Helper function to create real-time subscriptions with proper error handling
export function createRealtimeSubscription(
  table: string,
  filter?: string,
  onInsert?: (payload: any) => void,
  onUpdate?: (payload: any) => void,
  onDelete?: (payload: any) => void
) {
  let channel = supabase.channel(`${table}-changes`);
  
  if (filter) {
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter },
      (payload) => {
        console.log(`Real-time ${table} change:`, payload);
        switch (payload.eventType) {
          case 'INSERT':
            onInsert?.(payload);
            break;
          case 'UPDATE':
            onUpdate?.(payload);
            break;
          case 'DELETE':
            onDelete?.(payload);
            break;
        }
      }
    );
  } else {
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload) => {
        console.log(`Real-time ${table} change:`, payload);
        switch (payload.eventType) {
          case 'INSERT':
            onInsert?.(payload);
            break;
          case 'UPDATE':
            onUpdate?.(payload);
            break;
          case 'DELETE':
            onDelete?.(payload);
            break;
        }
      }
    );
  }

  channel.subscribe((status) => {
    console.log(`${table} subscription status:`, status);
  });

  return channel;
}