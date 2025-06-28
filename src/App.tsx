import React, { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { LoginForm } from './components/auth/LoginForm';
import { SignupForm } from './components/auth/SignupForm';
import { ResetPasswordForm } from './components/auth/ResetPasswordForm';
import { useAuthStore } from './stores/authStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ChatView } from './components/chat/ChatView';

const AppLayout = () => (
  <MainLayout>
    <Outlet />
  </MainLayout>
);

const ChatPlaceholder = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center">
      <p className="text-lg text-gray-500">Select a conversation to start chatting</p>
    </div>
  </div>
);

function App() {
  const { user, loading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <ErrorBoundary>
        <Toaster position="bottom-right" />
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/signup" element={<SignupForm />} />
          <Route path="/reset-password" element={<ResetPasswordForm />} />
          <Route 
            path="/"
            element={user ? <AppLayout /> : <Navigate to="/login" />}
          >
            <Route index element={<ChatPlaceholder />} />
            <Route path="conversation/:conversationId" element={<ChatView />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}

export default App;