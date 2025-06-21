import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { LandingPage } from '@/components/landing/LandingPage';
import { AuthenticatedLayout } from '@/components/@authenticated/layout';
import { Toaster } from 'sonner';
import { toast } from 'sonner';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const lastAuthEventRef = useRef<string | null>(null);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        console.log('🔄 Attempting to get Supabase session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Supabase session error:', error);
          toast.error(`Supabase connection error: ${error.message}`, {
            description: 'Please check your environment variables and try refreshing the page.',
            duration: 10000,
          });
          throw error;
        }
        
        console.log('✅ Supabase session retrieved successfully');
        setUser(session?.user ?? null);
        setInitialLoad(false);
      } catch (error) {
        console.error('❌ Error getting session:', error);
        
        // Show detailed error message to user
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        toast.error('Failed to connect to Supabase', {
          description: `Error: ${errorMessage}. Please check the console for more details and verify your Supabase configuration.`,
          duration: 15000,
        });
        
        setUser(null);
        setInitialLoad(false);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth event:', event, 'Session exists:', !!session);
        
        try {
          const newUser = session?.user ?? null;
          setUser(newUser);
          setLoading(false);
          
          // Only show toast messages for actual auth events, not session validations
          // and only after the initial load is complete
          if (!initialLoad && event !== 'TOKEN_REFRESHED') {
            // Prevent duplicate toasts for the same event
            const eventKey = `${event}-${newUser?.id || 'none'}`;
            if (lastAuthEventRef.current !== eventKey) {
              lastAuthEventRef.current = eventKey;
              
              if (event === 'SIGNED_IN' && newUser) {
                toast.success('Successfully signed in!');
              } else if (event === 'SIGNED_OUT') {
                toast.success('Successfully signed out!');
                // Clear the last event when signing out
                lastAuthEventRef.current = null;
              }
            }
          }
        } catch (error) {
          console.error('❌ Auth state change error:', error);
          toast.error('Authentication error occurred', {
            description: 'Please try refreshing the page.',
            duration: 8000,
          });
        }
      }
    );

    return () => {
      console.log('🧹 Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, [initialLoad]);

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
          <p 
            className="font-light text-sm mt-2 opacity-75"
            style={{ color: '#66615C' }}
          >
            Connecting to Supabase...
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
            error: {
              style: {
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
              },
            },
            success: {
              style: {
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                color: '#166534',
              },
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;