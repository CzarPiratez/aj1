// Job Description Service - Complete implementation with multiple input modes
import { supabase } from './supabase';
import { generateJobDescription } from './ai';
import { toast } from 'sonner';

export interface JDInput {
  inputType: 'brief' | 'upload' | 'link';
  inputSummary: string;
  content?: string;
  fileName?: string;
  fileType?: string;
  url?: string;
}

export interface JDDraft {
  id: string;
  user_id: string;
  input_type: 'brief' | 'upload' | 'link';
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

// Validate if input is a URL
export function isValidUrl(input: string): boolean {
  try {
    const url = new URL(input.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Extract domain from URL for display
export function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch {
    return url;
  }
}

// Validate brief input (typed text)
export function validateBriefInput(input: string): { isValid: boolean; reason?: string } {
  const trimmed = input.trim();
  const wordCount = trimmed.split(/\s+/).filter(word => word.length > 0).length;
  
  if (trimmed.length < 30) {
    return { isValid: false, reason: 'Please provide at least 30 characters of detail' };
  }
  
  if (wordCount < 6) {
    return { isValid: false, reason: 'Please provide at least 6 words describing the role' };
  }
  
  // Check for job-related keywords
  const jobKeywords = ['role', 'position', 'job', 'coordinator', 'manager', 'expert', 'officer', 'specialist', 'director', 'assistant'];
  const hasJobKeywords = jobKeywords.some(keyword => trimmed.toLowerCase().includes(keyword));
  
  if (!hasJobKeywords) {
    return { isValid: false, reason: 'Please include role or position details' };
  }
  
  return { isValid: true };
}

// Validate file upload
export function validateFileUpload(file: File): { isValid: boolean; reason?: string } {
  const allowedTypes = ['doc', 'docx', 'pdf'];
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  if (!fileExtension || !allowedTypes.includes(fileExtension)) {
    return { 
      isValid: false, 
      reason: `Only ${allowedTypes.join(', ')} files are supported` 
    };
  }
  
  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { isValid: false, reason: 'File size must be less than 10MB' };
  }
  
  return { isValid: true };
}

// Extract text content from uploaded file
export async function extractFileContent(file: File): Promise<string> {
  console.log('📄 Extracting content from file:', file.name);
  
  try {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'pdf') {
      // For PDF files, we'll use a simple text extraction
      // In a production environment, you'd use a proper PDF parser
      const text = await file.text();
      return text.substring(0, 5000); // Limit to first 5000 characters
    } else if (fileExtension === 'doc' || fileExtension === 'docx') {
      // For Word documents, we'll treat them as text for now
      // In production, you'd use a proper Word document parser
      const text = await file.text();
      return text.substring(0, 5000); // Limit to first 5000 characters
    } else {
      // Fallback to text extraction
      const text = await file.text();
      return text.substring(0, 5000);
    }
  } catch (error) {
    console.error('❌ Error extracting file content:', error);
    throw new Error('Failed to extract content from file');
  }
}

// Fetch content from URL
export async function fetchUrlContent(url: string): Promise<string> {
  console.log('🌐 Fetching content from URL:', url);
  
  try {
    // Use a CORS proxy service to fetch the website content
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const html = data.contents;
    
    // Create a temporary DOM element to parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Extract title
    const title = doc.querySelector('title')?.textContent || 'Job Posting';
    
    // Extract main content (first 1000 words)
    const bodyText = doc.body?.textContent || '';
    const words = bodyText.replace(/\s+/g, ' ').trim().split(' ');
    const content = words.slice(0, 1000).join(' ');
    
    return `Title: ${title}\n\nContent: ${content}`;
  } catch (error) {
    console.error('❌ Error fetching URL content:', error);
    throw new Error('Failed to fetch content from URL');
  }
}

// Save JD input to database
export async function saveJDInput(userId: string, input: JDInput): Promise<JDDraft | null> {
  try {
    console.log('💾 Saving JD input to database:', { userId, inputType: input.inputType });

    const { data, error } = await supabase
      .from('jd_drafts')
      .insert({
        user_id: userId,
        input_type: input.inputType,
        input_summary: input.inputSummary,
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
      toast.error('Failed to save job description input');
      return null;
    }

    console.log('✅ JD input saved successfully:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Error in saveJDInput:', error);
    toast.error('Failed to save job description input');
    return null;
  }
}

// Update JD draft status
export async function updateJDDraftStatus(
  draftId: string, 
  status: JDDraft['status'], 
  generatedJD?: string, 
  errorMessage?: string
): Promise<boolean> {
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
      return false;
    }

    console.log(`✅ JD draft ${draftId} status updated to: ${status}`);
    return true;
  } catch (error) {
    console.error('❌ Error in updateJDDraftStatus:', error);
    return false;
  }
}

// Generate job description using AI
export async function generateJDFromInput(draft: JDDraft): Promise<string> {
  console.log('🤖 Generating JD using AI for draft:', draft.id);

  // Update status to processing
  await updateJDDraftStatus(draft.id, 'processing');

  try {
    let prompt = '';

    if (draft.input_type === 'brief') {
      prompt = `Create a comprehensive, professional job description based on this brief:

"${draft.input_summary}"

Please create a well-structured job description that includes:
- Job title and organization context
- Role overview and mission alignment
- Key responsibilities
- Required qualifications and experience
- Skills and competencies
- Application instructions

Make it suitable for the nonprofit/development sector with inclusive language.`;

    } else if (draft.input_type === 'upload' && draft.content) {
      prompt = `Please improve and refine this job description draft:

Original file: ${draft.file_name}

Content:
${draft.content}

Please enhance it by:
- Improving clarity and structure
- Adding DEI-friendly language
- Ensuring nonprofit sector alignment
- Making it more compelling and professional
- Adding any missing standard sections`;

    } else if (draft.input_type === 'link' && draft.content) {
      prompt = `Rewrite this job posting with better clarity, DEI language, and nonprofit alignment:

Source URL: ${draft.url}

Original content:
${draft.content}

Please create a new version that:
- Uses clear, inclusive language
- Follows nonprofit sector best practices
- Has better structure and flow
- Is more engaging and professional
- Includes proper application instructions`;

    } else {
      throw new Error('Invalid draft data for JD generation');
    }

    // Use the AI service to generate the job description
    const generatedJD = await generateJobDescription({
      title: draft.input_summary,
      description: draft.input_summary,
      content: prompt,
      url: draft.url || ''
    });

    // Update draft with generated JD
    await updateJDDraftStatus(draft.id, 'completed', generatedJD);
    
    console.log('✅ JD generated successfully for draft:', draft.id);
    return generatedJD;
  } catch (error) {
    console.error('❌ Error generating JD:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    await updateJDDraftStatus(draft.id, 'failed', undefined, errorMessage);
    throw error;
  }
}

// Process different input types
export async function processJDInput(
  userId: string, 
  inputType: 'brief' | 'upload' | 'link',
  input: string | File
): Promise<JDDraft | null> {
  try {
    let jdInput: JDInput;

    if (inputType === 'brief' && typeof input === 'string') {
      const validation = validateBriefInput(input);
      if (!validation.isValid) {
        throw new Error(validation.reason);
      }

      jdInput = {
        inputType: 'brief',
        inputSummary: input.substring(0, 500), // Limit summary length
      };

    } else if (inputType === 'upload' && input instanceof File) {
      const validation = validateFileUpload(input);
      if (!validation.isValid) {
        throw new Error(validation.reason);
      }

      const content = await extractFileContent(input);
      const fileExtension = input.name.split('.').pop()?.toLowerCase();

      jdInput = {
        inputType: 'upload',
        inputSummary: `Uploaded file: ${input.name}`,
        content,
        fileName: input.name,
        fileType: fileExtension,
      };

    } else if (inputType === 'link' && typeof input === 'string') {
      if (!isValidUrl(input)) {
        throw new Error('Please provide a valid URL');
      }

      const content = await fetchUrlContent(input);

      jdInput = {
        inputType: 'link',
        inputSummary: `Job posting from: ${extractDomain(input)}`,
        content,
        url: input,
      };

    } else {
      throw new Error('Invalid input type or data');
    }

    // Save to database
    return await saveJDInput(userId, jdInput);

  } catch (error) {
    console.error('❌ Error processing JD input:', error);
    throw error;
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

// Delete JD draft
export async function deleteJDDraft(draftId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('jd_drafts')
      .delete()
      .eq('id', draftId);

    if (error) {
      console.error('❌ Error deleting JD draft:', error);
      return false;
    }

    console.log('✅ JD draft deleted:', draftId);
    return true;
  } catch (error) {
    console.error('❌ Error in deleteJDDraft:', error);
    return false;
  }
}