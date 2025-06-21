import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Supabase Config Check:', {
  url: supabaseUrl ? `✅ Set (${supabaseUrl.substring(0, 30)}...)` : '❌ Missing VITE_SUPABASE_URL',
  key: supabaseAnonKey ? `✅ Set (${supabaseAnonKey.substring(0, 20)}...)` : '❌ Missing VITE_SUPABASE_ANON_KEY',
  envVars: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
});

// Check if we have valid Supabase credentials
const hasValidCredentials = supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your_supabase_project_url_here' &&
  supabaseAnonKey !== 'your_supabase_anon_key_here' &&
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.includes('.supabase.co');

if (!hasValidCredentials) {
  console.error('❌ Missing or invalid Supabase environment variables');
  console.error('Please check your .env file and ensure you have:');
  console.error('VITE_SUPABASE_URL=https://your-project-id.supabase.co');
  console.error('VITE_SUPABASE_ANON_KEY=your_actual_anon_key');
  console.error('🔗 Get your credentials from: https://supabase.com/dashboard');
}

// Create Supabase client with proper configuration
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: hasValidCredentials,
      persistSession: hasValidCredentials,
      detectSessionInUrl: hasValidCredentials,
      flowType: 'pkce'
    },
    global: {
      headers: {
        'X-Client-Info': 'aidjobs-platform'
      }
    }
  }
);

// Test the connection only if we have real credentials
if (hasValidCredentials) {
  console.log('🔄 Testing Supabase connection...');
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error('❌ Supabase connection error:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        details: error
      });
    } else {
      console.log('✅ Supabase connected successfully to:', supabaseUrl);
      if (data.session) {
        console.log('👤 User session found:', data.session.user?.email);
      } else {
        console.log('👤 No active user session');
      }
    }
  }).catch(err => {
    console.error('❌ Supabase connection failed:', {
      message: err.message,
      stack: err.stack,
      error: err
    });
  });
} else {
  console.warn('🚧 Supabase connection skipped - invalid credentials');
  console.warn('🔗 Please update your .env file with valid Supabase credentials');
}

// Database types
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
  has_published_job: boolean;
  has_applied_to_job: boolean;
  has_started_jd: boolean;
  has_submitted_jd_inputs: boolean;
  has_generated_jd: boolean;
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
  status: 'draft' | 'published' | 'archived';
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected' | 'withdrawn';
  cover_letter?: string;
  additional_notes?: string;
  applied_at: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data (when querying with joins)
  job?: Job;
  user?: User;
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