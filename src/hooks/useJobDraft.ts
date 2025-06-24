import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { generateFullJD, loadJobDraft, updateJobDraft, publishJobDraft } from '@/lib/jdGeneration';
import { toast } from 'sonner';

interface UseJobDraftOptions {
  draftId?: string;
  userId: string;
}

export function useJobDraft({ draftId, userId }: UseJobDraftOptions) {
  const [loading, setLoading] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<any | null>(null);
  const [publishedJob, setPublishedJob] = useState<any | null>(null);

  // Load an existing draft
  const loadDraft = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await loadJobDraft(id);
      setDraft(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job draft');
      toast.error('Failed to load job draft');
    } finally {
      setLoading(false);
    }
  };

  // Generate a new job description
  const generateJD = async (input: { brief?: string; orgLink?: string; uploadedJD?: string }) => {
    setGenerating(true);
    setError(null);
    
    try {
      const result = await generateFullJD(userId, input);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate job description');
      }
      
      // Load the newly created draft
      if (result.draftId) {
        await loadDraft(result.draftId);
      }
      
      toast.success('Job description generated successfully');
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate job description');
      toast.error('Failed to generate job description');
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    } finally {
      setGenerating(false);
    }
  };

  // Update an existing draft
  const updateDraft = async (updates: any) => {
    setLoading(true);
    setError(null);
    
    try {
      if (!draft?.id) {
        throw new Error('No draft selected');
      }
      
      const updatedDraft = await updateJobDraft(draft.id, updates);
      setDraft(updatedDraft);
      toast.success('Draft updated successfully');
      return updatedDraft;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update draft');
      toast.error('Failed to update draft');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Publish a draft to the jobs table
  const publishDraft = async () => {
    setPublishing(true);
    setError(null);
    
    try {
      if (!draft?.id) {
        throw new Error('No draft selected');
      }
      
      const job = await publishJobDraft(draft.id, userId);
      setPublishedJob(job);
      toast.success('Job published successfully');
      return job;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish job');
      toast.error('Failed to publish job');
      return null;
    } finally {
      setPublishing(false);
    }
  };

  // Load draft on initial render if draftId is provided
  useEffect(() => {
    if (draftId) {
      loadDraft(draftId);
    }
  }, [draftId]);

  return {
    draft,
    loading,
    generating,
    publishing,
    error,
    publishedJob,
    generateJD,
    updateDraft,
    publishDraft,
    loadDraft
  };
}