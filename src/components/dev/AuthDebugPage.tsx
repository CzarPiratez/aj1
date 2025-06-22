// 🔐 Developer Auth Debug Page
// Hidden route for debugging Supabase authentication issues

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Database, 
  User, 
  Key, 
  RefreshCw, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Copy,
  Eye,
  EyeOff,
  Clock,
  Activity,
  Settings,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  getAuthDebugInfo, 
  clearAllAuthData, 
  checkProjectUrlChange,
  updateStoredProjectUrl,
  getAuthDebugLog,
  clearAuthDebugLog,
  type AuthDebugInfo 
} from '@/lib/authDebug';
import { useUserProgress } from '@/hooks/useUserProgress';
import { toast } from 'sonner';

// Correct Supabase project constants
const CORRECT_SUPABASE_URL = 'https://vsactuzdnmbqatvghyli.supabase.co';
const CORRECT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzYWN0dXpkbm1icWF0dmdoeWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxODA3ODYsImV4cCI6MjA2NTc1Njc4Nn0.XwmbGvUS8OQ4-5V-wzs-0yH4lCn8IkdgcyU8mhcc-o8';

export function AuthDebugPage() {
  const [debugInfo, setDebugInfo] = useState<AuthDebugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullKeys, setShowFullKeys] = useState(false);
  const [debugLog, setDebugLog] = useState<any[]>([]);
  const [isResettingProgress, setIsResettingProgress] = useState(false);

  // Get user progress hook for the current user
  const { flags, resetAllProgressFlags } = useUserProgress(debugInfo?.userId);

  const loadDebugInfo = async () => {
    setLoading(true);
    try {
      const info = await getAuthDebugInfo();
      setDebugInfo(info);
      
      const log = getAuthDebugLog();
      setDebugLog(log);
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

  const handleClearAuth = async () => {
    if (!confirm('Are you sure you want to clear ALL authentication data? This will sign you out and clear all stored sessions.')) {
      return;
    }
    
    try {
      await clearAllAuthData();
      toast.success('All authentication data cleared');
      
      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error clearing auth data:', error);
      toast.error('Failed to clear authentication data');
    }
  };

  const handleRefresh = () => {
    loadDebugInfo();
    toast.success('Debug information refreshed');
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleUpdateProjectUrl = () => {
    updateStoredProjectUrl();
    toast.success('Project URL updated in storage');
    loadDebugInfo();
  };

  const handleClearDebugLog = () => {
    clearAuthDebugLog();
    setDebugLog([]);
    toast.success('Debug log cleared');
  };

  const handleResetProgressFlags = async () => {
    if (!debugInfo?.userId) {
      toast.error('No user ID available for progress reset');
      return;
    }

    if (!confirm('Are you sure you want to reset ALL progress flags? This will set all user progress indicators to false and cannot be undone.')) {
      return;
    }

    setIsResettingProgress(true);
    
    try {
      const success = await resetAllProgressFlags();
      
      if (success) {
        toast.success('All progress flags reset successfully');
      } else {
        toast.error('Failed to reset progress flags');
      }
    } catch (error) {
      console.error('Error resetting progress flags:', error);
      toast.error('Failed to reset progress flags');
    } finally {
      setIsResettingProgress(false);
    }
  };

  // Check if current config matches correct values
  const isCorrectConfig = debugInfo?.supabaseUrl === CORRECT_SUPABASE_URL;
  const currentUrl = import.meta.env.VITE_SUPABASE_URL;
  const currentKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

  const urlCheck = checkProjectUrlChange();

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F9F7F4' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#D5765B' }}
              >
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-medium" style={{ color: '#3A3936' }}>
                  🔐 Supabase Auth Debug Tool
                </h1>
                <p className="text-sm" style={{ color: '#66615C' }}>
                  Developer-only authentication debugging and management
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="h-8"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFullKeys(!showFullKeys)}
                className="h-8"
              >
                {showFullKeys ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showFullKeys ? 'Hide' : 'Show'} Keys
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Configuration Status Warning */}
        {!isCorrectConfig && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-red-800 mb-2">Incorrect Supabase Configuration</h3>
                    <p className="text-sm text-red-700 mb-3">
                      Your environment is not using the correct Supabase project. Expected configuration:
                    </p>
                    <div className="bg-red-100 p-3 rounded mb-3">
                      <p className="text-xs font-mono text-red-800">
                        VITE_SUPABASE_URL={CORRECT_SUPABASE_URL}
                      </p>
                      <p className="text-xs font-mono text-red-800">
                        VITE_SUPABASE_ANON_KEY={CORRECT_SUPABASE_ANON_KEY.substring(0, 40)}...
                      </p>
                    </div>
                    <p className="text-sm text-red-700 mb-3">
                      Current: {currentUrl}
                    </p>
                    <Button
                      size="sm"
                      onClick={handleClearAuth}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Clear Auth Data & Update Config
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Project URL Warning */}
        {urlCheck.hasChanged && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-orange-800 mb-2">Project URL Changed</h3>
                    <p className="text-sm text-orange-700 whitespace-pre-line mb-3">
                      {urlCheck.warning}
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={handleUpdateProjectUrl}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        Update Stored URL
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleClearAuth}
                        className="border-orange-300 text-orange-700"
                      >
                        Clear Auth Data
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Supabase Configuration */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Database className="w-5 h-5 mr-2" style={{ color: '#D5765B' }} />
                  Supabase Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium" style={{ color: '#3A3936' }}>
                    Project URL {isCorrectConfig ? '✅' : '❌'}
                  </label>
                  <div className="flex items-center space-x-2 mt-1">
                    <code className={`flex-1 p-2 rounded text-sm font-mono ${isCorrectConfig ? 'bg-green-100' : 'bg-red-100'}`}>
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
                  {debugInfo?.currentProjectId && (
                    <p className="text-xs mt-1" style={{ color: '#66615C' }}>
                      Project ID: {debugInfo.currentProjectId}
                    </p>
                  )}
                  {!isCorrectConfig && (
                    <p className="text-xs mt-1 text-red-600">
                      Expected: {CORRECT_SUPABASE_URL}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium" style={{ color: '#3A3936' }}>
                    Anon Key {currentKey === CORRECT_SUPABASE_ANON_KEY ? '✅' : '❌'}
                  </label>
                  <div className="flex items-center space-x-2 mt-1">
                    <code className={`flex-1 p-2 rounded text-sm font-mono ${currentKey === CORRECT_SUPABASE_ANON_KEY ? 'bg-green-100' : 'bg-red-100'}`}>
                      {showFullKeys ? currentKey : debugInfo?.supabaseAnonKey}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyToClipboard(currentKey || '', 'Anon Key')}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  {currentKey !== CORRECT_SUPABASE_ANON_KEY && (
                    <p className="text-xs mt-1 text-red-600">
                      Key mismatch detected
                    </p>
                  )}
                </div>

                {debugInfo?.lastKnownProjectUrl && (
                  <div>
                    <label className="text-sm font-medium" style={{ color: '#3A3936' }}>
                      Last Known Project URL
                    </label>
                    <code className="block p-2 rounded bg-gray-100 text-sm font-mono mt-1">
                      {debugInfo.lastKnownProjectUrl}
                    </code>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Session Information */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <User className="w-5 h-5 mr-2" style={{ color: '#D5765B' }} />
                  Session Information
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

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: '#3A3936' }}>
                    Session Valid
                  </span>
                  <Badge variant={debugInfo?.sessionValid ? 'default' : 'destructive'}>
                    {debugInfo?.sessionValid ? 'Valid' : 'Invalid'}
                  </Badge>
                </div>

                {debugInfo?.userEmail && (
                  <div>
                    <label className="text-sm font-medium" style={{ color: '#3A3936' }}>
                      User Email
                    </label>
                    <code className="block p-2 rounded bg-gray-100 text-sm font-mono mt-1">
                      {debugInfo.userEmail}
                    </code>
                  </div>
                )}

                {debugInfo?.userId && (
                  <div>
                    <label className="text-sm font-medium" style={{ color: '#3A3936' }}>
                      User ID
                    </label>
                    <div className="flex items-center space-x-2 mt-1">
                      <code className="flex-1 p-2 rounded bg-gray-100 text-sm font-mono">
                        {debugInfo.userId}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyToClipboard(debugInfo.userId || '', 'User ID')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {debugInfo?.authProvider && (
                  <div>
                    <label className="text-sm font-medium" style={{ color: '#3A3936' }}>
                      Auth Provider
                    </label>
                    <Badge variant="outline" className="mt-1">
                      {debugInfo.authProvider}
                    </Badge>
                  </div>
                )}

                {debugInfo?.sessionExpiry && (
                  <div>
                    <label className="text-sm font-medium" style={{ color: '#3A3936' }}>
                      Session Expires
                    </label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Clock className="w-4 h-4" style={{ color: '#66615C' }} />
                      <span className="text-sm" style={{ color: '#66615C' }}>
                        {new Date(debugInfo.sessionExpiry).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Token Information */}
          {debugInfo?.tokenInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Key className="w-5 h-5 mr-2" style={{ color: '#D5765B' }} />
                    Token Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium" style={{ color: '#3A3936' }}>
                      Access Token
                    </label>
                    <code className="block p-2 rounded bg-gray-100 text-sm font-mono mt-1">
                      {debugInfo.tokenInfo.accessToken}
                    </code>
                  </div>

                  <div>
                    <label className="text-sm font-medium" style={{ color: '#3A3936' }}>
                      Refresh Token
                    </label>
                    <code className="block p-2 rounded bg-gray-100 text-sm font-mono mt-1">
                      {debugInfo.tokenInfo.refreshToken}
                    </code>
                  </div>

                  {debugInfo.tokenInfo.expiresAt && (
                    <div>
                      <label className="text-sm font-medium" style={{ color: '#3A3936' }}>
                        Token Expires At
                      </label>
                      <p className="text-sm mt-1" style={{ color: '#66615C' }}>
                        {new Date(debugInfo.tokenInfo.expiresAt * 1000).toLocaleString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* User Progress Flags */}
          {debugInfo?.userId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Activity className="w-5 h-5 mr-2" style={{ color: '#D5765B' }} />
                    User Progress Flags
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(flags).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span style={{ color: '#3A3936' }}>
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        <Badge variant={value ? 'default' : 'outline'} className="text-xs">
                          {value ? 'True' : 'False'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  
                  <Separator />
                  
                  <Button
                    onClick={handleResetProgressFlags}
                    disabled={isResettingProgress}
                    variant="outline"
                    size="sm"
                    className="w-full border-orange-200 text-orange-700 hover:bg-orange-50"
                  >
                    {isResettingProgress ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-600 mr-2"></div>
                        Resetting...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset All Progress Flags
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-center" style={{ color: '#66615C' }}>
                    This will reset all progress indicators to false
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Debug Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Settings className="w-5 h-5 mr-2" style={{ color: '#D5765B' }} />
                  Debug Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleClearAuth}
                  variant="destructive"
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All Auth Data
                </Button>

                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Debug Info
                </Button>

                <Button
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  className="w-full"
                >
                  Return to App
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Debug Log */}
        {debugLog.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-6"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-lg">
                    <Activity className="w-5 h-5 mr-2" style={{ color: '#D5765B' }} />
                    Auth Debug Log ({debugLog.length} events)
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearDebugLog}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Log
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {debugLog.slice().reverse().map((entry, index) => (
                      <div
                        key={index}
                        className="p-3 rounded border"
                        style={{ backgroundColor: '#F9F7F4', borderColor: '#D8D5D2' }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm" style={{ color: '#3A3936' }}>
                            {entry.event}
                          </span>
                          <span className="text-xs" style={{ color: '#66615C' }}>
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {entry.projectId && (
                          <p className="text-xs" style={{ color: '#66615C' }}>
                            Project: {entry.projectId}
                          </p>
                        )}
                        {entry.details && (
                          <pre className="text-xs mt-2 p-2 rounded bg-gray-100 overflow-x-auto">
                            {JSON.stringify(entry.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}