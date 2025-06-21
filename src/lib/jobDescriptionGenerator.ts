// Enhanced Job Description Generator with AI Fallback
import { supabase } from './supabase';
import { generateJobDescription } from './ai';
import { toast } from 'sonner';

export interface JDGenerationInput {
  type: 'brief' | 'upload' | 'link';
  content: string;
  summary: string;
  fileName?: string;
  fileType?: string;
  url?: string;
}

export interface JDDraft {
  id: string;
  user_id: string;
  input_type: string;
  input_summary: string;
  content?: string;
  file_name?: string;
  file_type?: string;
  url?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  generated_jd?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// Validate different input types
export function validateInput(type: 'brief' | 'upload' | 'link', content: string): {
  isValid: boolean;
  reason?: string;
} {
  const trimmed = content.trim();
  
  if (trimmed.length < 10) {
    return { isValid: false, reason: 'Please provide more detail (at least 10 characters)' };
  }
  
  switch (type) {
    case 'brief':
      const wordCount = trimmed.split(/\s+/).filter(word => word.length > 0).length;
      if (wordCount < 5) {
        return { isValid: false, reason: 'Please provide at least 5 words describing the role' };
      }
      
      // Check for job-related keywords
      const jobKeywords = ['role', 'position', 'job', 'coordinator', 'manager', 'expert', 'officer', 'specialist', 'director', 'assistant', 'need', 'looking', 'seeking'];
      const hasJobKeywords = jobKeywords.some(keyword => trimmed.toLowerCase().includes(keyword));
      
      if (!hasJobKeywords) {
        return { isValid: false, reason: 'Please include more details about the role or position' };
      }
      break;
      
    case 'link':
      try {
        const url = new URL(trimmed);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          return { isValid: false, reason: 'Please provide a valid HTTP or HTTPS URL' };
        }
      } catch {
        return { isValid: false, reason: 'Please provide a valid URL' };
      }
      break;
      
    case 'upload':
      if (trimmed.length < 50) {
        return { isValid: false, reason: 'The uploaded content seems too short. Please ensure the file contains a complete job description.' };
      }
      break;
  }
  
  return { isValid: true };
}

// Extract content from URL
async function extractUrlContent(url: string): Promise<string> {
  try {
    console.log('🌐 Extracting content from URL:', url);
    
    // Use CORS proxy to fetch content
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    
    const data = await response.json();
    const html = data.contents;
    
    // Parse HTML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Extract title and content
    const title = doc.querySelector('title')?.textContent || '';
    const bodyText = doc.body?.textContent || '';
    
    // Clean and limit content
    const cleanText = bodyText.replace(/\s+/g, ' ').trim();
    const words = cleanText.split(' ');
    const limitedContent = words.slice(0, 1000).join(' '); // Limit to 1000 words
    
    return `Title: ${title}\n\nContent: ${limitedContent}`;
  } catch (error) {
    console.error('❌ Error extracting URL content:', error);
    throw new Error('Failed to extract content from the provided URL. Please check the URL and try again.');
  }
}

// Save JD input to database
async function saveJDInput(userId: string, input: JDGenerationInput): Promise<JDDraft | null> {
  try {
    console.log('💾 Saving JD input to database');
    
    const { data, error } = await supabase
      .from('jd_drafts')
      .insert({
        user_id: userId,
        input_type: input.type,
        input_summary: input.summary,
        content: input.content,
        file_name: input.fileName,
        file_type: input.fileType,
        url: input.url,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving JD input:', error);
      return null;
    }

    console.log('✅ JD input saved with ID:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Error in saveJDInput:', error);
    return null;
  }
}

// Update JD draft status
async function updateJDDraftStatus(
  draftId: string,
  status: JDDraft['status'],
  generatedJD?: string,
  errorMessage?: string
): Promise<void> {
  try {
    const updateData: any = { status };
    
    if (generatedJD) {
      updateData.generated_jd = generatedJD;
    }
    
    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const { error } = await supabase
      .from('jd_drafts')
      .update(updateData)
      .eq('id', draftId);

    if (error) {
      console.error('❌ Error updating JD draft status:', error);
    } else {
      console.log(`✅ JD draft ${draftId} status updated to: ${status}`);
    }
  } catch (error) {
    console.error('❌ Error in updateJDDraftStatus:', error);
  }
}

// Update user progress flags
async function updateUserProgress(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_progress_flags')
      .upsert({
        user_id: userId,
        has_submitted_jd_inputs: true
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('❌ Error updating user progress:', error);
    } else {
      console.log('✅ User progress updated: has_submitted_jd_inputs = true');
    }
  } catch (error) {
    console.error('❌ Error in updateUserProgress:', error);
  }
}

// Main function to process JD generation
export async function processJDGeneration(
  userId: string,
  type: 'brief' | 'upload' | 'link',
  rawInput: string,
  fileName?: string,
  fileType?: string
): Promise<{
  success: boolean;
  draft?: JDDraft;
  generatedJD?: string;
  error?: string;
}> {
  try {
    console.log('🚀 Starting JD generation process:', { type, userId });
    
    // Validate input
    const validation = validateInput(type, rawInput);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.reason
      };
    }
    
    // Prepare input data
    let content = rawInput;
    let summary = '';
    let url: string | undefined;
    
    if (type === 'link') {
      url = rawInput.trim();
      summary = `Job posting from: ${new URL(url).hostname}`;
      content = await extractUrlContent(url);
    } else if (type === 'upload') {
      summary = `Uploaded file: ${fileName || 'job_description'}`;
    } else {
      summary = rawInput.substring(0, 100) + (rawInput.length > 100 ? '...' : '');
    }
    
    const input: JDGenerationInput = {
      type,
      content,
      summary,
      fileName,
      fileType,
      url
    };
    
    // Save input to database
    const draft = await saveJDInput(userId, input);
    if (!draft) {
      return {
        success: false,
        error: 'Failed to save job description input'
      };
    }
    
    // Update user progress
    await updateUserProgress(userId);
    
    // Update status to processing
    await updateJDDraftStatus(draft.id, 'processing');
    
    try {
      // Generate JD using AI with fallback
      console.log('🤖 Generating JD with AI fallback...');
      const generatedJD = await generateJobDescription({
        content,
        type,
        userId
      });
      
      // Update draft with generated JD
      await updateJDDraftStatus(draft.id, 'completed', generatedJD);
      
      console.log('✅ JD generation completed successfully');
      return {
        success: true,
        draft,
        generatedJD
      };
      
    } catch (aiError: any) {
      console.error('❌ AI generation failed:', aiError);
      
      // Update draft with error
      await updateJDDraftStatus(draft.id, 'failed', undefined, aiError.message);
      
      // Return specific error message
      if (aiError.message.includes('all AI models are temporarily unavailable')) {
        return {
          success: false,
          error: "Unfortunately, I'm having trouble generating the JD right now — all available AI models seem to be temporarily unavailable. Please try again in a few minutes or upload a JD draft to continue."
        };
      }
      
      return {
        success: false,
        error: `Failed to generate job description: ${aiError.message}`
      };
    }
    
  } catch (error: any) {
    console.error('❌ JD generation process failed:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
}

// Get user's JD drafts
export async function getUserJDDrafts(userId: string): Promise<JDDraft[]> {
  try {
    const { data, error } = await supabase
      .from('jd_drafts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching JD drafts:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error in getUserJDDrafts:', error);
    return [];
  }
}