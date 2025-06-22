import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Database, 
  User, 
  Key, 
  RefreshCw, 
  Trash2, 
  RotateCcw,
  Copy,
  Eye,
  EyeOff,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AuthDebugInfo {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseProjectRef: string;
  hasSession: boolean;
  userEmail?: string;
  authToken?: string;
}

export function AuthDebugResetPage() {
  const [debugInfo, setDebugInfo] = useState<AuthDebugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullKey, setShowFullKey] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Check if user is authorized
  const isAuthorized = user?.email === 'mir.m@outlook.com';

  const loadDebugInfo = async () => {
    setLoading(true);
    try {
      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
      }

      // Extract project ref from URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      const projectRefMatch = supabaseUrl.match(/https:\/\/([a-zA-Z0-9]+)\.supabase\.co/);
      const supabaseProjectRef = projectRefMatch ? projectRefMatch[1] : 'Unknown';

      const info: AuthDebugInfo = {
        supabaseUrl,
        supabaseAnonKey,
        supabaseProjectRef,
        hasSession: !!session,
        userEmail: session?.user?.email,
        authToken: session?.access_token,
      };

      setDebugInfo(info);
    } catch (error) {
      console.error('Error loading debug info:', error);
      toast.error('Failed to load debug information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebugInfo();
  }, []);

  const handleRefreshSession = () => {
    loadDebugInfo();
    toast.success('Session info refreshed');
  };

  const handleClearAuthSession = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('supabase.') ||
          key.startsWith('aidjobs_') ||
          key.includes('auth') ||
          key.includes('session') ||
          key.includes('token')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear sessionStorage
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (
          key.startsWith('supabase.') ||
          key.startsWith('aidjobs_') ||
          key.includes('auth') ||
          key.includes('session') ||
          key.includes('token')
        )) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
      
      toast.success('Auth session cleared successfully');
      
      // Refresh debug info
      setTimeout(() => {
        loadDebugInfo();
      }, 500);
    } catch (error) {
      console.error('Error clearing auth session:', error);
      toast.error('Failed to clear auth session');
    }
  };

  const handleForceResetApp = async () => {
    try {
      await handleClearAuthSession();
      toast.success('App reset complete, reloading...');
      
      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error resetting app:', error);
      toast.error('Failed to reset app');
    }
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const obfuscateKey = (key: string) => {
    if (!key || key.length <= 10) return key;
    return key.substring(0, 6) + '*'.repeat(key.length - 10) + key.substring(key.length - 4);
  };

  // Show unauthorized message if user is not authorized
  if (!loading && !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F9F7F4' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: '#D5765B' }}
          >
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-medium mb-4" style={{ color: '#3A3936' }}>
            Access Restricted
          </h1>
          <p className="text-lg mb-6" style={{ color: '#66615C' }}>
            This page is only accessible to authorized users.
          </p>
          <Button
            onClick={() => window.location.href = '/'}
            className="text-white"
            style={{ backgroundColor: '#D5765B' }}
          >
            Return to Home
          </Button>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F9F7F4' }}>
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: '#D5765B' }} />
          <p style={{ color: '#66615C' }}>Loading debug information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F9F7F4' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: '#D5765B' }}
              >
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-medium" style={{ color: '#3A3936' }}>
                  🔐 Auth Debug & Reset
                </h1>
                <p className="text-lg" style={{ color: '#66615C' }}>
                  Internal control panel for authentication debugging
                </p>
              </div>
            </div>
            
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="rounded-xl shadow-sm"
            >
              Return to App
            </Button>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Supabase Project Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-lg rounded-2xl border-0">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Database className="w-6 h-6 mr-3" style={{ color: '#D5765B' }} />
                  Supabase Project Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium block mb-2" style={{ color: '#3A3936' }}>
                    Supabase Project URL
                  </label>
                  <div className="flex items-center space-x-3">
                    <code className="flex-1 p-3 rounded-xl bg-gray-50 text-sm font-mono border">
                      {debugInfo?.supabaseUrl}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyToClipboard(debugInfo?.supabaseUrl || '', 'Project URL')}
                      className="rounded-xl"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2" style={{ color: '#3A3936' }}>
                    Supabase Anon Key
                  </label>
                  <div className="flex items-center space-x-3">
                    <code className="flex-1 p-3 rounded-xl bg-gray-50 text-sm font-mono border">
                      {showFullKey ? debugInfo?.supabaseAnonKey : obfuscateKey(debugInfo?.supabaseAnonKey || '')}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowFullKey(!showFullKey)}
                      className="rounded-xl"
                    >
                      {showFullKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyToClipboard(debugInfo?.supabaseAnonKey || '', 'Anon Key')}
                      className="rounded-xl"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2" style={{ color: '#3A3936' }}>
                    Supabase Project Ref
                  </label>
                  <div className="flex items-center space-x-3">
                    <code className="flex-1 p-3 rounded-xl bg-gray-50 text-sm font-mono border">
                      {debugInfo?.supabaseProjectRef}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyToClipboard(debugInfo?.supabaseProjectRef || '', 'Project Ref')}
                      className="rounded-xl"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Session Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="shadow-lg rounded-2xl border-0">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <User className="w-6 h-6 mr-3" style={{ color: '#D5765B' }} />
                  Session Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: '#3A3936' }}>
                    Supabase Session Exists
                  </span>
                  <div className="flex items-center space-x-2">
                    {debugInfo?.hasSession ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <Badge 
                      variant={debugInfo?.hasSession ? 'default' : 'destructive'}
                      className="rounded-lg"
                    >
                      {debugInfo?.hasSession ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>

                {debugInfo?.userEmail && (
                  <div>
                    <label className="text-sm font-medium block mb-2" style={{ color: '#3A3936' }}>
                      Logged-in User Email
                    </label>
                    <code className="block p-3 rounded-xl bg-gray-50 text-sm font-mono border">
                      {debugInfo.userEmail}
                    </code>
                  </div>
                )}

                {debugInfo?.authToken && (
                  <div>
                    <label className="text-sm font-medium block mb-2" style={{ color: '#3A3936' }}>
                      Auth Token (last 6 characters)
                    </label>
                    <code className="block p-3 rounded-xl bg-gray-50 text-sm font-mono border">
                      ...{debugInfo.authToken.slice(-6)}
                    </code>
                  </div>
                )}

                {!debugInfo?.hasSession && (
                  <div className="flex items-center space-x-3 p-4 rounded-xl" style={{ backgroundColor: '#FEF3CD' }}>
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <span className="text-sm" style={{ color: '#92400E' }}>
                      No active session found
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <Card className="shadow-lg rounded-2xl border-0">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <Key className="w-6 h-6 mr-3" style={{ color: '#D5765B' }} />
                Control Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <Button
                  onClick={handleRefreshSession}
                  variant="outline"
                  className="h-16 rounded-xl shadow-sm flex flex-col items-center justify-center space-y-2"
                >
                  <RefreshCw className="w-6 h-6" style={{ color: '#D5765B' }} />
                  <span className="text-sm font-medium">🔁 Refresh Session Info</span>
                </Button>

                <Button
                  onClick={handleClearAuthSession}
                  variant="outline"
                  className="h-16 rounded-xl shadow-sm flex flex-col items-center justify-center space-y-2 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="w-6 h-6 text-red-600" />
                  <span className="text-sm font-medium text-red-600">🚫 Clear Auth Session</span>
                </Button>

                <Button
                  onClick={handleForceResetApp}
                  variant="outline"
                  className="h-16 rounded-xl shadow-sm flex flex-col items-center justify-center space-y-2 border-red-300 hover:bg-red-100"
                >
                  <RotateCcw className="w-6 h-6 text-red-700" />
                  <span className="text-sm font-medium text-red-700">🧼 Force Reset App</span>
                </Button>
              </div>

              <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: '#F1EFEC' }}>
                <h4 className="font-medium mb-2" style={{ color: '#3A3936' }}>
                  Action Descriptions:
                </h4>
                <ul className="space-y-1 text-sm" style={{ color: '#66615C' }}>
                  <li>• <strong>Refresh Session Info:</strong> Reloads all authentication and project information</li>
                  <li>• <strong>Clear Auth Session:</strong> Signs out and clears localStorage/sessionStorage</li>
                  <li>• <strong>Force Reset App:</strong> Clears all auth data and reloads the entire page</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}