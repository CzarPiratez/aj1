// 🔐 Supabase Auth Debug & Reset Tool
// Developer-only utilities for debugging and managing Supabase authentication

import { supabase } from '@/lib/supabase';

export interface AuthDebugInfo {
  supabaseUrl: string;
  supabaseAnonKey: string;
  hasSession: boolean;
  sessionValid: boolean;
  userEmail?: string;
  userId?: string;
  sessionExpiry?: string;
  lastKnownProjectUrl?: string;
  currentProjectId?: string;
  authProvider?: string;
  tokenInfo?: {
    accessToken: string;
    refreshToken: string;
    expiresAt?: number;
  };
}

// Storage keys for tracking project info
const STORAGE_KEYS = {
  LAST_PROJECT_URL: 'aidjobs_last_supabase_url',
  LAST_PROJECT_ID: 'aidjobs_last_project_id',
  AUTH_DEBUG_ENABLED: 'aidjobs_auth_debug_enabled',
};

// Extract project ID from Supabase URL
export function extractProjectId(url: string): string | null {
  try {
    const match = url.match(/https:\/\/([a-zA-Z0-9]+)\.supabase\.co/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// Obfuscate sensitive keys for display
export function obfuscateKey(key: string, visibleChars: number = 8): string {
  if (!key || key.length <= visibleChars) return key;
  const visible = key.substring(0, visibleChars);
  const hidden = '*'.repeat(Math.min(key.length - visibleChars, 20));
  return `${visible}${hidden}`;
}

// Get comprehensive auth debug information
export async function getAuthDebugInfo(): Promise<AuthDebugInfo> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const currentProjectId = extractProjectId(supabaseUrl);
  
  // Get stored project info
  const lastKnownProjectUrl = localStorage.getItem(STORAGE_KEYS.LAST_PROJECT_URL);
  
  let hasSession = false;
  let sessionValid = false;
  let userEmail: string | undefined;
  let userId: string | undefined;
  let sessionExpiry: string | undefined;
  let authProvider: string | undefined;
  let tokenInfo: AuthDebugInfo['tokenInfo'];

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (session && !error) {
      hasSession = true;
      sessionValid = true;
      userEmail = session.user?.email;
      userId = session.user?.id;
      authProvider = session.user?.app_metadata?.provider;
      
      if (session.expires_at) {
        sessionExpiry = new Date(session.expires_at * 1000).toISOString();
      }
      
      tokenInfo = {
        accessToken: obfuscateKey(session.access_token, 12),
        refreshToken: obfuscateKey(session.refresh_token || '', 12),
        expiresAt: session.expires_at,
      };
    } else if (error) {
      console.error('Session validation error:', error);
      sessionValid = false;
    }
  } catch (error) {
    console.error('Error getting session:', error);
    sessionValid = false;
  }

  return {
    supabaseUrl,
    supabaseAnonKey: obfuscateKey(supabaseAnonKey, 12),
    hasSession,
    sessionValid,
    userEmail,
    userId,
    sessionExpiry,
    lastKnownProjectUrl,
    currentProjectId,
    authProvider,
    tokenInfo,
  };
}

// Clear all authentication data and storage
export async function clearAllAuthData(): Promise<void> {
  console.log('🧹 Clearing all authentication data...');
  
  try {
    // Sign out from Supabase
    await supabase.auth.signOut();
    console.log('✅ Supabase session cleared');
  } catch (error) {
    console.error('Error signing out:', error);
  }
  
  // Clear localStorage
  try {
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
    console.log(`✅ Cleared ${keysToRemove.length} localStorage items`);
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
  
  // Clear sessionStorage
  try {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
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
    
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
    console.log(`✅ Cleared ${keysToRemove.length} sessionStorage items`);
  } catch (error) {
    console.error('Error clearing sessionStorage:', error);
  }
  
  console.log('🎉 All authentication data cleared');
}

// Check for project URL changes and warn if different
export function checkProjectUrlChange(): { hasChanged: boolean; warning?: string } {
  const currentUrl = import.meta.env.VITE_SUPABASE_URL;
  const lastKnownUrl = localStorage.getItem(STORAGE_KEYS.LAST_PROJECT_URL);
  
  if (!lastKnownUrl) {
    // First time - store current URL
    localStorage.setItem(STORAGE_KEYS.LAST_PROJECT_URL, currentUrl);
    return { hasChanged: false };
  }
  
  if (currentUrl !== lastKnownUrl) {
    const currentProjectId = extractProjectId(currentUrl);
    const lastProjectId = extractProjectId(lastKnownUrl);
    
    return {
      hasChanged: true,
      warning: `⚠️ Supabase project URL has changed!\n\nPrevious: ${lastKnownUrl} (${lastProjectId})\nCurrent: ${currentUrl} (${currentProjectId})\n\nThis may cause authentication issues. Consider clearing auth data.`
    };
  }
  
  return { hasChanged: false };
}

// Update stored project URL
export function updateStoredProjectUrl(): void {
  const currentUrl = import.meta.env.VITE_SUPABASE_URL;
  localStorage.setItem(STORAGE_KEYS.LAST_PROJECT_URL, currentUrl);
  console.log('📝 Updated stored project URL:', currentUrl);
}

// Auto-cleanup on app load
export async function autoCleanupOnLoad(): Promise<void> {
  console.log('🔍 Running auto-cleanup check...');
  
  try {
    // Check if we have a valid session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.log('🧹 No valid session found, running cleanup...');
      
      // Clear any stale auth data
      await supabase.auth.signOut();
      
      // Clear potentially stale localStorage items
      const authKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('supabase.auth.')) {
          authKeys.push(key);
        }
      }
      
      authKeys.forEach(key => localStorage.removeItem(key));
      
      if (authKeys.length > 0) {
        console.log(`✅ Cleaned up ${authKeys.length} stale auth items`);
      }
    } else {
      console.log('✅ Valid session found, no cleanup needed');
    }
    
    // Check for project URL changes
    const urlCheck = checkProjectUrlChange();
    if (urlCheck.hasChanged && urlCheck.warning) {
      console.warn(urlCheck.warning);
    }
    
  } catch (error) {
    console.error('Error during auto-cleanup:', error);
  }
}

// Log authentication events for debugging
export function logAuthEvent(event: string, details?: any): void {
  const timestamp = new Date().toISOString();
  const projectId = extractProjectId(import.meta.env.VITE_SUPABASE_URL || '');
  
  console.log(`🔐 [${timestamp}] Auth Event: ${event}`, {
    projectId,
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    details,
  });
  
  // Store in localStorage for debugging history
  try {
    const logKey = 'aidjobs_auth_debug_log';
    const existingLog = JSON.parse(localStorage.getItem(logKey) || '[]');
    
    existingLog.push({
      timestamp,
      event,
      projectId,
      details,
    });
    
    // Keep only last 50 events
    const trimmedLog = existingLog.slice(-50);
    localStorage.setItem(logKey, JSON.stringify(trimmedLog));
  } catch (error) {
    console.error('Error storing auth debug log:', error);
  }
}

// Get auth debug log
export function getAuthDebugLog(): any[] {
  try {
    const logKey = 'aidjobs_auth_debug_log';
    return JSON.parse(localStorage.getItem(logKey) || '[]');
  } catch {
    return [];
  }
}

// Clear auth debug log
export function clearAuthDebugLog(): void {
  localStorage.removeItem('aidjobs_auth_debug_log');
  console.log('🗑️ Auth debug log cleared');
}