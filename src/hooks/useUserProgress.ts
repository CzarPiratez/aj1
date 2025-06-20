import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface UserProgressFlags {
  has_uploaded_cv: boolean;
  has_analyzed_cv: boolean;
  has_selected_job: boolean;
  has_written_cover_letter: boolean;
  has_published_job: boolean;
  has_applied_to_job: boolean;
}

const defaultFlags: UserProgressFlags = {
  has_uploaded_cv: false,
  has_analyzed_cv: false,
  has_selected_job: false,
  has_written_cover_letter: false,
  has_published_job: false,
  has_applied_to_job: false,
};

export function useUserProgress(userId?: string) {
  const [flags, setFlags] = useState<UserProgressFlags>(defaultFlags);
  const [loading, setLoading] = useState(true);

  // Fetch user progress flags
  const fetchFlags = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_progress_flags')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching user progress:', error);
        setLoading(false);
        return;
      }

      if (data) {
        setFlags({
          has_uploaded_cv: data.has_uploaded_cv,
          has_analyzed_cv: data.has_analyzed_cv,
          has_selected_job: data.has_selected_job,
          has_written_cover_letter: data.has_written_cover_letter,
          has_published_job: data.has_published_job,
          has_applied_to_job: data.has_applied_to_job,
        });
      } else {
        // Create initial record if it doesn't exist
        const { error: insertError } = await supabase
          .from('user_progress_flags')
          .insert({ user_id: userId, ...defaultFlags });

        if (insertError) {
          console.error('Error creating user progress record:', insertError);
        }
        
        setFlags(defaultFlags);
      }
    } catch (error) {
      console.error('Error in fetchFlags:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Update specific flag
  const updateFlag = useCallback(async (flagName: keyof UserProgressFlags, value: boolean) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('user_progress_flags')
        .upsert(
          { user_id: userId, [flagName]: value },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('Error updating user progress flag:', error);
        return;
      }

      setFlags(prev => ({ ...prev, [flagName]: value }));
    } catch (error) {
      console.error('Error in updateFlag:', error);
    }
  }, [userId]);

  // Update multiple flags at once
  const updateFlags = useCallback(async (updates: Partial<UserProgressFlags>) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('user_progress_flags')
        .upsert(
          { user_id: userId, ...updates },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('Error updating user progress flags:', error);
        return;
      }

      setFlags(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Error in updateFlags:', error);
    }
  }, [userId]);

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