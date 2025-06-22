// Job Description Service - Handle JD input processing and generation
import { supabase } from '@/lib/supabase';
import { generateJobDescription as aiGenerateJobDescription } from './ai';

export interface JDInput {
  type: 'brief' | 'upload' | 'link';
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
  input_type: string;
  raw_input: string;
  content?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  generated_jd?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
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
  inputType: 'brief' | 'upload' | 'link',
  input: string | File
): Promise<JDDraft | null> {
  try {
    let rawInput: string;
    let content: string | undefined;
    let fileName: string | undefined;
    let fileType: string | undefined;
    let url: string | undefined;

    if (inputType === 'upload' && input instanceof File) {
      // Handle file upload
      fileName = input.name;
      fileType = input.name.split('.').pop()?.toLowerCase();
      
      // For now, we'll store the file name and type
      // In a real implementation, you'd extract text from the file
      rawInput = `File upload: ${fileName}`;
      content = `Uploaded file: ${fileName} (${fileType})`;
      
      // TODO: Implement actual file text extraction
      console.log('File upload processing not yet implemented');
      
    } else if (inputType === 'link' && typeof input === 'string') {
      // Handle URL input
      url = input;
      rawInput = input;
      
      // TODO: Implement URL content fetching
      content = `URL content from: ${input}`;
      console.log('URL content fetching not yet implemented');
      
    } else if (inputType === 'brief' && typeof input === 'string') {
      // Handle brief text input
      rawInput = input;
      content = input;
    } else {
      throw new Error('Invalid input type or input format');
    }

    // Save to database
    const { data, error } = await supabase
      .from('jd_drafts')
      .insert({
        user_id: userId,
        input_type: inputType,
        raw_input: rawInput,
        content: content,
        file_name: fileName,
        file_type: fileType,
        url: url,
        status: 'pending',
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

// Generate JD from saved draft
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
    
    if (draft.input_type === 'brief') {
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

    } else if (draft.input_type === 'link') {
      prompt = `Based on the content from this URL: ${draft.url}

Create an improved, comprehensive job description that:
- Enhances clarity and structure
- Uses inclusive language
- Follows nonprofit sector best practices
- Includes all essential sections
- Is engaging for mission-driven candidates

Original content: ${draft.content}`;

    } else if (draft.input_type === 'upload') {
      prompt = `Improve and restructure this job description from the uploaded file:

${draft.content}

Please enhance it by:
- Improving clarity and readability
- Adding inclusive language
- Ensuring proper structure
- Making it more engaging
- Following nonprofit sector standards`;

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
        updated_at: new Date().toISOString()
      })
      .eq('id', draft.id);

    return generatedJD;

  } catch (error) {
    console.error('Error generating JD:', error);
    
    // Update status to failed
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