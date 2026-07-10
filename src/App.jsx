import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Analytics } from '@vercel/analytics/react';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import ResumeBuilder from './pages/ResumeBuilder';
import AdminRoute from './components/AdminRoute';

function LogoutRoute() {
  const { signOut } = useAuth();
  React.useEffect(() => {
    signOut().then(() => window.location.href = '/login');
  }, [signOut]);
  return null;
}

// Track Page Views correctly in SPA
function PageTracker() {
  const location = useLocation();

  useEffect(() => {
    const trackPageView = async () => {
      let sessionId = localStorage.getItem('session_id');
      if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('session_id', sessionId);
      }
      
      try {
        const { supabase } = await import('./utils/supabaseClient');
        await supabase.from('page_views').insert([{
          path: location.pathname,
          session_id: sessionId
        }]);
      } catch (err) {
        console.error('Failed to track page view:', err);
      }
    };
    trackPageView();
  }, [location.pathname]);

  return null;
}

export default function App() {
  useEffect(() => {
    // Supabase OAuth often leaves a trailing '#' in the URL after parsing the session token
    const clearHash = () => {
      if (window.location.hash === '') {
        const cleanUrl = window.location.href.replace(/#$/, '');
        if (cleanUrl !== window.location.href) {
          window.history.replaceState(null, '', cleanUrl);
        }
      }
    };

    clearHash();
    window.addEventListener('hashchange', clearHash);
    return () => window.removeEventListener('hashchange', clearHash);
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <PageTracker />
          <Routes>
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/logout" element={<LogoutRoute />} />
            
            <Route 
              path="/admin/dashboard" 
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } 
            />
            
            <Route path="/" element={<ResumeBuilder />} />
            <Route path="/contactcard" element={<ResumeBuilder />} />
            <Route path="/loadprofile" element={<ResumeBuilder />} />
            <Route path="/savedresumes" element={<ResumeBuilder />} />
            <Route path="/credits" element={<ResumeBuilder />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Analytics />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
