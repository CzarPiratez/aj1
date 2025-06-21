// Enhanced Job Description Generator with DeepSeek Chat V3 Integration
import { supabase } from './supabase';
import { callAI } from './ai';
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

// Core function to generate initial JD using DeepSeek Chat V3
export async function generateInitialJD(input: string, userId: string): Promise<{
  success: boolean;
  jdDraft?: JDDraft;
  generatedJD?: string;
  error?: string;
}> {
  console.log('🚀 Starting JD generation with DeepSeek Chat V3:', { input: input.substring(0, 100) + '...', userId });

  try {
    // Validate input
    if (!input || input.trim().length < 20) {
      return {
        success: false,
        error: 'Please provide at least 20 characters describing the role and requirements.'
      };
    }

    if (!userId) {
      return {
        success: false,
        error: 'User authentication required for JD generation.'
      };
    }

    // Create initial draft record
    const draftData = {
      user_id: userId,
      input_type: 'brief',
      input_summary: input.substring(0, 500), // Limit summary length
      content: input,
      status: 'pending' as const
    };

    console.log('💾 Creating initial JD draft record...');
    const { data: draft, error: draftError } = await supabase
      .from('jd_drafts')
      .insert(draftData)
      .select()
      .single();

    if (draftError) {
      console.error('❌ Error creating JD draft:', draftError);
      return {
        success: false,
        error: 'Failed to save job description request. Please try again.'
      };
    }

    console.log('✅ JD draft created with ID:', draft.id);

    // Update user progress flags
    await updateUserProgressFlags(userId, {
      has_started_jd: true,
      has_submitted_jd_inputs: true
    });

    // Update draft status to processing
    await updateJDDraftStatus(draft.id, 'processing');

    try {
      // Generate JD using DeepSeek Chat V3
      console.log('🤖 Generating JD with DeepSeek Chat V3...');
      const generatedJD = await generateJDWithAI(input);

      // Update draft with generated JD
      await updateJDDraftStatus(draft.id, 'completed', generatedJD);

      // Update user progress
      await updateUserProgressFlags(userId, {
        has_generated_jd: true
      });

      console.log('✅ JD generation completed successfully');
      return {
        success: true,
        jdDraft: { ...draft, generated_jd: generatedJD, status: 'completed' },
        generatedJD
      };

    } catch (aiError: any) {
      console.error('❌ AI generation failed:', aiError);

      // Update draft with error
      const errorMessage = aiError.message || 'AI generation failed';
      await updateJDDraftStatus(draft.id, 'failed', undefined, errorMessage);

      // Update user progress to indicate failure
      await updateUserProgressFlags(userId, {
        jd_generation_failed: true
      });

      // Return user-friendly error message
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        return {
          success: false,
          error: "Sorry, I couldn't generate the JD right now due to high demand. Please try again in a few minutes."
        };
      }

      return {
        success: false,
        error: "Sorry, I couldn't generate the JD right now. Please try again in a few minutes."
      };
    }

  } catch (error: any) {
    console.error('❌ JD generation process failed:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred during JD generation.'
    };
  }
}

// Generate JD using AI with specialized prompt for nonprofit sector
async function generateJDWithAI(input: string): Promise<string> {
  const systemPrompt = `You are an expert job description writer specializing in the nonprofit and development sector. Your task is to create comprehensive, professional job descriptions that attract mission-driven candidates.

Based on the user's input, generate a complete job description that includes:

1. **Job Title** - Clear, specific, and appropriate for the nonprofit sector
2. **Organization Context** - Brief background about the type of organization/project
3. **Role Overview** - Mission-aligned summary that connects to social impact
4. **Key Responsibilities** - 5-7 specific, actionable responsibilities
5. **Required Qualifications** - Essential skills, experience, and education
6. **Preferred Qualifications** - Nice-to-have skills and experience
7. **Skills & Competencies** - Technical and soft skills needed
8. **Working Conditions** - Location, travel requirements, work environment
9. **What We Offer** - Benefits, growth opportunities, impact potential
10. **How to Apply** - Clear application instructions

Guidelines:
- Use inclusive, DEI-friendly language throughout
- Focus on impact and mission alignment
- Be specific about experience requirements (years, sectors, skills)
- Include relevant SDG connections where appropriate
- Use professional but warm tone that attracts purpose-driven candidates
- Ensure the JD is comprehensive enough to post immediately
- Make it engaging and inspiring while remaining professional

Format the output as a well-structured job description ready for posting.`;

  const userPrompt = `Please create a comprehensive job description based on this input:

"${input}"

Generate a complete, professional job description that would be suitable for posting on job boards and attracting qualified candidates in the nonprofit/development sector.`;

  try {
    const response = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      temperature: 0.7,
      max_tokens: 4000
    });

    if (!response.content || response.content.trim().length < 200) {
      throw new Error('Generated job description is too short or empty');
    }

    return response.content;
  } catch (error) {
    console.error('❌ AI generation error:', error);
    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Update JD draft status in database
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
async function updateUserProgressFlags(userId: string, updates: Record<string, boolean>): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_progress_flags')
      .upsert({
        user_id: userId,
        ...updates
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('❌ Error updating user progress flags:', error);
    } else {
      console.log('✅ User progress flags updated:', updates);
    }
  } catch (error) {
    console.error('❌ Error in updateUserProgressFlags:', error);
  }
}

// Retry JD generation for failed attempts
export async function retryJDGeneration(draftId: string, userId: string): Promise<{
  success: boolean;
  generatedJD?: string;
  error?: string;
}> {
  console.log('🔄 Retrying JD generation for draft:', draftId);

  try {
    // Get the original draft
    const { data: draft, error: fetchError } = await supabase
      .from('jd_drafts')
      .select('*')
      .eq('id', draftId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !draft) {
      return {
        success: false,
        error: 'Original job description request not found.'
      };
    }

    if (!draft.content) {
      return {
        success: false,
        error: 'Original input content is missing.'
      };
    }

    // Reset status to processing
    await updateJDDraftStatus(draftId, 'processing');

    try {
      // Retry AI generation
      const generatedJD = await generateJDWithAI(draft.content);

      // Update draft with new generated JD
      await updateJDDraftStatus(draftId, 'completed', generatedJD);

      // Update user progress
      await updateUserProgressFlags(userId, {
        has_generated_jd: true,
        jd_generation_failed: false
      });

      return {
        success: true,
        generatedJD
      };

    } catch (aiError: any) {
      console.error('❌ Retry AI generation failed:', aiError);

      // Update draft with error
      await updateJDDraftStatus(draftId, 'failed', undefined, aiError.message);

      return {
        success: false,
        error: "Sorry, I couldn't generate the JD right now. Please try again in a few minutes."
      };
    }

  } catch (error: any) {
    console.error('❌ Retry JD generation failed:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred during retry.'
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

// Check if user has failed JD generation attempts
export async function checkJDGenerationStatus(userId: string): Promise<{
  hasFailed: boolean;
  hasCompleted: boolean;
  latestDraft?: JDDraft;
}> {
  try {
    const { data: flags, error: flagsError } = await supabase
      .from('user_progress_flags')
      .select('has_generated_jd, jd_generation_failed')
      .eq('user_id', userId)
      .single();

    if (flagsError) {
      console.error('❌ Error checking JD generation status:', flagsError);
      return { hasFailed: false, hasCompleted: false };
    }

    // Get latest draft
    const { data: latestDraft } = await supabase
      .from('jd_drafts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return {
      hasFailed: flags?.jd_generation_failed || false,
      hasCompleted: flags?.has_generated_jd || false,
      latestDraft: latestDraft || undefined
    };

  } catch (error) {
    console.error('❌ Error in checkJDGenerationStatus:', error);
    return { hasFailed: false, hasCompleted: false };
  }
}

// Validate different input types
export function validateInput(type: 'brief' | 'upload' | 'link', content: string): {
  isValid: boolean;
  reason?: string;
} {
  const trimmed = content.trim();
  
  if (trimmed.length < 20) {
    return { isValid: false, reason: 'Please provide at least 20 characters describing the role' };
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