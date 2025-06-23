// Job Description Service - Handle JD input processing and generation
import { supabase } from '@/lib/supabase';
import { generateJobDescription as aiGenerateJobDescription } from './ai';
import { scrapeWebsite, type WebsiteContent } from './jobBuilder';

export interface JDInput {
  type: 'manual' | 'website';
  content: string;
  metadata?: {
    fileName?: string;
    fileType?: string;
    url?: string;
  };
}

export interface JDDraft {
  id: string;
  user_id: string;
  input_type: 'manual' | 'website';
  raw_input: string;
  input_summary: string;
  content?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  generated_jd?: string;
  error_message?: string;
  has_fallback?: boolean;
  is_ai_generated?: boolean;
  created_at: string;
  updated_at: string;
}

// Generate input summary for database storage
function generateInputSummary(inputType: 'manual' | 'website', input: string | File | WebsiteContent): string {
  if (inputType === 'manual' && input instanceof File) {
    return `File upload: ${input.name}`;
  } else if (inputType === 'website' && typeof input === 'object' && 'url' in input) {
    const websiteContent = input as WebsiteContent;
    return `Website: ${websiteContent.title || extractDomain(websiteContent.url)}`;
  } else if (inputType === 'manual' && typeof input === 'string') {
    // Take first 100 characters of the brief as summary
    const brief = input.trim();
    return brief.length > 100 ? brief.substring(0, 97) + '...' : brief;
  } else {
    return 'Job description input';
  }
}

// URL validation
export function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// Extract domain from URL for display
export function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch (_) {
    return url;
  }
}

// Check if error is rate limit related
function isRateLimitError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString();
  const errorLower = errorMessage.toLowerCase();
  
  return (
    error.status === 429 ||
    errorLower.includes('rate limit') ||
    errorLower.includes('429') ||
    errorLower.includes('quota') ||
    errorLower.includes('too many requests') ||
    errorLower.includes('rate limited') ||
    errorLower.includes('free-models-per-min') ||
    errorLower.includes('free-models-per-day')
  );
}

// Validate brief input
export function validateBriefInput(brief: string): { isValid: boolean; reason?: string } {
  const trimmed = brief.trim();
  
  if (trimmed.length < 20) {
    return {
      isValid: false,
      reason: "That's quite brief! Could you provide more details about the role? I need at least a few sentences about the position, responsibilities, or requirements."
    };
  }
  
  if (trimmed.length < 50) {
    return {
      isValid: false,
      reason: "I need a bit more information to create a comprehensive job description. Could you add details about the role's responsibilities, required experience, or the organization's work?"
    };
  }
  
  // Check if it contains some job-related keywords
  const jobKeywords = [
    'role', 'position', 'job', 'responsibilities', 'experience', 'skills', 
    'qualifications', 'requirements', 'coordinator', 'manager', 'officer',
    'specialist', 'consultant', 'director', 'assistant', 'analyst'
  ];
  
  const hasJobKeywords = jobKeywords.some(keyword => 
    trimmed.toLowerCase().includes(keyword)
  );
  
  if (!hasJobKeywords) {
    return {
      isValid: false,
      reason: "This doesn't seem to be about a job posting. Could you provide details about a specific role you'd like to create a job description for?"
    };
  }
  
  return { isValid: true };
}

// Process JD input and save to database
export async function processJDInput(
  userId: string,
  inputType: 'manual' | 'website',
  input: string | File | WebsiteContent
): Promise<JDDraft | null> {
  try {
    let rawInput: string;
    let content: string | undefined;
    let fileName: string | undefined;
    let fileType: string | undefined;
    let url: string | undefined;

    if (inputType === 'manual' && input instanceof File) {
      // Handle file upload
      fileName = input.name;
      fileType = input.name.split('.').pop()?.toLowerCase();
      
      // For now, we'll store the file name and type
      // In a real implementation, you'd extract text from the file
      rawInput = `File upload: ${fileName}`;
      content = `Uploaded file: ${fileName} (${fileType})`;
      
      // TODO: Implement actual file text extraction
      console.log('File upload processing not yet implemented');
      
    } else if (inputType === 'website' && typeof input === 'object' && 'url' in input) {
      // Handle WebsiteContent input (already scraped)
      const websiteContent = input as WebsiteContent;
      url = websiteContent.url;
      rawInput = websiteContent.url;
      content = `${websiteContent.title}\n\n${websiteContent.description}\n\n${websiteContent.content}`;
      
    } else if (inputType === 'manual' && typeof input === 'string') {
      // Handle brief text input
      rawInput = input;
      content = input;
    } else {
      throw new Error('Invalid input type or input format');
    }

    // Generate input summary
    const inputSummary = generateInputSummary(inputType, input);

    // Save to database
    const { data, error } = await supabase
      .from('jd_drafts')
      .insert({
        user_id: userId,
        input_type: inputType, // Use the inputType directly since it's already 'manual' or 'website'
        raw_input: rawInput,
        input_summary: inputSummary,
        content: content,
        file_name: fileName,
        file_type: fileType,
        url: url,
        status: 'pending',
        has_fallback: false,
        is_ai_generated: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving JD input:', error);
      return null;
    }

    return data as JDDraft;
  } catch (error) {
    console.error('Error processing JD input:', error);
    return null;
  }
}

// Create fallback draft when AI is rate limited
export async function createFallbackDraft(
  userId: string,
  inputType: 'manual' | 'website',
  rawInput: string,
  inputSummary: string
): Promise<JDDraft | null> {
  try {
    console.log('🔄 Creating fallback draft due to AI rate limit');
    
    const { data, error } = await supabase
      .from('jd_drafts')
      .insert({
        user_id: userId,
        input_type: inputType, // Use the inputType directly since it's already 'manual' or 'website'
        raw_input: rawInput,
        input_summary: inputSummary,
        content: rawInput,
        status: 'pending',
        has_fallback: true,
        is_ai_generated: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating fallback draft:', error);
      return null;
    }

    console.log('✅ Fallback draft created successfully');
    return data as JDDraft;
  } catch (error) {
    console.error('Error in createFallbackDraft:', error);
    return null;
  }
}

// Generate JD from saved draft with rate limit handling
export async function generateJDFromInput(draft: JDDraft): Promise<string> {
  try {
    // Update status to processing
    await supabase
      .from('jd_drafts')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', draft.id);

    let prompt: string;
    
    if (draft.input_type === 'manual') {
      // Handle both brief and upload cases since they both map to 'manual'
      if (draft.file_name) {
        // This was an upload
        prompt = `Improve and restructure this job description from the uploaded file:

${draft.content}

Please enhance it by:
- Improving clarity and readability
- Adding inclusive language
- Ensuring proper structure
- Making it more engaging
- Following nonprofit sector standards`;
      } else {
        // This was a brief
        prompt = `Create a comprehensive, professional job description based on this brief:

${draft.content}

Please generate a well-structured job description that includes:
- Clear job title
- Mission-aligned summary
- Detailed responsibilities
- Required qualifications and experience
- Preferred skills
- Working conditions (location, contract type)
- Application instructions

Make it inclusive, engaging, and suitable for the nonprofit sector.`;
      }
    } else if (draft.input_type === 'website') {
      prompt = `Based on the content from this URL: ${draft.url}

Create an improved, comprehensive job description that:
- Enhances clarity and structure
- Uses inclusive language
- Follows nonprofit sector best practices
- Includes all essential sections
- Is engaging for mission-driven candidates

Original content: ${draft.content}`;
    } else {
      throw new Error('Unknown input type');
    }

    // Generate JD using AI
    const generatedJD = await aiGenerateJobDescription({
      title: 'Job Description Generation',
      description: prompt,
      content: draft.content || '',
      url: draft.url || ''
    });

    // Update draft with generated content
    await supabase
      .from('jd_drafts')
      .update({
        generated_jd: generatedJD,
        status: 'completed',
        is_ai_generated: true,
        has_fallback: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', draft.id);

    return generatedJD;

  } catch (error) {
    console.error('Error generating JD:', error);
    
    // Check if this is a rate limit error
    if (isRateLimitError(error)) {
      console.log('🚫 AI rate limit detected, creating fallback');
      
      // Update draft to indicate fallback status
      await supabase
        .from('jd_drafts')
        .update({
          status: 'pending',
          has_fallback: true,
          is_ai_generated: false,
          error_message: 'AI temporarily unavailable - rate limit reached',
          updated_at: new Date().toISOString()
        })
        .eq('id', draft.id);

      // Throw a specific rate limit error
      throw new Error('RATE_LIMIT_FALLBACK');
    } else {
      // Update status to failed for other errors
      await supabase
        .from('jd_drafts')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString()
        })
        .eq('id', draft.id);

      throw error;
    }
  }
}

// Retry AI generation for a fallback draft
export async function retryAIGeneration(draftId: string): Promise<string> {
  try {
    // Get the draft
    const { data: draft, error } = await supabase
      .from('jd_drafts')
      .select('*')
      .eq('id', draftId)
      .single();

    if (error || !draft) {
      throw new Error('Draft not found');
    }

    // Attempt to generate again
    return await generateJDFromInput(draft as JDDraft);
  } catch (error) {
    console.error('Error retrying AI generation:', error);
    throw error;
  }
}

// Get JD draft by ID
export async function getJDDraft(draftId: string): Promise<JDDraft | null> {
  try {
    const { data, error } = await supabase
      .from('jd_drafts')
      .select('*')
      .eq('id', draftId)
      .single();

    if (error) {
      console.error('Error fetching JD draft:', error);
      return null;
    }

    return data as JDDraft;
  } catch (error) {
    console.error('Error in getJDDraft:', error);
    return null;
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
      console.error('Error fetching user JD drafts:', error);
      return [];
    }

    return data as JDDraft[];
  } catch (error) {
    console.error('Error in getUserJDDrafts:', error);
    return [];
  }
}