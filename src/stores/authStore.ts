import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

interface Profile {
  id: string;
  email: string;
  username: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  status: 'online' | 'offline' | 'away';
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isLoading: false,
      loading: true,
      isAuthenticated: false,

      initialize: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            set({ user: session.user, isAuthenticated: true });
            await get().fetchProfile();
          }
        } catch (error) {
          console.error('Initialize error:', error);
        } finally {
          set({ loading: false });
        }
      },

      signIn: async (email: string, password: string) => {
        console.log('SignIn called with:', { email, password: '***' });
        
        if (!email || !password) {
          throw new Error('Email and password are required');
        }

        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

          console.log('Supabase signIn response:', { data, error });

          if (error) {
            console.error('Supabase auth error:', error);
            throw error;
          }

          if (!data.user) {
            throw new Error('No user returned from authentication');
          }

          set({ 
            user: data.user, 
            isAuthenticated: true,
            isLoading: false 
          });

          await get().fetchProfile();
          toast.success('Welcome back!');
        } catch (error: any) {
          console.error('SignIn error:', error);
          const errorMessage = error.message || 'Failed to sign in';
          toast.error(errorMessage);
          set({ isLoading: false });
          throw new Error(errorMessage);
        }
      },

      signUp: async (email: string, password: string, username: string) => {
        console.log('SignUp called with:', { email, username, password: '***' });
        
        if (!email || !password || !username) {
          throw new Error('Email, password, and username are required');
        }

        // Validate email format
        const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
        if (!emailRegex.test(email)) {
          throw new Error('Please enter a valid email address');
        }

        // Validate password strength
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }

        // Validate username
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(username) || username.length < 3) {
          throw new Error('Username must be at least 3 characters and contain only letters, numbers, and underscores');
        }

        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                username: username.trim(),
              },
            },
          });

          console.log('Supabase signUp response:', { data, error });

          if (error) {
            console.error('Supabase auth error:', error);
            throw error;
          }

          if (data.user) {
            // Create profile
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                email: email.trim(),
                username: username.trim(),
                status: 'offline',
              });

            if (profileError) {
              console.error('Profile creation error:', profileError);
              throw profileError;
            }

            // If user is immediately confirmed, set auth state
            if (data.user.email_confirmed_at) {
              set({ 
                user: data.user, 
                isAuthenticated: true,
                isLoading: false 
              });
              await get().fetchProfile();
              toast.success('Account created successfully!');
            } else {
              set({ isLoading: false });
              toast.success('Account created! Please check your email to verify.');
            }
          } else {
            set({ isLoading: false });
            toast.success('Account created! Please check your email to verify.');
          }
        } catch (error: any) {
          console.error('SignUp error:', error);
          const errorMessage = error.message || 'Failed to create account';
          toast.error(errorMessage);
          set({ isLoading: false });
          throw new Error(errorMessage);
        }
      },

      signOut: async () => {
        try {
          const { error } = await supabase.auth.signOut();
          
          // Always clear local state regardless of server response
          set({ 
            user: null, 
            profile: null, 
            isAuthenticated: false 
          });

          if (error) {
            console.warn('Server signout error (user logged out locally):', error);
            toast.success('Signed out successfully (local session cleared)');
          } else {
            toast.success('Signed out successfully');
          }
        } catch (error: any) {
          console.error('SignOut error:', error);
          // Still clear local state even if server call fails
          set({ 
            user: null, 
            profile: null, 
            isAuthenticated: false 
          });
          toast.success('Signed out successfully (local session cleared)');
        }
      },

      resetPassword: async (email: string) => {
        if (!email) {
          throw new Error('Email is required');
        }

        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
          if (error) throw error;
          toast.success('Password reset email sent!');
        } catch (error: any) {
          console.error('Reset password error:', error);
          const errorMessage = error.message || 'Failed to send reset email';
          toast.error(errorMessage);
          throw new Error(errorMessage);
        }
      },

      updateProfile: async (updates: Partial<Profile>) => {
        const { user } = get();
        if (!user) {
          throw new Error('No user logged in');
        }

        try {
          const { error } = await supabase
            .from('profiles')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', user.id);

          if (error) throw error;

          set(state => ({
            profile: state.profile ? { ...state.profile, ...updates } : null
          }));

          toast.success('Profile updated successfully');
        } catch (error: any) {
          console.error('Update profile error:', error);
          const errorMessage = error.message || 'Failed to update profile';
          toast.error(errorMessage);
          throw new Error(errorMessage);
        }
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },

      setProfile: (profile: Profile | null) => {
        set({ profile });
      },

      fetchProfile: async () => {
        try {
          const { user } = get();
          if (!user) {
            return;
          }

          const { data, error, status } = await supabase
            .from('profiles')
            .select(`*`)
            .eq('id', user.id)
            .single();
          
          if (error && status !== 406) {
            throw error;
          }

          if (data) {
            set({ profile: data });
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Initialize auth state
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session?.user?.id);
  const { setUser, fetchProfile } = useAuthStore.getState();
  
  if (session?.user) {
    setUser(session.user);
    fetchProfile();
  } else {
    setUser(null);
  }
});