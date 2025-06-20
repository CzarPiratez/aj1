import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { LandingPage } from '@/components/landing/LandingPage';
import { AuthenticatedLayout } from '@/components/@authenticated/layout';
import { Toaster } from 'sonner';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error getting session:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Show loading screen
  if (loading) {
    return (
      <div 
        className="h-screen w-screen flex items-center justify-center"
        style={{ backgroundColor: '#F9F7F4' }}
      >
        <div className="text-center">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto"
            style={{ backgroundColor: '#D5765B' }}
          >
            <div 
              className="w-8 h-8 rounded-lg animate-pulse"
              style={{ backgroundColor: '#FFFFFF' }}
            ></div>
          </div>
          <p 
            className="font-light text-lg"
            style={{ color: '#66615C' }}
          >
            Loading AidJobs...
          </p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="h-screen w-screen overflow-hidden">
        {user ? (
          <AuthenticatedLayout user={user} />
        ) : (
          <LandingPage />
        )}
        
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#FFFFFF',
              border: '1px solid #D8D5D2',
              borderRadius: '12px',
              color: '#3A3936',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;