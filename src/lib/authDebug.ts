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
  DEBUG_MODE: 'aidjobs_debug_mode',
  AUTH_DEBUG_INFO: 'aidjobs_auth_debug'
};

// Extract project ID from Supabase URL
function extractProjectId(url: string): string {
  try {
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    return match ? match[1] : 'unknown';
  } catch {
    return 'invalid';
  }
}

// Get comprehensive auth debug information
export async function getAuthDebugInfo(): Promise<AuthDebugInfo> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    const debugInfo: AuthDebugInfo = {
      supabaseUrl,
      supabaseAnonKey: supabaseAnonKey.substring(0, 20) + '...',
      hasSession: !!session,
      sessionValid: !!session && !error,
      currentProjectId: extractProjectId(supabaseUrl),
      lastKnownProjectUrl: localStorage.getItem(STORAGE_KEYS.LAST_PROJECT_URL) || undefined
    };

    if (session && session.user) {
      debugInfo.userEmail = session.user.email;
      debugInfo.userId = session.user.id;
      debugInfo.sessionExpiry = new Date(session.expires_at! * 1000).toISOString();
      debugInfo.authProvider = session.user.app_metadata?.provider;
      debugInfo.tokenInfo = {
        accessToken: session.access_token.substring(0, 20) + '...',
        refreshToken: session.refresh_token?.substring(0, 20) + '...' || 'none',
        expiresAt: session.expires_at
      };
    }

    return debugInfo;
  } catch (error) {
    console.error('Error getting auth debug info:', error);
    return {
      supabaseUrl,
      supabaseAnonKey: supabaseAnonKey.substring(0, 20) + '...',
      hasSession: false,
      sessionValid: false,
      currentProjectId: extractProjectId(supabaseUrl)
    };
  }
}

// Clear all authentication data (comprehensive reset)
export async function clearAllAuthData(): Promise<void> {
  try {
    console.log('🧹 Clearing all authentication data...');

    // Sign out from Supabase
    await supabase.auth.signOut();

    // Clear all localStorage items related to Supabase auth
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('supabase.auth.') ||
        key.startsWith('aidjobs_') ||
        key.includes('auth') ||
        key.includes('session')
      )) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ Removed: ${key}`);
    });

    // Clear sessionStorage as well
    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (
        key.startsWith('supabase.auth.') ||
        key.startsWith('aidjobs_') ||
        key.includes('auth')
      )) {
        sessionKeysToRemove.push(key);
      }
    }

    sessionKeysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
      console.log(`🗑️ Removed from session: ${key}`);
    });

    console.log(`✅ Cleared ${keysToRemove.length + sessionKeysToRemove.length} auth-related items`);

  } catch (error) {
    console.error('Error clearing auth data:', error);
    throw error;
  }
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

// Enable debug mode
export function enableDebugMode(): void {
  localStorage.setItem(STORAGE_KEYS.DEBUG_MODE, 'true');
  console.log('🐛 Auth debug mode enabled');
}

// Disable debug mode
export function disableDebugMode(): void {
  localStorage.removeItem(STORAGE_KEYS.DEBUG_MODE);
  console.log('🐛 Auth debug mode disabled');
}

// Check if debug mode is enabled
export function isDebugModeEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEYS.DEBUG_MODE) === 'true';
}