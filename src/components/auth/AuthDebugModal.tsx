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
  CheckCircle,
  XCircle,
  AlertTriangle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Correct Supabase project constants
const CORRECT_SUPABASE_URL = 'https://vsactuzdnmbqatvghyli.supabase.co';
const CORRECT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzYWN0dXpkbm1icWF0dmdoeWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxODA3ODYsImV4cCI6MjA2NTc1Njc4Nn0.XwmbGvUS8OQ4-5V-wzs-0yH4lCn8IkdgcyU8mhcc-o8';

interface AuthDebugInfo {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseProjectRef: string;
  hasSession: boolean;
  userEmail?: string;
  authToken?: string;
}

interface AuthDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthDebugModal({ isOpen, onClose }: AuthDebugModalProps) {
  const [debugInfo, setDebugInfo] = useState<AuthDebugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullKey, setShowFullKey] = useState(false);

  const loadDebugInfo = async () => {
    setLoading(true);
    try {
      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();

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
    if (isOpen) {
      loadDebugInfo();
    }
  }, [isOpen]);

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
      
      // Close modal and reload the page after a short delay
      onClose();
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

  // Check if current config matches correct values
  const isCorrectUrl = debugInfo?.supabaseUrl === CORRECT_SUPABASE_URL;
  const isCorrectKey = debugInfo?.supabaseAnonKey === CORRECT_SUPABASE_ANON_KEY;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Shield className="w-6 h-6 mr-3" style={{ color: '#D5765B' }} />
            🔐 Auth Debug & Reset
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin" style={{ color: '#D5765B' }} />
            </div>
          ) : (
            <div className="space-y-6 p-1">
              {/* Configuration Status Warning */}
              {(!isCorrectUrl || !isCorrectKey) && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-red-800 mb-2">Incorrect Supabase Configuration</h3>
                        <p className="text-sm text-red-700 mb-3">
                          Your environment is not using the correct Supabase project.
                        </p>
                        <div className="bg-red-100 p-2 rounded mb-3">
                          <p className="text-xs font-mono text-red-800">
                            Expected: {CORRECT_SUPABASE_URL}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={handleClearAuthSession}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Clear Auth Data
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Supabase Project Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Database className="w-5 h-5 mr-2" style={{ color: '#D5765B' }} />
                      Supabase Project Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium block mb-2" style={{ color: '#3A3936' }}>
                        Project URL {isCorrectUrl ? '✅' : '❌'}
                      </label>
                      <div className="flex items-center space-x-2">
                        <code className={`flex-1 p-2 rounded text-xs font-mono ${isCorrectUrl ? 'bg-green-100' : 'bg-red-100'}`}>
                          {debugInfo?.supabaseUrl}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyToClipboard(debugInfo?.supabaseUrl || '', 'Project URL')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-2" style={{ color: '#3A3936' }}>
                        Anon Key {isCorrectKey ? '✅' : '❌'}
                      </label>
                      <div className="flex items-center space-x-2">
                        <code className={`flex-1 p-2 rounded text-xs font-mono ${isCorrectKey ? 'bg-green-100' : 'bg-red-100'}`}>
                          {showFullKey ? debugInfo?.supabaseAnonKey : obfuscateKey(debugInfo?.supabaseAnonKey || '')}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowFullKey(!showFullKey)}
                        >
                          {showFullKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyToClipboard(debugInfo?.supabaseAnonKey || '', 'Anon Key')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium block mb-2" style={{ color: '#3A3936' }}>
                        Project Ref
                      </label>
                      <div className="flex items-center space-x-2">
                        <code className="flex-1 p-2 rounded bg-gray-100 text-xs font-mono">
                          {debugInfo?.supabaseProjectRef}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyToClipboard(debugInfo?.supabaseProjectRef || '', 'Project Ref')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Session Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <User className="w-5 h-5 mr-2" style={{ color: '#D5765B' }} />
                      Session Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: '#3A3936' }}>
                        Session Status
                      </span>
                      <div className="flex items-center space-x-2">
                        {debugInfo?.hasSession ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <Badge variant={debugInfo?.hasSession ? 'default' : 'destructive'}>
                          {debugInfo?.hasSession ? 'Active' : 'No Session'}
                        </Badge>
                      </div>
                    </div>

                    {debugInfo?.userEmail && (
                      <div>
                        <label className="text-sm font-medium block mb-2" style={{ color: '#3A3936' }}>
                          User Email
                        </label>
                        <code className="block p-2 rounded bg-gray-100 text-xs font-mono">
                          {debugInfo.userEmail}
                        </code>
                      </div>
                    )}

                    {debugInfo?.authToken && (
                      <div>
                        <label className="text-sm font-medium block mb-2" style={{ color: '#3A3936' }}>
                          Auth Token (last 6 chars)
                        </label>
                        <code className="block p-2 rounded bg-gray-100 text-xs font-mono">
                          ...{debugInfo.authToken.slice(-6)}
                        </code>
                      </div>
                    )}

                    {!debugInfo?.hasSession && (
                      <div className="flex items-center space-x-2 p-3 rounded" style={{ backgroundColor: '#FEF3CD' }}>
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm" style={{ color: '#92400E' }}>
                          No active session found
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Action Buttons */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Key className="w-5 h-5 mr-2" style={{ color: '#D5765B' }} />
                    Control Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <Button
                      onClick={handleRefreshSession}
                      variant="outline"
                      className="h-16 flex flex-col items-center justify-center space-y-2"
                    >
                      <RefreshCw className="w-5 h-5" style={{ color: '#D5765B' }} />
                      <span className="text-sm font-medium">🔁 Refresh</span>
                    </Button>

                    <Button
                      onClick={handleClearAuthSession}
                      variant="outline"
                      className="h-16 flex flex-col items-center justify-center space-y-2 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-medium text-red-600">🚫 Clear Auth</span>
                    </Button>

                    <Button
                      onClick={handleForceResetApp}
                      variant="outline"
                      className="h-16 flex flex-col items-center justify-center space-y-2 border-red-300 hover:bg-red-100"
                    >
                      <RotateCcw className="w-5 h-5 text-red-700" />
                      <span className="text-sm font-medium text-red-700">🧼 Force Reset</span>
                    </Button>
                  </div>

                  <div className="mt-4 p-3 rounded" style={{ backgroundColor: '#F1EFEC' }}>
                    <h4 className="font-medium mb-2 text-sm" style={{ color: '#3A3936' }}>
                      Action Descriptions:
                    </h4>
                    <ul className="space-y-1 text-xs" style={{ color: '#66615C' }}>
                      <li>• <strong>Refresh:</strong> Reloads authentication and project information</li>
                      <li>• <strong>Clear Auth:</strong> Signs out and clears localStorage/sessionStorage</li>
                      <li>• <strong>Force Reset:</strong> Clears all auth data and reloads the page</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}