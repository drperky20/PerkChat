import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Contact {
  id: string;
  user_id: string;
  contact_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  updated_at: string;
  contact_profile: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    status: 'online' | 'offline' | 'away';
    email: string;
  };
}

interface ContactState {
  contacts: Contact[];
  pendingRequests: Contact[];
  blockedUsers: Contact[];
  isLoading: boolean;
  
  // Actions
  fetchContacts: () => Promise<void>;
  sendFriendRequest: (username: string) => Promise<void>;
  acceptFriendRequest: (contactId: string) => Promise<void>;
  rejectFriendRequest: (contactId: string) => Promise<void>;
  blockUser: (contactId: string) => Promise<void>;
  unblockUser: (contactId: string) => Promise<void>;
  searchUsers: (query: string) => Promise<any[]>;
}

export const useContactStore = create<ContactState>((set, get) => ({
  contacts: [],
  pendingRequests: [],
  blockedUsers: [],
  isLoading: false,

  fetchContacts: async () => {
    set({ isLoading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch accepted contacts
      const { data: acceptedContacts, error: contactsError } = await supabase
        .from('contacts')
        .select(`
          *,
          contact_profile:contact_id (
            id,
            username,
            display_name,
            avatar_url,
            status,
            email
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (contactsError) throw contactsError;

      // Fetch pending requests (incoming)
      const { data: pendingContacts, error: pendingError } = await supabase
        .from('contacts')
        .select(`
          *,
          contact_profile:user_id (
            id,
            username,
            display_name,
            avatar_url,
            status,
            email
          )
        `)
        .eq('contact_id', user.id)
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      // Fetch blocked users
      const { data: blockedContacts, error: blockedError } = await supabase
        .from('contacts')
        .select(`
          *,
          contact_profile:contact_id (
            id,
            username,
            display_name,
            avatar_url,
            status,
            email
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'blocked');

      if (blockedError) throw blockedError;

      set({ 
        contacts: acceptedContacts || [],
        pendingRequests: pendingContacts || [],
        blockedUsers: blockedContacts || [],
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Failed to fetch contacts:', error);
      toast.error('Failed to fetch contacts');
      set({ isLoading: false });
    }
  },

  sendFriendRequest: async (username: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Verify current user has a profile
      const { data: currentUserProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!currentUserProfile) {
        throw new Error('Your profile is not set up properly. Please try signing out and back in.');
      }

      // Find user by username
      const { data: targetUser, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (userError) throw userError;
      if (!targetUser) {
        throw new Error('User not found');
      }

      if (targetUser.id === user.id) {
        throw new Error('Cannot add yourself as a contact');
      }

      // Check if contact already exists
      const { data: existingContact, error: existingError } = await supabase
        .from('contacts')
        .select('id, status')
        .or(`and(user_id.eq.${user.id},contact_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},contact_id.eq.${user.id})`)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingContact) {
        if (existingContact.status === 'accepted') {
          throw new Error('User is already in your contacts');
        } else if (existingContact.status === 'pending') {
          throw new Error('Friend request already sent');
        } else if (existingContact.status === 'blocked') {
          throw new Error('Cannot send request to blocked user');
        }
      }

      // Send friend request
      const { error: insertError } = await supabase
        .from('contacts')
        .insert({
          user_id: user.id,
          contact_id: targetUser.id,
          status: 'pending'
        });

      if (insertError) throw insertError;

      toast.success(`Friend request sent to ${username}`);
    } catch (error: any) {
      console.error('Failed to send friend request:', error);
      toast.error(error.message || 'Failed to send friend request');
    }
  },

  acceptFriendRequest: async (contactId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update the contact status to accepted
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ status: 'accepted' })
        .eq('id', contactId);

      if (updateError) throw updateError;

      // Create reciprocal contact relationship
      const contact = get().pendingRequests.find(c => c.id === contactId);
      if (contact) {
        const { error: reciprocalError } = await supabase
          .from('contacts')
          .insert({
            user_id: user.id,
            contact_id: contact.user_id,
            status: 'accepted'
          });

        if (reciprocalError) throw reciprocalError;
      }

      // Refresh contacts
      await get().fetchContacts();
      toast.success('Friend request accepted');
    } catch (error: any) {
      console.error('Failed to accept friend request:', error);
      toast.error('Failed to accept friend request');
    }
  },

  rejectFriendRequest: async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      set(state => ({
        pendingRequests: state.pendingRequests.filter(req => req.id !== contactId),
      }));

      toast.success('Friend request rejected');
    } catch (error: any) {
      console.error('Failed to reject friend request:', error);
      toast.error('Failed to reject friend request');
    }
  },

  blockUser: async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ status: 'blocked' })
        .eq('id', contactId);

      if (error) throw error;

      await get().fetchContacts();
      toast.success('User blocked');
    } catch (error: any) {
      console.error('Failed to block user:', error);
      toast.error('Failed to block user');
    }
  },

  unblockUser: async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      set(state => ({
        blockedUsers: state.blockedUsers.filter(u => u.id !== contactId),
      }));

      toast.success('User unblocked');
    } catch (error: any) {
      console.error('Failed to unblock user:', error);
      toast.error('Failed to unblock user');
    }
  },

  searchUsers: async (query: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, status, email')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .neq('id', user.id)
        .limit(10);

      if (error) throw error;

      return users || [];
    } catch (error: any) {
      console.error('Failed to search users:', error);
      toast.error('Failed to search users');
      return [];
    }
  },
}));