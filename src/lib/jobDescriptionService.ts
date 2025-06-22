// Job Description Service - Handle JD input processing and generation
import { supabase } from '@/lib/supabase';
import { generateJobDescription as aiGenerateJobDescription } from './ai';
import { parseJDInput, type JDInputDetection } from './jdInputDetection';

export interface JDInput {
  type: 'briefWithLink' | 'briefOnly' | 'referenceLink' | 'upload';
  content: string;
  metadata?: {
    fileName?: string;
    fileType?: string;
    url?: string;
    brief?: string;
    link?: string;
  };
}

export interface JDDraft {
  id: string;
  user_id: string;
  input_type: string;
  input_summary: string;
  raw_input: string;
  content?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  generated_jd?: string;
  error_message?: string;
  has_fallback?: boolean;
  is_ai_generated?: boolean;
  created_at: string;
  updated_at: string;
  file_name?: string;
  file_type?: string;
  url?: string;
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

// Map internal input types to database-compatible values
function mapInputTypeForDatabase(internalType: string): string {
  switch (internalType) {
    case 'briefWithLink':
    case 'referenceLink':
      return 'website'; // Both involve URLs, so map to 'website'
    case 'briefOnly':
    case 'upload':
      return 'manual'; // Both are manual input, so map to 'manual'
    default:
      return 'manual'; // Default fallback
  }
}

// Generate input summary based on input type and content
function generateInputSummary(inputType: string, content: string, metadata?: any): string {
  switch (inputType) {
    case 'briefWithLink':
      return 'Brief + link provided';
    case 'briefOnly':
      return 'Job brief provided';
    case 'referenceLink':
      return 'Reference job link provided';
    case 'upload':
      return 'JD file uploaded';
    default:
      return 'Job description input provided';
  }
}

// Validate required fields before database insert
function validateRequiredFields(data: {
  user_id: string;
  input_type: string;
  input_summary: string;
  raw_input: string;
}): { isValid: boolean; error?: string } {
  if (!data.user_id || typeof data.user_id !== 'string') {
    return { isValid: false, error: 'User ID is required' };
  }
  
  if (!data.input_type || typeof data.input_type !== 'string') {
    return { isValid: false, error: 'Input type is required' };
  }
  
  if (!data.input_summary || typeof data.input_summary !== 'string' || data.input_summary.trim().length === 0) {
    return { isValid: false, error: 'Input summary is required and cannot be empty' };
  }
  
  if (!data.raw_input || typeof data.raw_input !== 'string' || data.raw_input.trim().length === 0) {
    return { isValid: false, error: 'Raw input is required and cannot be empty' };
  }
  
  return { isValid: true };
}

// Process JD input and save to database with fallback support
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
    let detectedInputType: string;
    let inputSummary: string;

    if (inputType === 'upload' && input instanceof File) {
      // Handle file upload
      fileName = input.name;
      fileType = input.name.split('.').pop()?.toLowerCase();
      rawInput = `File upload: ${fileName}`;
      content = `Uploaded file: ${fileName} (${fileType})`;
      detectedInputType = 'upload';
      inputSummary = generateInputSummary('upload', rawInput);
      
      console.log('📄 File upload processing - storing metadata only');
      
    } else if (typeof input === 'string') {
      rawInput = input.trim();
      
      // Use intelligent input detection
      const detection: JDInputDetection = parseJDInput(rawInput);
      
      if (detection.inputType === 'briefWithLink') {
        detectedInputType = 'briefWithLink';
        content = detection.brief;
        url = detection.link;
        inputSummary = generateInputSummary('briefWithLink', rawInput);
      } else if (detection.inputType === 'referenceLink') {
        detectedInputType = 'referenceLink';
        url = detection.link;
        content = `Reference URL: ${url}`;
        inputSummary = generateInputSummary('referenceLink', rawInput);
      } else if (detection.inputType === 'briefOnly') {
        detectedInputType = 'briefOnly';
        content = detection.brief || rawInput;
        inputSummary = generateInputSummary('briefOnly', rawInput);
      } else {
        // Unknown input type - treat as brief
        detectedInputType = 'briefOnly';
        content = rawInput;
        inputSummary = 'Job description input provided';
      }
      
    } else {
      throw new Error('Invalid input type or input format');
    }

    // Map the internal input type to database-compatible value
    const dbInputType = mapInputTypeForDatabase(detectedInputType);

    // Validate required fields before insert
    const insertData = {
      user_id: userId,
      input_type: dbInputType, // Use mapped value
      input_summary: inputSummary,
      raw_input: rawInput
    };

    const validation = validateRequiredFields(insertData);
    if (!validation.isValid) {
      console.error('❌ Validation failed:', validation.error);
      throw new Error(`Validation failed: ${validation.error}`);
    }

    // Prepare database insert with fallback fields
    const dbInsert = {
      user_id: userId,
      input_type: dbInputType, // Use mapped value for database
      input_summary: inputSummary,
      raw_input: rawInput,
      content: content,
      file_name: fileName,
      file_type: fileType,
      url: url,
      status: 'pending',
      has_fallback: true, // Mark as fallback mode
      is_ai_generated: false, // Not AI generated yet
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('💾 Inserting JD draft with fallback support:', {
      input_type: dbInputType, // Log the mapped value
      input_summary: inputSummary,
      has_fallback: true,
      is_ai_generated: false
    });

    // Save to database
    const { data, error } = await supabase
      .from('jd_drafts')
      .insert(dbInsert)
      .select()
      .single();

    if (error) {
      console.error('❌ Database insert error:', error);
      
      // Provide helpful error message based on error type
      if (error.code === '23502') { // NOT NULL violation
        const missingField = error.message.match(/column "([^"]+)"/)?.[1];
        throw new Error(`Required field missing: ${missingField}. Please ensure all necessary information is provided.`);
      } else if (error.code === '23505') { // Unique violation
        throw new Error('A draft with this information already exists. Please modify your input or delete the existing draft.');
      } else {
        throw new Error(`Database error: ${error.message}`);
      }
    }

    console.log('✅ JD draft saved successfully with ID:', data.id);
    return data as JDDraft;

  } catch (error) {
    console.error('❌ Error processing JD input:', error);
    
    // Return null instead of throwing to allow graceful handling
    return null;
  }
}

// Generate JD from saved draft with enhanced fallback handling
export async function generateJDFromInput(draft: JDDraft): Promise<string> {
  try {
    console.log('🤖 Starting JD generation for draft:', draft.id);
    
    // Update status to processing
    await supabase
      .from('jd_drafts')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', draft.id);

    let prompt: string;
    
    // Use the original input type logic for generation, not the mapped database value
    const originalInputType = determineOriginalInputType(draft);
    
    if (originalInputType === 'briefOnly') {
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

    } else if (originalInputType === 'briefWithLink') {
      prompt = `Create a comprehensive job description based on this brief and organization information:

JOB BRIEF:
${draft.content}

ORGANIZATION WEBSITE:
${draft.url}

Please generate a job description that:
- Aligns with the organization's mission and values
- Incorporates the brief requirements
- Uses the organization's context and background
- Follows nonprofit sector best practices
- Is engaging for mission-driven candidates`;

    } else if (originalInputType === 'referenceLink') {
      prompt = `Based on the job posting at this URL: ${draft.url}

Create an improved, comprehensive job description that:
- Enhances clarity and structure
- Uses inclusive language
- Follows nonprofit sector best practices
- Includes all essential sections
- Is engaging for mission-driven candidates

Original content: ${draft.content}`;

    } else if (originalInputType === 'upload') {
      prompt = `Improve and restructure this job description from the uploaded file:

${draft.content}

Please enhance it by:
- Improving clarity and readability
- Adding inclusive language
- Ensuring proper structure
- Making it more engaging
- Following nonprofit sector standards`;

    } else {
      throw new Error(`Unknown input type: ${originalInputType}`);
    }

    // Try AI generation
    let generatedJD: string;
    let isAiGenerated = true;
    
    try {
      generatedJD = await aiGenerateJobDescription({
        title: 'Job Description Generation',
        description: prompt,
        content: draft.content || '',
        url: draft.url || ''
      });
      
      console.log('✅ AI generation successful');
      
    } catch (aiError) {
      console.warn('⚠️ AI generation failed, using fallback:', aiError);
      
      // Fallback job description
      isAiGenerated = false;
      generatedJD = generateFallbackJobDescription(draft);
    }

    // Update draft with generated content
    await supabase
      .from('jd_drafts')
      .update({
        generated_jd: generatedJD,
        status: 'completed',
        is_ai_generated: isAiGenerated,
        has_fallback: !isAiGenerated,
        updated_at: new Date().toISOString()
      })
      .eq('id', draft.id);

    console.log(`✅ JD generation completed (AI: ${isAiGenerated})`);
    return generatedJD;

  } catch (error) {
    console.error('❌ Error generating JD:', error);
    
    // Update status to failed
    await supabase
      .from('jd_drafts')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        has_fallback: true,
        is_ai_generated: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', draft.id);

    throw error;
  }
}

// Determine original input type from draft data for generation logic
function determineOriginalInputType(draft: JDDraft): string {
  // If we have both content and URL, it's likely briefWithLink
  if (draft.content && draft.url && !draft.file_name) {
    return 'briefWithLink';
  }
  
  // If we have only URL and no file, it's referenceLink
  if (draft.url && !draft.content && !draft.file_name) {
    return 'referenceLink';
  }
  
  // If we have file information, it's upload
  if (draft.file_name || draft.file_type) {
    return 'upload';
  }
  
  // Default to briefOnly
  return 'briefOnly';
}

// Generate fallback job description when AI is unavailable
function generateFallbackJobDescription(draft: JDDraft): string {
  const orgName = draft.url ? extractDomain(draft.url) : 'Mission-driven Organization';
  
  return `# Job Opportunity at ${orgName}

## About the Role
${draft.content || 'We are seeking a dedicated professional to join our mission-driven team and contribute to meaningful social impact work.'}

## About the Organization
${orgName} is committed to creating positive change and making a difference in the communities we serve.

## Key Responsibilities
- Support organizational mission and strategic objectives
- Collaborate with team members on key initiatives
- Contribute to program development and implementation
- Engage with stakeholders and community partners
- Maintain high standards of professional excellence

## Qualifications & Experience
- Bachelor's degree or equivalent experience
- 2-3 years of relevant experience in nonprofit or development sector
- Strong communication and interpersonal skills
- Passion for social impact and mission-driven work
- Ability to work collaboratively in a team environment
- Commitment to diversity, equity, and inclusion

## What We Offer
- Competitive salary commensurate with experience
- Comprehensive benefits package
- Professional development opportunities
- Meaningful work with direct impact
- Supportive and inclusive work environment

## How to Apply
Please submit your CV and cover letter explaining your interest in this role and our mission.

${draft.url ? `To learn more about our organization, visit: ${draft.url}` : ''}

*This job description was generated in fallback mode. Please review and customize as needed.*`;
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