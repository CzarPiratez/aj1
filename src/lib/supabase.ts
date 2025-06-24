import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Supabase Config Check:', {
  url: supabaseUrl ? `✅ Set (${supabaseUrl})` : '❌ Missing VITE_SUPABASE_URL',
  key: supabaseAnonKey ? `✅ Set (${supabaseAnonKey.substring(0, 20)}...)` : '❌ Missing VITE_SUPABASE_ANON_KEY',
  envVars: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
});

// Expected correct values
const EXPECTED_URL = 'https://vsactuzdnmbqatvghyli.supabase.co';
const EXPECTED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzYWN0dXpkbm1icWF0dmdoeWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxODA3ODYsImV4cCI6MjA2NTc1Njc4Nn0.XwmbGvUS8OQ4-5V-wzs-0yH4lCn8IkdgcyU8mhcc-o8';

// Validate Supabase credentials
const hasValidCredentials = supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl === EXPECTED_URL &&
  supabaseAnonKey === EXPECTED_KEY &&
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.includes('.supabase.co');

if (!hasValidCredentials) {
  console.error('❌ Missing or invalid Supabase environment variables');
  console.error('Please check your .env file and ensure you have:');
  console.error('VITE_SUPABASE_URL=https://vsactuzdnmbqatvghyli.supabase.co');
  console.error('VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  console.error('🔗 Get your credentials from: https://supabase.com/dashboard');
  
  if (supabaseUrl !== EXPECTED_URL) {
    console.error(`❌ URL mismatch: Expected ${EXPECTED_URL}, got ${supabaseUrl}`);
  }
  if (supabaseAnonKey !== EXPECTED_KEY) {
    console.error('❌ Anon key mismatch: Key does not match expected project');
  }
  
  // Don't throw error in production, just log warnings
  console.warn('⚠️ Continuing with potentially invalid configuration...');
}

// Create Supabase client with enhanced configuration for authentication debugging
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    debug: false // Disable debug mode for production
  },
  global: {
    headers: {
      'X-Client-Info': 'aidjobs-platform'
    }
  },
  db: {
    schema: 'public'
  }
});

// Enhanced connection test with detailed logging
console.log('🔄 Testing Supabase connection...');
console.log('📍 Connecting to:', supabaseUrl);
console.log('🔑 Using anon key:', supabaseAnonKey.substring(0, 20) + '...');

supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ Supabase connection error:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      details: error
    });
  } else {
    console.log('✅ Supabase connected successfully');
    console.log('📊 Project URL:', supabaseUrl);
    if (data.session) {
      console.log('👤 Active session found:', {
        user: data.session.user?.email,
        expires: data.session.expires_at
      });
    } else {
      console.log('👤 No active session');
    }
  }
}).catch(err => {
  console.error('❌ Supabase connection failed:', {
    message: err.message,
    stack: err.stack,
    error: err
  });
});

// Add authentication state change listener for debugging
supabase.auth.onAuthStateChange((event, session) => {
  console.log('🔄 Auth state change:', {
    event,
    user: session?.user?.email || 'none',
    timestamp: new Date().toISOString()
  });
  
  if (event === 'SIGNED_IN') {
    console.log('✅ User signed in:', session?.user?.email);
  } else if (event === 'SIGNED_OUT') {
    console.log('👋 User signed out');
  } else if (event === 'TOKEN_REFRESHED') {
    console.log('🔄 Token refreshed for:', session?.user?.email);
  }
});

// Database types (updated with complete Phase 3 schema)
export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProgressFlags {
  user_id: string;
  has_uploaded_cv: boolean;
  has_analyzed_cv: boolean;
  has_selected_job: boolean;
  has_written_cover_letter: boolean;
  has_started_jd: boolean;
  has_submitted_jd_inputs: boolean;
  has_generated_jd: boolean;
  jd_generation_failed: boolean;
  has_published_job: boolean;
  has_applied_to_job: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobDraft {
  id: string;
  user_id: string;
  title?: string;
  description?: string;
  organization_name?: string;
  organization_url?: string;
  org_name?: string;
  org_website?: string;
  responsibilities?: string;
  qualifications?: string;
  sdgs?: string[];
  sector?: string;
  contract_type?: string;
  location?: string;
  how_to_apply?: string;
  application_end_date?: string;
  salary_range?: string;
  benefits?: string;
  draft_status: 'draft' | 'review' | 'ready' | 'archived';
  is_template: boolean;
  template_name?: string;
  ai_generated: boolean;
  generation_metadata: any;
  last_edited_at: string;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  user_id: string;
  title: string;
  description: string;
  organization_name?: string;
  organization_url?: string;
  org_name?: string;
  org_website?: string;
  responsibilities?: string;
  qualifications?: string;
  sdgs?: string[];
  sector?: string;
  contract_type?: string;
  location?: string;
  how_to_apply?: string;
  application_end_date?: string;
  salary_range?: string;
  benefits?: string;
  status: 'published' | 'archived' | 'closed';
  published_at: string;
  is_template: boolean;
  template_name?: string;
  source_draft_id?: string;
  ai_generated: boolean;
  generation_metadata: any;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  cover_letter?: string;
  additional_notes?: string;
  cv_file_url?: string;
  status: 'pending' | 'reviewed' | 'shortlisted' | 'interviewed' | 'accepted' | 'rejected' | 'withdrawn';
  applied_at: string;
  reviewed_at?: string;
  status_changed_at: string;
  ai_assisted: boolean;
  ai_metadata: any;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  is_archived: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
  metadata?: any;
  model_used?: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_at?: string;
}

export interface ErrorLog {
  id: string;
  user_id?: string;
  error_type: string;
  details: string;
  source: string;
  created_at: string;
}