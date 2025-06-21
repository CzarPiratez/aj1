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

// Global AI configuration - ONLY use environment variable
const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
const model = "deepseek/deepseek-chat-v3-0324:free";

export const AI_CONFIG: AIConfig = {
  type: 'openrouter',
  name: 'DeepSeek v3 via OpenRouter',
  key: apiKey || '',
  default_model: model,
  description: 'Primary AI engine for all AidJobs tools — including JD generation, CV analysis, matching, refinement, tone suggestions, skill gaps, cover letters, and admin panel actions. Connected via OpenRouter using DeepSeek v3 free tier.'
};

// Validate AI configuration
export function validateAIConfig(): boolean {
  if (!AI_CONFIG.key) {
    console.error('❌ OpenRouter API key not found. Please set VITE_OPENROUTER_API_KEY in your .env file');
    console.error('📝 Get your API key from: https://openrouter.ai/keys');
    return false;
  }
  
  if (!AI_CONFIG.key.startsWith('sk-or-v1-')) {
    console.error('❌ Invalid OpenRouter API key format. Key should start with "sk-or-v1-"');
    return false;
  }
  
  return true;
}

// Rate limit tracking with enhanced management
let lastRateLimitError: number | null = null;
let rateLimitResetTime: number | null = null;
const RATE_LIMIT_COOLDOWN = 60000; // 1 minute cooldown after rate limit
const RATE_LIMIT_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes if rate limit has reset

// Check if we're in a rate limit cooldown period
function isInRateLimitCooldown(): boolean {
  if (!lastRateLimitError) return false;
  
  // If we have a specific reset time, use that
  if (rateLimitResetTime && Date.now() < rateLimitResetTime) {
    return true;
  }
  
  // Otherwise use the general cooldown
  return Date.now() - lastRateLimitError < RATE_LIMIT_COOLDOWN;
}

// Get time until rate limit resets
function getTimeUntilReset(): string {
  if (!rateLimitResetTime) return 'unknown';
  
  const now = Date.now();
  if (now >= rateLimitResetTime) return 'now';
  
  const diffMs = rateLimitResetTime - now;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m`;
  } else {
    return `${diffMinutes}m`;
  }
}

// Enhanced rate limit error with better user guidance
function createRateLimitError(response: Response): Error {
  const rateLimitReset = response.headers.get('X-RateLimit-Reset');
  const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
  
  if (rateLimitReset) {
    rateLimitResetTime = parseInt(rateLimitReset);
  }
  
  const timeUntilReset = getTimeUntilReset();
  
  let errorMessage = '🚫 Daily AI request limit reached\n\n';
  
  if (timeUntilReset !== 'unknown' && timeUntilReset !== 'now') {
    errorMessage += `⏰ Rate limit resets in: ${timeUntilReset}\n\n`;
  }
  
  errorMessage += '💡 To continue using AI features:\n';
  errorMessage += '• Add credits at https://openrouter.ai/credits (recommended)\n';
  errorMessage += '• Wait for daily limit to reset (typically midnight UTC)\n';
  errorMessage += '• Free tier: 50 requests per day\n';
  errorMessage += '• With credits: 1000+ requests per day';
  
  return new Error(errorMessage);
}

// Core AI function for all AidJobs tools
export async function callAI(
  messages: AIMessage[],
  options: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
    skipRateLimitCheck?: boolean;
  } = {}
): Promise<AIResponse> {
  if (!validateAIConfig()) {
    throw new Error('AI configuration is invalid. Please check your OpenRouter API key in your .env file.');
  }

  // Check if we're in a rate limit cooldown (unless explicitly skipped)
  if (!options.skipRateLimitCheck && isInRateLimitCooldown()) {
    const timeUntilReset = getTimeUntilReset();
    throw new Error(`🚫 Rate limit active. ${timeUntilReset !== 'unknown' ? `Resets in: ${timeUntilReset}` : 'Please wait before trying again.'}\n\n💡 Add credits at https://openrouter.ai/credits to continue immediately.`);
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
      
      if (response.status === 429) {
        lastRateLimitError = Date.now();
        throw createRateLimitError(response);
      }
      
      throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    // Clear rate limit tracking on successful request
    lastRateLimitError = null;
    rateLimitResetTime = null;

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

// Enhanced utility function to check AI service status with better error handling
export async function checkAIStatus(): Promise<{
  available: boolean;
  model: string;
  error?: string;
  rateLimitInfo?: {
    isLimited: boolean;
    resetTime?: string;
    remaining?: number;
  };
}> {
  try {
    if (!validateAIConfig()) {
      return {
        available: false,
        model: AI_CONFIG.default_model,
        error: 'API key not configured. Please set VITE_OPENROUTER_API_KEY in your .env file.'
      };
    }

    // Check if we're currently in a rate limit cooldown
    if (isInRateLimitCooldown()) {
      const timeUntilReset = getTimeUntilReset();
      return {
        available: false,
        model: AI_CONFIG.default_model,
        error: `Rate limit active. ${timeUntilReset !== 'unknown' ? `Resets in: ${timeUntilReset}` : 'Please wait before trying again.'}`,
        rateLimitInfo: {
          isLimited: true,
          resetTime: timeUntilReset
        }
      };
    }

    // Skip rate limit check for status checks to avoid false negatives
    const response = await callAI([
      { role: 'user', content: 'Hello, please respond with "AI service is working"' }
    ], { max_tokens: 50, skipRateLimitCheck: true });

    return {
      available: true,
      model: AI_CONFIG.default_model,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Parse rate limit information from error message
    const isRateLimit = errorMessage.includes('Rate limit') || errorMessage.includes('🚫');
    
    return {
      available: false,
      model: AI_CONFIG.default_model,
      error: errorMessage,
      rateLimitInfo: isRateLimit ? {
        isLimited: true,
        resetTime: getTimeUntilReset()
      } : undefined
    };
  }
}

// Initialize AI service on app start with enhanced logging
export function initializeAI(): void {
  console.log('🔧 Initializing AI Service...');
  console.log('🔑 API Key:', AI_CONFIG.key ? `${AI_CONFIG.key.substring(0, 20)}...` : 'Not configured');
  console.log('🤖 Model:', AI_CONFIG.default_model);
  
  if (!AI_CONFIG.key) {
    console.warn('⚠️ OpenRouter API key not found in environment variables');
    console.warn('📝 Please set VITE_OPENROUTER_API_KEY in your .env file');
    console.warn('🔗 Get your API key from: https://openrouter.ai/keys');
    return;
  }
  
  if (validateAIConfig()) {
    console.log('✅ AI Service initialized:', AI_CONFIG.name);
    console.log('📝 Description:', AI_CONFIG.description);
    
    // Test the connection (but don't block initialization)
    checkAIStatus().then(status => {
      if (status.available) {
        console.log('🟢 AI Service is online and ready');
      } else {
        console.log('🔴 AI Service status:', status.error);
        
        // Provide helpful guidance for rate limits
        if (status.rateLimitInfo?.isLimited) {
          console.log('💡 Rate limit guidance:');
          console.log('   • Add credits at https://openrouter.ai/credits (recommended)');
          console.log('   • Wait for daily limit to reset');
          console.log('   • Free tier: 50 requests per day');
          console.log('   • With credits: 1000+ requests per day');
          
          if (status.rateLimitInfo.resetTime && status.rateLimitInfo.resetTime !== 'unknown') {
            console.log(`   • Current reset time: ${status.rateLimitInfo.resetTime}`);
          }
        }
      }
    }).catch(error => {
      console.log('🔴 AI Service connection test failed:', error.message);
    });
  } else {
    console.warn('⚠️ AI Service not properly configured');
  }
}

// Export rate limit utilities for use in UI components
export const rateLimitUtils = {
  isInCooldown: isInRateLimitCooldown,
  getTimeUntilReset,
  getRateLimitInfo: () => ({
    lastError: lastRateLimitError,
    resetTime: rateLimitResetTime,
    timeUntilReset: getTimeUntilReset()
  })
};