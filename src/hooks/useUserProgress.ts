import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface UserProgressFlags {
  has_uploaded_cv: boolean;
  has_analyzed_cv: boolean;
  has_selected_job: boolean;
  has_written_cover_letter: boolean;
  has_published_job: boolean;
  has_applied_to_job: boolean;
  has_started_jd: boolean;
  has_submitted_jd_inputs: boolean;
  has_generated_jd: boolean;
}

const defaultFlags: UserProgressFlags = {
  has_uploaded_cv: false,
  has_analyzed_cv: false,
  has_selected_job: false,
  has_written_cover_letter: false,
  has_published_job: false,
  has_applied_to_job: false,
  has_started_jd: false,
  has_submitted_jd_inputs: false,
  has_generated_jd: false,
};

export function useUserProgress(userId?: string) {
  const [flags, setFlags] = useState<UserProgressFlags>(defaultFlags);
  const [loading, setLoading] = useState(true);

  // Ensure user and progress record exist
  const ensureUserProgressRecord = useCallback(async (userId: string) => {
    try {
      console.log('🔍 Ensuring user progress record exists for:', userId);
      
      // First check if user exists in our users table
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (userError) {
        console.error('❌ Error checking user:', userError);
        return false;
      }

      if (!user) {
        console.log('👤 User not found in users table, this should be handled by the auth trigger');
        return false;
      }

      // Check if progress record exists
      const { data: existingProgress, error: progressError } = await supabase
        .from('user_progress_flags')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (progressError && progressError.code !== 'PGRST116') {
        console.error('❌ Error checking progress record:', progressError);
        return false;
      }

      // Create progress record if it doesn't exist
      if (!existingProgress) {
        console.log('📝 Creating progress record for user:', userId);
        const { error: createError } = await supabase
          .from('user_progress_flags')
          .insert({
            user_id: userId,
            ...defaultFlags
          });

        if (createError) {
          console.error('❌ Error creating progress record:', createError);
          return false;
        }
        
        console.log('✅ Progress record created successfully');
      }

      return true;
    } catch (error) {
      console.error('❌ Error ensuring user progress record:', error);
      return false;
    }
  }, []);

  // Fetch user progress flags
  const fetchFlags = useCallback(async () => {
    if (!userId) {
      console.log('⚠️ No userId provided, using default flags');
      setLoading(false);
      return;
    }

    try {
      console.log('📊 Fetching progress flags for user:', userId);
      
      // Ensure user and progress record exist first
      const recordExists = await ensureUserProgressRecord(userId);
      if (!recordExists) {
        console.error('❌ Failed to ensure user progress record exists');
        setFlags(defaultFlags);
        setLoading(false);
        return;
      }

      // Fetch the progress flags
      const { data, error } = await supabase
        .from('user_progress_flags')
        .select(`
          has_uploaded_cv, 
          has_analyzed_cv, 
          has_selected_job, 
          has_written_cover_letter, 
          has_published_job, 
          has_applied_to_job,
          has_started_jd,
          has_submitted_jd_inputs,
          has_generated_jd
        `)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('❌ Error fetching user progress:', error);
        setFlags(defaultFlags);
      } else {
        console.log('✅ Progress flags fetched successfully:', data);
        setFlags({
          has_uploaded_cv: data.has_uploaded_cv || false,
          has_analyzed_cv: data.has_analyzed_cv || false,
          has_selected_job: data.has_selected_job || false,
          has_written_cover_letter: data.has_written_cover_letter || false,
          has_published_job: data.has_published_job || false,
          has_applied_to_job: data.has_applied_to_job || false,
          has_started_jd: data.has_started_jd || false,
          has_submitted_jd_inputs: data.has_submitted_jd_inputs || false,
          has_generated_jd: data.has_generated_jd || false,
        });
      }
    } catch (error) {
      console.error('❌ Error in fetchFlags:', error);
      setFlags(defaultFlags);
    } finally {
      setLoading(false);
    }
  }, [userId, ensureUserProgressRecord]);

  // Update specific flag
  const updateFlag = useCallback(async (flagName: keyof UserProgressFlags, value: boolean) => {
    if (!userId) {
      console.warn('⚠️ Cannot update flag: userId is not provided');
      return;
    }

    try {
      console.log(`🔄 Updating flag ${flagName} to ${value} for user ${userId}`);
      
      // Ensure user and progress record exist first
      const recordExists = await ensureUserProgressRecord(userId);
      if (!recordExists) {
        console.error('❌ Failed to ensure user progress record exists before update');
        return;
      }

      const { error } = await supabase
        .from('user_progress_flags')
        .update({ [flagName]: value })
        .eq('user_id', userId);

      if (error) {
        console.error(`❌ Error updating user progress flag ${flagName}:`, {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          userId,
          flagName,
          value
        });
        return;
      }

      // Update local state
      setFlags(prev => ({ ...prev, [flagName]: value }));
      console.log(`✅ Successfully updated ${flagName} to ${value} for user ${userId}`);
    } catch (error) {
      console.error(`❌ Error in updateFlag for ${flagName}:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        flagName,
        value
      });
    }
  }, [userId, ensureUserProgressRecord]);

  // Update multiple flags at once
  const updateFlags = useCallback(async (updates: Partial<UserProgressFlags>) => {
    if (!userId) {
      console.warn('⚠️ Cannot update flags: userId is not provided');
      return;
    }

    try {
      console.log(`🔄 Updating multiple flags for user ${userId}:`, updates);
      
      // Ensure user and progress record exist first
      const recordExists = await ensureUserProgressRecord(userId);
      if (!recordExists) {
        console.error('❌ Failed to ensure user progress record exists before bulk update');
        return;
      }

      const { error } = await supabase
        .from('user_progress_flags')
        .update(updates)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error updating user progress flags:', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          userId,
          updates
        });
        return;
      }

      // Update local state
      setFlags(prev => ({ ...prev, ...updates }));
      console.log(`✅ Successfully updated multiple flags for user ${userId}:`, updates);
    } catch (error) {
      console.error('❌ Error in updateFlags:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        updates
      });
    }
  }, [userId, ensureUserProgressRecord]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  return {
    flags,
    loading,
    updateFlag,
    updateFlags,
    refetch: fetchFlags,
  };
}