import { callAI, AIMessage } from '@/lib/ai';
import { supabase } from '@/lib/supabase';

interface JDGenerationInput {
  brief?: string;
  orgLink?: string;
  uploadedJD?: string;
}

interface JDOverview {
  job_title: string;
  location: string;
  organization_name: string;
  project_name?: string;
  contract_type: string;
  duration?: string;
  working_arrangements?: string;
  salary_suggestion?: string;
  start_date?: string;
  salary_explanation?: string;
}

interface JDSkillsCompetencies {
  technical: string[];
  managerial: string[];
  communication: string[];
  behavioral: string[];
  soft_skills: string[];
  other: string[];
}

interface JDSections {
  job_summary: string;
  key_responsibilities: string;
  required_qualifications: string;
  preferred_qualifications: string;
  skills_competencies: JDSkillsCompetencies;
  experience_language: string;
  contract_details: string;
  how_to_apply: string;
  about_organization: string;
}

interface JDMetadata {
  sdgs: string[];
  sectors: string[];
  impact_areas: string[];
  esg_tags: string[];
  tone: string;
  dei_score: number;
  clarity_score: number;
  reading_level: string;
  gender_bias_notes: string[];
}

interface GeneratedJD {
  overview: JDOverview;
  sections: JDSections;
  metadata: JDMetadata;
}

/**
 * Extract information from a URL for job description generation
 * @param url Organization or project website URL
 * @returns Extracted information as text
 */
async function extractInfoFromURL(url: string): Promise<string> {
  try {
    // Simple URL validation
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // Use fetch to get the website content
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    
    // Extract text content from HTML (basic implementation)
    // In a production environment, you might want to use a more sophisticated HTML parser
    const textContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Limit the length to avoid token limits
    const limitedContent = textContent.substring(0, 10000);
    
    return `Website content from ${url}:\n\n${limitedContent}`;
  } catch (error) {
    console.error('Error extracting info from URL:', error);
    return `Failed to extract content from ${url}. Please provide more details manually.`;
  }
}

/**
 * Convert the generated JD into a format suitable for storage in job_drafts table
 * @param generatedJD The AI-generated job description
 * @returns Formatted sections for storage
 */
function formatJDForStorage(generatedJD: GeneratedJD) {
  // Create sections array with proper structure
  const sections = [
    {
      id: 'job-title',
      title: 'Job Title',
      content: generatedJD.overview.job_title,
      locked: false,
      version_history: [{ timestamp: new Date().toISOString(), content: generatedJD.overview.job_title }]
    },
    {
      id: 'job-summary',
      title: 'Job Summary',
      content: generatedJD.sections.job_summary,
      locked: false,
      version_history: [{ timestamp: new Date().toISOString(), content: generatedJD.sections.job_summary }]
    },
    {
      id: 'key-responsibilities',
      title: 'Key Responsibilities',
      content: generatedJD.sections.key_responsibilities,
      locked: false,
      version_history: [{ timestamp: new Date().toISOString(), content: generatedJD.sections.key_responsibilities }]
    },
    {
      id: 'required-qualifications',
      title: 'Required Qualifications',
      content: generatedJD.sections.required_qualifications,
      locked: false,
      version_history: [{ timestamp: new Date().toISOString(), content: generatedJD.sections.required_qualifications }]
    },
    {
      id: 'preferred-qualifications',
      title: 'Preferred Qualifications',
      content: generatedJD.sections.preferred_qualifications,
      locked: false,
      version_history: [{ timestamp: new Date().toISOString(), content: generatedJD.sections.preferred_qualifications }]
    },
    {
      id: 'skills-competencies',
      title: 'Skills & Competencies',
      content: formatSkillsCompetencies(generatedJD.sections.skills_competencies),
      locked: false,
      version_history: [{ timestamp: new Date().toISOString(), content: formatSkillsCompetencies(generatedJD.sections.skills_competencies) }]
    },
    {
      id: 'experience-language',
      title: 'Experience & Languages',
      content: generatedJD.sections.experience_language,
      locked: false,
      version_history: [{ timestamp: new Date().toISOString(), content: generatedJD.sections.experience_language }]
    },
    {
      id: 'contract-details',
      title: 'Contract Details',
      content: generatedJD.sections.contract_details,
      locked: false,
      version_history: [{ timestamp: new Date().toISOString(), content: generatedJD.sections.contract_details }]
    },
    {
      id: 'how-to-apply',
      title: 'How to Apply',
      content: generatedJD.sections.how_to_apply,
      locked: false,
      version_history: [{ timestamp: new Date().toISOString(), content: generatedJD.sections.how_to_apply }]
    },
    {
      id: 'about-organization',
      title: 'About the Organization',
      content: generatedJD.sections.about_organization,
      locked: false,
      version_history: [{ timestamp: new Date().toISOString(), content: generatedJD.sections.about_organization }]
    }
  ];

  // Create section order array
  const sectionOrder = sections.map(section => section.id);

  return {
    sections,
    sectionOrder
  };
}

/**
 * Format skills and competencies into a structured text format
 * @param skills The skills and competencies object
 * @returns Formatted text
 */
function formatSkillsCompetencies(skills: JDSkillsCompetencies): string {
  let formattedText = '';

  if (skills.technical.length > 0) {
    formattedText += '## Technical Skills\n';
    skills.technical.forEach(skill => {
      formattedText += `- ${skill}\n`;
    });
    formattedText += '\n';
  }

  if (skills.managerial.length > 0) {
    formattedText += '## Managerial Skills\n';
    skills.managerial.forEach(skill => {
      formattedText += `- ${skill}\n`;
    });
    formattedText += '\n';
  }

  if (skills.communication.length > 0) {
    formattedText += '## Communication Skills\n';
    skills.communication.forEach(skill => {
      formattedText += `- ${skill}\n`;
    });
    formattedText += '\n';
  }

  if (skills.behavioral.length > 0) {
    formattedText += '## Behavioral Skills\n';
    skills.behavioral.forEach(skill => {
      formattedText += `- ${skill}\n`;
    });
    formattedText += '\n';
  }

  if (skills.soft_skills.length > 0) {
    formattedText += '## Soft Skills\n';
    skills.soft_skills.forEach(skill => {
      formattedText += `- ${skill}\n`;
    });
    formattedText += '\n';
  }

  if (skills.other.length > 0) {
    formattedText += '## Other Skills\n';
    skills.other.forEach(skill => {
      formattedText += `- ${skill}\n`;
    });
  }

  return formattedText.trim();
}

/**
 * Generate a complete job description using AI based on provided inputs
 * @param userId The user ID for storing the generated JD
 * @param input Object containing brief, orgLink, and/or uploadedJD
 * @returns The generated job description data and database record ID
 */
export async function generateFullJD(userId: string, input: JDGenerationInput): Promise<{ 
  success: boolean; 
  draftId?: string; 
  error?: string;
  data?: GeneratedJD;
}> {
  try {
    // Determine the generation method based on input
    let generationMethod = 'brief';
    if (input.orgLink) {
      generationMethod = 'link';
    } else if (input.uploadedJD) {
      generationMethod = 'upload';
    }

    // Update user progress flag to indicate JD generation has started
    await supabase
      .from('user_progress_flags')
      .update({ has_started_jd: true })
      .eq('user_id', userId);

    // Extract information from URL if provided
    let websiteContent = '';
    if (input.orgLink) {
      websiteContent = await extractInfoFromURL(input.orgLink);
    }

    // Construct the AI prompt
    const systemPrompt = `You are an expert nonprofit hiring assistant. Based on the information below, generate a complete, structured job description for a professional role in the nonprofit or development sector.

Input may include a brief, a project or organizational link, or an uploaded old JD.

You must return the JD in a structured format, following this exact JSON layout:

{
  "overview": {
    "job_title": "...",
    "location": "...",
    "organization_name": "...",
    "project_name": "...",
    "contract_type": "...",
    "duration": "...",
    "working_arrangements": "...",
    "salary_suggestion": "...",
    "start_date": "...",
    "salary_explanation": "..."
  },
  "sections": {
    "job_summary": "...",
    "key_responsibilities": "...",
    "required_qualifications": "...",
    "preferred_qualifications": "...",
    "skills_competencies": {
      "technical": [...],
      "managerial": [...],
      "communication": [...],
      "behavioral": [...],
      "soft_skills": [...],
      "other": [...]
    },
    "experience_language": "...",
    "contract_details": "...",
    "how_to_apply": "...",
    "about_organization": "..."
  },
  "metadata": {
    "sdgs": ["SDG 5: Gender Equality", "SDG 13: Climate Action"],
    "sectors": ["Protection", "Livelihoods"],
    "impact_areas": ["Youth Empowerment", "Climate Adaptation"],
    "esg_tags": ["Social Impact", "Governance"],
    "tone": "Inclusive",
    "dei_score": 88,
    "clarity_score": 93,
    "reading_level": "B2",
    "gender_bias_notes": [
      "Consider replacing 'dynamic leader' with 'collaborative facilitator'",
      "Avoid masculine-coded phrases like 'driven' or 'assertive'"
    ]
  }
}

Return only structured JSON. Do not add any explanation or natural language around it.`;

    const userPrompt = `Please generate a complete job description based on the following information:

${input.brief ? `JOB BRIEF:\n${input.brief}\n\n` : ''}
${input.orgLink ? `ORGANIZATION WEBSITE: ${input.orgLink}\n\n` : ''}
${websiteContent ? `WEBSITE CONTENT:\n${websiteContent}\n\n` : ''}
${input.uploadedJD ? `EXISTING JOB DESCRIPTION:\n${input.uploadedJD}\n\n` : ''}`;

    // Call the AI to generate the job description
    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const aiResponse = await callAI(messages, {
      temperature: 0.7,
      max_tokens: 3000
    });

    // Parse the AI response as JSON
    let generatedJD: GeneratedJD;
    try {
      // Find JSON in the response (in case there's any text around it)
      const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }
      
      generatedJD = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Error parsing AI response as JSON:', parseError);
      
      // Update user progress flag to indicate JD generation failed
      await supabase
        .from('user_progress_flags')
        .update({ jd_generation_failed: true })
        .eq('user_id', userId);
      
      return { 
        success: false, 
        error: 'Failed to parse AI response as JSON. Please try again.' 
      };
    }

    // Format the JD for storage
    const { sections, sectionOrder } = formatJDForStorage(generatedJD);

    // Store the generated JD in the job_drafts table
    const { data, error } = await supabase
      .from('job_drafts')
      .insert({
        user_id: userId,
        title: generatedJD.overview.job_title,
        organization_name: generatedJD.overview.organization_name,
        location: generatedJD.overview.location,
        contract_type: generatedJD.overview.contract_type,
        sdgs: generatedJD.metadata.sdgs,
        sector: generatedJD.metadata.sectors[0] || null,
        draft_status: 'ready',
        ai_generated: true,
        ai_generation_method: generationMethod,
        sections: sections,
        section_order: sectionOrder,
        metadata: generatedJD.metadata,
        last_edited_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error storing generated JD in database:', error);
      
      // Update user progress flag to indicate JD generation failed
      await supabase
        .from('user_progress_flags')
        .update({ jd_generation_failed: true })
        .eq('user_id', userId);
      
      return { 
        success: false, 
        error: `Failed to store job description: ${error.message}` 
      };
    }

    // Update user progress flag to indicate JD generation succeeded
    await supabase
      .from('user_progress_flags')
      .update({ 
        has_generated_jd: true,
        jd_generation_failed: false
      })
      .eq('user_id', userId);

    return {
      success: true,
      draftId: data.id,
      data: generatedJD
    };
  } catch (error) {
    console.error('Error generating job description:', error);
    
    // Update user progress flag to indicate JD generation failed
    await supabase
      .from('user_progress_flags')
      .update({ jd_generation_failed: true })
      .eq('user_id', userId);
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Load a job draft from the database
 * @param draftId The ID of the job draft to load
 * @returns The job draft data
 */
export async function loadJobDraft(draftId: string) {
  const { data, error } = await supabase
    .from('job_drafts')
    .select('*')
    .eq('id', draftId)
    .single();

  if (error) {
    throw new Error(`Failed to load job draft: ${error.message}`);
  }

  return data;
}

/**
 * Update a job draft in the database
 * @param draftId The ID of the job draft to update
 * @param updates The updates to apply to the job draft
 * @returns The updated job draft data
 */
export async function updateJobDraft(draftId: string, updates: any) {
  const { data, error } = await supabase
    .from('job_drafts')
    .update({
      ...updates,
      last_edited_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', draftId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to update job draft: ${error.message}`);
  }

  return data;
}

/**
 * Publish a job draft to the jobs table
 * @param draftId The ID of the job draft to publish
 * @returns The published job data
 */
export async function publishJobDraft(draftId: string, userId: string) {
  // First, get the draft data
  const { data: draft, error: draftError } = await supabase
    .from('job_drafts')
    .select('*')
    .eq('id', draftId)
    .single();

  if (draftError) {
    throw new Error(`Failed to load job draft for publishing: ${draftError.message}`);
  }

  // Generate a public token for the job
  const publicToken = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);

  // Insert the job into the jobs table
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert({
      user_id: userId,
      title: draft.title,
      description: draft.description || '',
      organization_name: draft.organization_name,
      organization_url: draft.organization_url,
      org_name: draft.org_name,
      org_website: draft.org_website,
      responsibilities: draft.responsibilities,
      qualifications: draft.qualifications,
      sdgs: draft.sdgs,
      sector: draft.sector,
      contract_type: draft.contract_type,
      location: draft.location,
      how_to_apply: draft.how_to_apply,
      application_end_date: draft.application_end_date,
      salary_range: draft.salary_range,
      benefits: draft.benefits,
      status: 'published',
      published_at: new Date().toISOString(),
      is_template: false,
      source_draft_id: draftId,
      ai_generated: draft.ai_generated,
      generation_metadata: draft.generation_metadata,
      sections: draft.sections,
      section_order: draft.section_order,
      public_token: publicToken,
      application_method: 'external',
      org_profile: draft.metadata?.org_profile || {}
    })
    .select('*')
    .single();

  if (jobError) {
    throw new Error(`Failed to publish job: ${jobError.message}`);
  }

  // Update user progress flag to indicate job has been published
  await supabase
    .from('user_progress_flags')
    .update({ has_published_job: true })
    .eq('user_id', userId);

  return job;
}

/**
 * Generate with AI wrapper that can switch between different AI providers
 * @param messages Array of messages to send to the AI
 * @param options Options for the AI call
 * @returns AI response
 */
export async function generateWithAI(messages: AIMessage[], options: any = {}) {
  // This function can be expanded to switch between different AI providers
  // based on configuration or environment variables
  return await callAI(messages, options);
}