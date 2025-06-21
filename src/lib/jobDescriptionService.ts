// Job Description Service - Handles JD generation workflow
import { supabase } from './supabase';
import { generateJobDescription } from './ai';
import { toast } from 'sonner';

export interface JDInput {
  inputType: 'website' | 'manual';
  websiteUrl?: string;
  roleTitle?: string;
  sector?: string;
  experienceYears?: string;
  requiredSkills?: string;
  additionalDetails?: string;
  rawInput: string;
}

export interface JDDraft {
  id: string;
  user_id: string;
  input_type: 'website' | 'manual';
  website_url?: string;
  role_title?: string;
  sector?: string;
  experience_years?: string;
  required_skills?: string;
  additional_details?: string;
  raw_input: string;
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

// Parse manual input to extract structured data
export function parseManualInput(input: string): Partial<JDInput> {
  const lowerInput = input.toLowerCase();
  const parsed: Partial<JDInput> = {};

  // Extract role title (look for common patterns)
  const rolePatterns = [
    /role[:\s]+([^,\n]+)/i,
    /position[:\s]+([^,\n]+)/i,
    /job[:\s]+([^,\n]+)/i,
    /title[:\s]+([^,\n]+)/i,
    /looking for[:\s]+([^,\n]+)/i,
    /hiring[:\s]+([^,\n]+)/i
  ];

  for (const pattern of rolePatterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      parsed.roleTitle = match[1].trim();
      break;
    }
  }

  // Extract sector/project type
  const sectorPatterns = [
    /sector[:\s]+([^,\n]+)/i,
    /project[:\s]+([^,\n]+)/i,
    /field[:\s]+([^,\n]+)/i,
    /area[:\s]+([^,\n]+)/i,
    /domain[:\s]+([^,\n]+)/i
  ];

  for (const pattern of sectorPatterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      parsed.sector = match[1].trim();
      break;
    }
  }

  // Extract experience years
  const expPatterns = [
    /(\d+)[\s-]*(?:years?|yrs?)[:\s]*(?:of\s+)?experience/i,
    /experience[:\s]+(\d+)[\s-]*(?:years?|yrs?)/i,
    /(\d+)\+?\s*(?:years?|yrs?)/i
  ];

  for (const pattern of expPatterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      parsed.experienceYears = `${match[1]} years`;
      break;
    }
  }

  // Extract skills (look for common skill-related keywords)
  const skillsPatterns = [
    /skills?[:\s]+([^.]+)/i,
    /requirements?[:\s]+([^.]+)/i,
    /qualifications?[:\s]+([^.]+)/i,
    /expertise[:\s]+([^.]+)/i,
    /competencies[:\s]+([^.]+)/i
  ];

  for (const pattern of skillsPatterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      parsed.requiredSkills = match[1].trim();
      break;
    }
  }

  return parsed;
}

// Validate if manual input is sufficient for JD generation
export function validateManualInput(input: string): { isValid: boolean; missingFields: string[] } {
  const parsed = parseManualInput(input);
  const missingFields: string[] = [];

  // Check minimum requirements
  if (!parsed.roleTitle && !input.toLowerCase().includes('role') && !input.toLowerCase().includes('position')) {
    missingFields.push('role/position title');
  }

  // Input should be at least 20 characters and contain some meaningful content
  if (input.trim().length < 20) {
    missingFields.push('more detailed information');
  }

  // Check if it contains at least some job-related keywords
  const jobKeywords = ['role', 'position', 'job', 'experience', 'skills', 'sector', 'project', 'responsibilities', 'qualifications'];
  const hasJobKeywords = jobKeywords.some(keyword => input.toLowerCase().includes(keyword));
  
  if (!hasJobKeywords) {
    missingFields.push('job-related details (role, skills, experience, etc.)');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
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
        website_url: input.websiteUrl,
        role_title: input.roleTitle,
        sector: input.sector,
        experience_years: input.experienceYears,
        required_skills: input.requiredSkills,
        additional_details: input.additionalDetails,
        raw_input: input.rawInput,
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

    if (draft.input_type === 'website' && draft.website_url) {
      // For website input, use the existing website scraping logic
      const { scrapeWebsite } = await import('./jobBuilder');
      const websiteContent = await scrapeWebsite(draft.website_url);
      
      prompt = `Based on this organization's website, create a comprehensive job description:

Organization: ${websiteContent.title}
Website: ${websiteContent.url}
Description: ${websiteContent.description}
Content: ${websiteContent.content}

Additional context from user: ${draft.raw_input}`;
    } else {
      // For manual input, create a structured prompt
      prompt = `Create a comprehensive job description based on the following details:

${draft.role_title ? `Role: ${draft.role_title}` : ''}
${draft.sector ? `Sector/Project: ${draft.sector}` : ''}
${draft.experience_years ? `Experience Required: ${draft.experience_years}` : ''}
${draft.required_skills ? `Required Skills: ${draft.required_skills}` : ''}
${draft.additional_details ? `Additional Details: ${draft.additional_details}` : ''}

Original user input: ${draft.raw_input}

Please create a professional, mission-aligned job description suitable for the nonprofit/development sector.`;
    }

    // Use the AI service to generate the job description
    const generatedJD = await generateJobDescription({
      title: draft.role_title || 'Position',
      description: draft.sector || '',
      content: prompt,
      url: draft.website_url || ''
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