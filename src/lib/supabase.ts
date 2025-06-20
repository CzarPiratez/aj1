import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Supabase Config Check:', {
  url: supabaseUrl ? `✅ Set (${supabaseUrl.substring(0, 20)}...)` : '❌ Missing VITE_SUPABASE_URL',
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
  
  // For development, we'll create a mock client to prevent crashes
  console.warn('🚧 Creating mock Supabase client for development');
}

// Use valid fallback URL that won't cause URL constructor to fail
const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder';

// Create Supabase client with proper configuration
export const supabase = createClient(
  hasValidCredentials ? supabaseUrl : fallbackUrl,
  hasValidCredentials ? supabaseAnonKey : fallbackKey,
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
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error('❌ Supabase connection error:', error.message);
    } else {
      console.log('✅ Supabase connected successfully');
    }
  }).catch(err => {
    console.error('❌ Supabase connection failed:', err.message);
  });
} else {
  console.warn('🚧 Supabase connection skipped - using placeholder credentials');
  console.warn('🔗 To connect to Supabase, click the "Connect to Supabase" button in the top right');
}

// Database types
export interface User {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  created_at: string;
}

export interface Organization {
  id: string;
  user_id: string;
  name: string;
  sector: string;
  logo_url?: string;
  location?: string;
  created_at: string;
}

export interface Job {
  id: string;
  org_id: string;
  title: string;
  description: string;
  location?: string;
  responsibilities?: string;
  requirements?: string;
  created_at: string;
  organization?: Organization;
}

export interface Resume {
  id: string;
  user_id: string;
  filename: string;
  parsed_data_json?: any;
  created_at: string;
}

export interface Match {
  id: string;
  job_id: string;
  resume_id: string;
  ai_score: number;
  explanation_json?: any;
  created_at: string;
  job?: Job;
  resume?: Resume;
}

export interface Prompt {
  id: string;
  name: string;
  type: string;
  model: string;
  content: string;
  created_at: string;
}