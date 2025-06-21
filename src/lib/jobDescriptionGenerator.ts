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
  raw_input: string;
  file_name?: string;
  file_type?: string;
  url?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  generated_jd?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// Input classification function
export function classifyJDInput(input: string): 'brief_only' | 'brief_with_link' | 'link_only' {
  const urlRegex = /(https?:\/\/[^\s]+)/;
  const hasLink = urlRegex.test(input);
  const plainText = input.replace(urlRegex, '').trim();
  const hasMeaningfulText = plainText.length > 30 || plainText.split(' ').length > 6;

  if (hasLink && hasMeaningfulText) return 'brief_with_link';
  if (hasLink && !hasMeaningfulText) return 'link_only';
  return 'brief_only';
}

// Extract URL from input
export function extractUrlFromInput(input: string): string | null {
  const urlMatch = input.match(/(https?:\/\/[^\s]+)/);
  return urlMatch ? urlMatch[1] : null;
}

// Extract brief text (removing URLs)
export function extractBriefFromInput(input: string): string {
  return input.replace(/(https?:\/\/[^\s]+)/g, '').trim();
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

    // Classify input type
    const inputType = classifyJDInput(input);
    console.log('🔍 Input classified as:', inputType);

    // Create initial draft record
    const draftData = {
      user_id: userId,
      input_type: inputType,
      input_summary: input.substring(0, 500), // Limit summary length
      raw_input: input, // Set raw_input to the original input
      status: 'pending' as const
    };

    // Add URL if present
    const url = extractUrlFromInput(input);
    if (url) {
      draftData.url = url;
    }

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
      // Generate JD using appropriate method based on input type
      let generatedJD: string;
      
      switch (inputType) {
        case 'brief_with_link':
          generatedJD = await generateJDFromBriefAndLink(input);
          break;
        case 'link_only':
          generatedJD = await rewriteJDFromURL(url!);
          break;
        case 'brief_only':
          generatedJD = await generateJDFromBrief(input);
          break;
        default:
          throw new Error('Unknown input type');
      }

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

// Generate JD from brief only
export async function generateJDFromBrief(brief: string): Promise<string> {
  console.log('📝 Generating JD from brief only');
  
  const systemPrompt = `You are an expert job description writer specializing in the nonprofit and development sector. Create a comprehensive, professional job description based on the brief provided.

Generate a complete job description that includes:

1. **Job Title** - Clear, specific, and appropriate for the nonprofit sector
2. **Organization Context** - Brief background about the type of organization
3. **Role Overview** - Mission-aligned summary connecting to social impact
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

  const userPrompt = `Please create a comprehensive job description based on this brief:

"${brief}"

Generate a complete, professional job description suitable for the nonprofit/development sector.`;

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

// Generate JD from brief + organizational link
export async function generateJDFromBriefAndLink(input: string): Promise<string> {
  console.log('🔗 Generating JD from brief + organizational link');
  
  const brief = extractBriefFromInput(input);
  const url = extractUrlFromInput(input);
  
  if (!url) {
    throw new Error('No URL found in input');
  }

  // Fetch organization context from URL
  let orgContext = '';
  try {
    orgContext = await fetchOrganizationContext(url);
  } catch (error) {
    console.warn('⚠️ Could not fetch organization context, proceeding with brief only');
    orgContext = `Organization website: ${url}`;
  }

  const systemPrompt = `You are an expert job description writer specializing in the nonprofit and development sector. Create a comprehensive, professional job description based on the brief and organizational context provided.

Use the organizational context to:
- Align the role with the organization's mission and values
- Include relevant sector-specific language and requirements
- Connect the position to the organization's impact areas
- Ensure cultural and operational fit

Generate a complete job description that includes:

1. **Job Title** - Clear, specific, and appropriate for this organization
2. **About the Organization** - Brief background using the provided context
3. **Role Overview** - Mission-aligned summary connecting to the organization's work
4. **Key Responsibilities** - 5-7 specific responsibilities aligned with org goals
5. **Required Qualifications** - Essential skills, experience, and education
6. **Preferred Qualifications** - Nice-to-have skills and experience
7. **Skills & Competencies** - Technical and soft skills needed
8. **Working Conditions** - Location, travel requirements, work environment
9. **What We Offer** - Benefits, growth opportunities, impact potential
10. **How to Apply** - Clear application instructions

Guidelines:
- Use inclusive, DEI-friendly language throughout
- Focus on impact and mission alignment with this specific organization
- Be specific about experience requirements relevant to their sector
- Include relevant SDG connections based on their work
- Use professional but warm tone that attracts purpose-driven candidates
- Ensure the JD reflects the organization's culture and values
- Make it engaging and inspiring while remaining professional

Format the output as a well-structured job description ready for posting.`;

  const userPrompt = `Please create a comprehensive job description based on this information:

**Job Brief:**
"${brief}"

**Organization Context:**
${orgContext}

Generate a complete, professional job description that aligns with this organization's mission and work.`;

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

// Rewrite JD from existing URL
export async function rewriteJDFromURL(url: string): Promise<string> {
  console.log('🔄 Rewriting JD from existing URL:', url);
  
  // Fetch existing job posting content
  let existingJD = '';
  try {
    existingJD = await fetchJobPostingContent(url);
  } catch (error) {
    throw new Error('Could not fetch content from the provided URL. Please check the link and try again.');
  }

  const systemPrompt = `You are an expert job description writer specializing in the nonprofit and development sector. Rewrite and improve the provided job posting with better clarity, DEI language, and nonprofit sector alignment.

Improvements to make:
- Enhance clarity and readability
- Use inclusive, DEI-friendly language throughout
- Improve structure and organization
- Add mission-aligned language appropriate for nonprofit sector
- Strengthen impact statements and purpose-driven messaging
- Ensure professional tone while remaining engaging
- Add any missing standard sections
- Remove jargon and make language accessible
- Include relevant SDG connections where appropriate

Generate a complete, improved job description that includes:

1. **Job Title** - Clear and compelling
2. **Organization Context** - Brief background about the organization
3. **Role Overview** - Mission-aligned summary
4. **Key Responsibilities** - Well-organized and specific
5. **Required Qualifications** - Clear and realistic
6. **Preferred Qualifications** - Nice-to-have skills
7. **Skills & Competencies** - Technical and soft skills
8. **Working Conditions** - Location, travel, work environment
9. **What We Offer** - Benefits and growth opportunities
10. **How to Apply** - Clear application process

Guidelines:
- Maintain the core intent and requirements of the original posting
- Significantly improve language, structure, and appeal
- Focus on attracting mission-driven candidates
- Use warm, professional tone appropriate for nonprofit sector
- Ensure the rewritten JD is ready for immediate posting

Format the output as a well-structured, professional job description.`;

  const userPrompt = `Please rewrite and improve this job posting:

**Source URL:** ${url}

**Original Job Posting:**
${existingJD}

Create an improved version with better clarity, DEI language, and nonprofit sector alignment.`;

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

// Refine uploaded JD file
export async function refineUploadedJD(fileContent: string, fileName: string): Promise<string> {
  console.log('📄 Refining uploaded JD file:', fileName);
  
  const systemPrompt = `You are an expert job description writer specializing in the nonprofit and development sector. Refine and improve the uploaded job description draft with better structure, clarity, and nonprofit sector best practices.

Improvements to make:
- Enhance overall structure and organization
- Improve clarity and readability
- Use inclusive, DEI-friendly language throughout
- Strengthen mission alignment and impact messaging
- Add professional polish while maintaining authenticity
- Ensure all standard sections are present and well-written
- Remove jargon and improve accessibility
- Add relevant SDG connections where appropriate
- Optimize for attracting purpose-driven candidates

Generate a refined job description that includes:

1. **Job Title** - Clear and compelling
2. **Organization Context** - Professional background
3. **Role Overview** - Mission-aligned summary
4. **Key Responsibilities** - Well-organized and specific
5. **Required Qualifications** - Clear and realistic
6. **Preferred Qualifications** - Nice-to-have skills
7. **Skills & Competencies** - Technical and soft skills
8. **Working Conditions** - Location, travel, work environment
9. **What We Offer** - Benefits and growth opportunities
10. **How to Apply** - Clear application process

Guidelines:
- Preserve the original intent and core requirements
- Significantly improve language, structure, and professional appeal
- Focus on nonprofit sector best practices
- Use warm, professional tone that attracts mission-driven talent
- Ensure the refined JD is ready for immediate posting
- Maintain any organization-specific details and requirements

Format the output as a polished, professional job description.`;

  const userPrompt = `Please refine and improve this job description draft:

**Original File:** ${fileName}

**Content:**
${fileContent}

Create a refined, professional version optimized for the nonprofit sector.`;

  try {
    const response = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      temperature: 0.6,
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

// Fetch organization context from URL
async function fetchOrganizationContext(url: string): Promise<string> {
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
    const title = doc.querySelector('title')?.textContent || 'Organization';
    
    // Extract meta description
    const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content') || 
                           doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
    
    // Extract main content (first 500 words)
    const bodyText = doc.body?.textContent || '';
    const words = bodyText.replace(/\s+/g, ' ').trim().split(' ');
    const content = words.slice(0, 500).join(' ');
    
    return `Organization: ${title}\nDescription: ${metaDescription}\nContent: ${content}`;
  } catch (error) {
    console.error('Error fetching organization context:', error);
    throw new Error('Failed to fetch organization information from URL');
  }
}

// Fetch job posting content from URL
async function fetchJobPostingContent(url: string): Promise<string> {
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
    
    // Extract main content
    const bodyText = doc.body?.textContent || '';
    const words = bodyText.replace(/\s+/g, ' ').trim().split(' ');
    const content = words.slice(0, 1000).join(' '); // Limit to 1000 words
    
    return `Title: ${title}\n\nContent: ${content}`;
  } catch (error) {
    console.error('Error fetching job posting content:', error);
    throw new Error('Failed to fetch job posting content from URL');
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

    if (!draft.raw_input) {
      return {
        success: false,
        error: 'Original input content is missing.'
      };
    }

    // Reset status to processing
    await updateJDDraftStatus(draftId, 'processing');

    try {
      // Retry AI generation based on original input type
      let generatedJD: string;
      
      switch (draft.input_type) {
        case 'brief_with_link':
          generatedJD = await generateJDFromBriefAndLink(draft.raw_input);
          break;
        case 'link_only':
          if (!draft.url) throw new Error('URL missing for link-only input');
          generatedJD = await rewriteJDFromURL(draft.url);
          break;
        case 'brief_only':
          generatedJD = await generateJDFromBrief(draft.raw_input);
          break;
        default:
          throw new Error('Unknown input type for retry');
      }

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