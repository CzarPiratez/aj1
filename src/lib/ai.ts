// Global AI Integration for AidJobs Platform
// Centralized OpenRouter + DeepSeek configuration for all tools

export interface AIConfig {
  type: 'openrouter';
  name: string;
  key: string;
  default_model: string;
  description: string;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Global AI configuration - using environment variable
const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
const model = "deepseek/deepseek-chat-v3-0324";

export const AI_CONFIG: AIConfig = {
  type: 'openrouter',
  name: 'DeepSeek via OpenRouter',
  key: apiKey || '',
  default_model: model,
  description: 'Primary AI engine for all AidJobs tools — including JD generation, CV analysis, matching, refinement, tone suggestions, skill gaps, cover letters, and admin panel actions. Connected via OpenRouter.'
};

// Validate AI configuration
export function validateAIConfig(): boolean {
  if (!AI_CONFIG.key) {
    console.error('❌ OpenRouter API key not found. Please set VITE_OPENROUTER_API_KEY in your .env file');
    return false;
  }
  
  if (!AI_CONFIG.key.startsWith('sk-or-v1-')) {
    console.error('❌ Invalid OpenRouter API key format. Key should start with "sk-or-v1-"');
    return false;
  }
  
  return true;
}

// Core AI function for all AidJobs tools
export async function callAI(
  messages: AIMessage[],
  options: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  } = {}
): Promise<AIResponse> {
  if (!validateAIConfig()) {
    throw new Error('AI configuration is invalid. Please check your OpenRouter API key.');
  }

  const {
    model = AI_CONFIG.default_model,
    temperature = 0.7,
    max_tokens = 2000,
    stream = false
  } = options;

  try {
    console.log('🤖 Calling AI with model:', model);
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'AidJobs Platform'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        stream
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ OpenRouter API error:', response.status, errorData);
      throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      console.error('❌ Invalid response from OpenRouter API:', data);
      throw new Error('Invalid response from OpenRouter API');
    }

    console.log('✅ AI response received successfully');
    return {
      content: data.choices[0].message.content,
      usage: data.usage
    };
  } catch (error) {
    console.error('❌ AI API Error:', error);
    throw error;
  }
}

// Specialized AI functions for different AidJobs tools

// 1. Job Description Generation
export async function generateJobDescription(websiteContent: {
  title: string;
  description: string;
  content: string;
  url: string;
}): Promise<string> {
  const systemPrompt = `You are an AI job description expert for the nonprofit and development sector. Use the organization's website or project page to understand their mission, work, and context. Then generate a rich, mission-aligned job description for a role that fits within their goals. Make sure to include:

Job title (based on inferred needs)
Mission-aligned summary
Responsibilities (purpose-driven)
Skills & qualifications (realistic but thoughtful)
DEI-friendly language
Suggested salary range (based on region or similar benchmarks)
Optionally mention SDG relevance if identifiable
Hiring organization info (from the URL)

Do not generate generic content. Every JD must feel unique and aligned with the cause. Use warm, professional, inviting tone.`;

  const userPrompt = `Based on this organization's website content, please generate a comprehensive job description:

Organization: ${websiteContent.title}
Website: ${websiteContent.url}
Description: ${websiteContent.description}
Content: ${websiteContent.content}

Please create a job description that aligns with their mission and work.`;

  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);

  return response.content;
}

// 2. CV Analysis
export async function analyzeCVContent(cvText: string): Promise<string> {
  const systemPrompt = `You are an AI CV analysis expert specializing in nonprofit and development sector careers. Analyze the provided CV and provide comprehensive insights including:

- Skills assessment and strengths
- Experience relevance to nonprofit sector
- Areas for improvement
- Suggested career paths in nonprofit/development
- Skills gaps for target roles
- Recommendations for enhancement

Be constructive, encouraging, and specific. Focus on how their background can contribute to social impact work.`;

  const userPrompt = `Please analyze this CV content and provide detailed insights:

${cvText}`;

  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);

  return response.content;
}

// 3. Cover Letter Generation
export async function generateCoverLetter(
  cvSummary: string,
  jobDescription: string,
  organizationInfo: string
): Promise<string> {
  const systemPrompt = `You are an AI cover letter expert for nonprofit and development sector applications. Create compelling, personalized cover letters that:

- Connect candidate's experience to the specific role
- Demonstrate passion for the organization's mission
- Highlight relevant achievements and skills
- Use warm, professional tone appropriate for nonprofit sector
- Show understanding of the organization's work and values
- Include specific examples and quantifiable impact where possible

Make each cover letter unique and authentic, avoiding generic templates.`;

  const userPrompt = `Please write a cover letter based on:

CANDIDATE BACKGROUND:
${cvSummary}

JOB DESCRIPTION:
${jobDescription}

ORGANIZATION INFO:
${organizationInfo}`;

  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);

  return response.content;
}

// 4. Job Matching Analysis
export async function analyzeJobMatch(
  candidateProfile: string,
  jobDescription: string
): Promise<{
  score: number;
  explanation: string;
  strengths: string[];
  gaps: string[];
}> {
  const systemPrompt = `You are an AI matching expert for nonprofit recruitment. Analyze the compatibility between a candidate and a job posting. Provide:

1. Match score (0-100)
2. Detailed explanation of the match
3. Key strengths that align
4. Potential gaps or areas for development

Focus on both hard skills and soft skills, cultural fit, and mission alignment. Be thorough and constructive.`;

  const userPrompt = `Please analyze the match between this candidate and job:

CANDIDATE PROFILE:
${candidateProfile}

JOB DESCRIPTION:
${jobDescription}

Provide your analysis in this format:
SCORE: [0-100]
EXPLANATION: [detailed analysis]
STRENGTHS: [bullet points]
GAPS: [bullet points]`;

  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);

  // Parse the structured response
  const content = response.content;
  const scoreMatch = content.match(/SCORE:\s*(\d+)/);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
  
  const explanationMatch = content.match(/EXPLANATION:\s*(.*?)(?=STRENGTHS:|$)/s);
  const explanation = explanationMatch ? explanationMatch[1].trim() : '';
  
  const strengthsMatch = content.match(/STRENGTHS:\s*(.*?)(?=GAPS:|$)/s);
  const strengthsText = strengthsMatch ? strengthsMatch[1].trim() : '';
  const strengths = strengthsText.split('\n').filter(line => line.trim()).map(line => line.replace(/^[-•]\s*/, ''));
  
  const gapsMatch = content.match(/GAPS:\s*(.*?)$/s);
  const gapsText = gapsMatch ? gapsMatch[1].trim() : '';
  const gaps = gapsText.split('\n').filter(line => line.trim()).map(line => line.replace(/^[-•]\s*/, ''));

  return {
    score,
    explanation,
    strengths,
    gaps
  };
}

// 5. Skill Gap Analysis
export async function analyzeSkillGaps(
  currentSkills: string,
  targetRole: string
): Promise<string> {
  const systemPrompt = `You are an AI career development expert for the nonprofit sector. Analyze skill gaps and provide actionable upskilling recommendations including:

- Specific skills needed for target role
- Current skill assessment
- Priority skills to develop
- Learning resources and pathways
- Timeline for skill development
- Alternative roles that match current skills better

Be practical and encouraging, focusing on achievable development paths.`;

  const userPrompt = `Please analyze skill gaps for this career transition:

CURRENT SKILLS:
${currentSkills}

TARGET ROLE:
${targetRole}`;

  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);

  return response.content;
}

// 6. Organization Profile Generation
export async function generateOrganizationProfile(
  organizationInfo: string,
  websiteContent?: string
): Promise<string> {
  const systemPrompt = `You are an AI expert in nonprofit organization profiling. Create compelling organization profiles that attract top talent by highlighting:

- Mission and vision
- Impact and achievements
- Work culture and values
- Career development opportunities
- Benefits and compensation philosophy
- Team and leadership
- Current projects and initiatives

Make the profile engaging and authentic, showcasing what makes the organization unique.`;

  const userPrompt = `Please create an organization profile based on:

ORGANIZATION INFO:
${organizationInfo}

${websiteContent ? `WEBSITE CONTENT:\n${websiteContent}` : ''}`;

  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);

  return response.content;
}

// 7. Content Refinement
export async function refineContent(
  content: string,
  contentType: 'cv' | 'cover-letter' | 'job-description' | 'organization-profile',
  instructions?: string
): Promise<string> {
  const systemPrompt = `You are an AI content refinement expert for nonprofit sector materials. Improve the provided ${contentType} by:

- Enhancing clarity and readability
- Strengthening impact statements
- Improving professional tone
- Ensuring nonprofit sector relevance
- Adding compelling details where appropriate
- Maintaining authenticity and personal voice

${instructions ? `Additional instructions: ${instructions}` : ''}`;

  const userPrompt = `Please refine this ${contentType}:

${content}`;

  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);

  return response.content;
}

// 8. Alternative Career Paths
export async function suggestAlternativePaths(
  candidateBackground: string,
  currentInterests: string
): Promise<string> {
  const systemPrompt = `You are an AI career advisor specializing in nonprofit and development sector opportunities. Suggest alternative career paths by:

- Analyzing transferable skills
- Identifying adjacent roles and sectors
- Suggesting emerging opportunities in nonprofit space
- Providing specific role titles and descriptions
- Explaining how current background applies
- Recommending next steps for exploration

Be creative and comprehensive, considering both traditional and innovative nonprofit roles.`;

  const userPrompt = `Please suggest alternative career paths for:

BACKGROUND:
${candidateBackground}

INTERESTS:
${currentInterests}`;

  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);

  return response.content;
}

// 9. General AI Chat Assistant
export async function generateChatResponse(
  userMessage: string,
  conversationContext: string = '',
  userProfile?: any
): Promise<string> {
  const systemPrompt = `You are an AI assistant for AidJobs, a nonprofit recruitment platform. You help with:

- Job searching and career advice
- CV and cover letter assistance
- Organization hiring support
- Nonprofit sector insights
- Career development guidance
- Platform navigation

Be helpful, knowledgeable, and encouraging. Focus on nonprofit and development sector expertise. Keep responses concise but comprehensive.

${userProfile ? `User context: ${JSON.stringify(userProfile)}` : ''}`;

  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt }
  ];

  if (conversationContext) {
    messages.push({ role: 'user', content: `Context: ${conversationContext}` });
  }

  messages.push({ role: 'user', content: userMessage });

  const response = await callAI(messages);
  return response.content;
}

// Utility function to check AI service status
export async function checkAIStatus(): Promise<{
  available: boolean;
  model: string;
  error?: string;
}> {
  try {
    const response = await callAI([
      { role: 'user', content: 'Hello, please respond with "AI service is working"' }
    ], { max_tokens: 50 });

    return {
      available: true,
      model: AI_CONFIG.default_model,
    };
  } catch (error) {
    return {
      available: false,
      model: AI_CONFIG.default_model,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Initialize AI service on app start
export function initializeAI(): void {
  console.log('🔧 Initializing AI Service...');
  console.log('🔑 API Key:', AI_CONFIG.key ? `${AI_CONFIG.key.substring(0, 20)}...` : 'Not found');
  console.log('🤖 Model:', AI_CONFIG.default_model);
  
  if (validateAIConfig()) {
    console.log('✅ AI Service initialized:', AI_CONFIG.name);
    console.log('📝 Description:', AI_CONFIG.description);
    
    // Test the connection
    checkAIStatus().then(status => {
      if (status.available) {
        console.log('🟢 AI Service is online and ready');
      } else {
        console.log('🔴 AI Service is offline:', status.error);
      }
    });
  } else {
    console.warn('⚠️ AI Service not properly configured');
  }
}