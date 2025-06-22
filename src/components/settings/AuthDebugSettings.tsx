// Auth Debug Settings Component for Settings Page
// Shows Supabase project info and auth token with reset option

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Database, 
  Key, 
  RefreshCw, 
  Trash2, 
  Copy,
  Eye,
  EyeOff,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  getAuthDebugInfo, 
  clearAllAuthData, 
  type AuthDebugInfo 
} from '@/lib/authDebug';
import { toast } from 'sonner';

export function AuthDebugSettings() {
  const [debugInfo, setDebugInfo] = useState<AuthDebugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullToken, setShowFullToken] = useState(false);

  const loadDebugInfo = async () => {
    setLoading(true);
    try {
      const info = await getAuthDebugInfo();
      setDebugInfo(info);
    } catch (error) {
      console.error('Error loading debug info:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebugInfo();
  }, []);

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleResetAuth = async () => {
    if (!confirm('Are you sure you want to reset your authentication? This will sign you out and clear all stored sessions.')) {
      return;
    }
    
    try {
      await clearAllAuthData();
      toast.success('Authentication data reset successfully');
      
      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error resetting auth:', error);
      toast.error('Failed to reset authentication');
    }
  };

  const handleOpenDebugPage = () => {
    window.open('/dev/auth-debug', '_blank');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Shield className="w-5 h-5 mr-2" style={{ color: '#D5765B' }} />
            Authentication Debug
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin" style={{ color: '#D5765B' }} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Shield className="w-5 h-5 mr-2" style={{ color: '#D5765B' }} />
          Authentication Debug
        </CardTitle>
        <p className="text-sm" style={{ color: '#66615C' }}>
          View your Supabase project information and manage authentication
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Project Information */}
        <div>
          <h4 className="font-medium mb-3 flex items-center" style={{ color: '#3A3936' }}>
            <Database className="w-4 h-4 mr-2" />
            Project Information
          </h4>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium" style={{ color: '#3A3936' }}>
                Project ID
              </label>
              <div className="flex items-center space-x-2 mt-1">
                <code className="flex-1 p-2 rounded bg-gray-100 text-sm font-mono">
                  {debugInfo?.currentProjectId || 'Unknown'}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyToClipboard(debugInfo?.currentProjectId || '', 'Project ID')}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium" style={{ color: '#3A3936' }}>
                Project URL
              </label>
              <div className="flex items-center space-x-2 mt-1">
                <code className="flex-1 p-2 rounded bg-gray-100 text-sm font-mono">
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
          </div>
        </div>

        <Separator />

        {/* Session Status */}
        <div>
          <h4 className="font-medium mb-3 flex items-center" style={{ color: '#3A3936' }}>
            <Key className="w-4 h-4 mr-2" />
            Session Status
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: '#3A3936' }}>
                Authentication Status
              </span>
              <Badge variant={debugInfo?.hasSession ? 'default' : 'destructive'}>
                {debugInfo?.hasSession ? 'Authenticated' : 'Not Authenticated'}
              </Badge>
            </div>

            {debugInfo?.userEmail && (
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: '#3A3936' }}>
                  Logged in as
                </span>
                <code className="text-sm font-mono">
                  {debugInfo.userEmail}
                </code>
              </div>
            )}

            {debugInfo?.tokenInfo && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: '#3A3936' }}>
                    Access Token
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowFullToken(!showFullToken)}
                  >
                    {showFullToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                </div>
                <code className="block p-2 rounded bg-gray-100 text-xs font-mono">
                  {showFullToken ? import.meta.env.VITE_SUPABASE_ANON_KEY : debugInfo.tokenInfo.accessToken}
                </code>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div>
          <h4 className="font-medium mb-3" style={{ color: '#3A3936' }}>
            Debug Actions
          </h4>
          
          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={handleOpenDebugPage}
              className="w-full justify-start"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Full Debug Page
            </Button>
            
            <Button
              variant="outline"
              onClick={loadDebugInfo}
              className="w-full justify-start"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Information
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleResetAuth}
              className="w-full justify-start"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Reset Authentication
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}