// Global AI Integration for AidJobs Platform
// Centralized OpenRouter + DeepSeek configuration with automatic key rotation

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

// OpenRouter configuration using environment variables with NEXT_PUBLIC_ prefix
const AI_CONFIGS: AIConfig[] = [
  {
    type: 'openrouter',
    name: 'DeepSeek Chat V3 Primary',
    key: import.meta.env.VITE_OPENROUTER_API_KEY_1 || process.env.VITE_OPENROUTER_API_KEY_1 || '',
    default_model: 'deepseek/deepseek-chat-v3-0324:free',
    description: 'Primary AI engine - DeepSeek Chat V3 0324 Free via OpenRouter'
  },
  {
    type: 'openrouter',
    name: 'DeepSeek Chat V3 Secondary',
    key: import.meta.env.VITE_OPENROUTER_API_KEY_2 || process.env.VITE_OPENROUTER_API_KEY_2 || '',
    default_model: 'deepseek/deepseek-chat-v3-0324:free',
    description: 'Secondary AI engine - DeepSeek Chat V3 0324 Free via OpenRouter'
  },
  {
    type: 'openrouter',
    name: 'DeepSeek Chat V3 Tertiary',
    key: import.meta.env.VITE_OPENROUTER_API_KEY_3 || process.env.VITE_OPENROUTER_API_KEY_3 || '',
    default_model: 'deepseek/deepseek-chat-v3-0324:free',
    description: 'Tertiary AI engine - DeepSeek Chat V3 0324 Free via OpenRouter'
  }
];

// Get the primary AI config (first available)
export const AI_CONFIG = AI_CONFIGS.find(config => config.key) || AI_CONFIGS[0];

// Validate AI configuration
export function validateAIConfig(): boolean {
  const hasValidConfig = AI_CONFIGS.some(config => {
    if (!config.key) return false;
    if (!config.key.startsWith('sk-or-v1-')) return false;
    return true;
  });

  if (!hasValidConfig) {
    console.error('❌ No valid OpenRouter API keys found. Please set at least one of:');
    console.error('   VITE_OPENROUTER_API_KEY_1, VITE_OPENROUTER_API_KEY_2, VITE_OPENROUTER_API_KEY_3');
    console.error('📝 Get your API keys from: https://openrouter.ai/keys');
    return false;
  }
  
  return true;
}

// Enhanced error logging to Supabase with better error handling
async function logError(
  errorType: string,
  details: string,
  source: string,
  userId?: string
): Promise<void> {
  try {
    const { supabase } = await import('@/lib/supabase');
    
    // Get current user if not provided
    let finalUserId = userId;
    if (!finalUserId) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        finalUserId = user?.id || null;
      } catch (authError) {
        // If we can't get user, we'll log without user_id
        finalUserId = null;
      }
    }
    
    const { error } = await supabase
      .from('error_logs')
      .insert({
        user_id: finalUserId,
        error_type: errorType,
        details: details,
        source: source,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to log error to database:', error);
      // Don't throw here to avoid infinite loops
    } else {
      console.log('✅ Error logged to database successfully');
    }
  } catch (error) {
    console.error('Failed to log error to database:', error);
    // Don't throw here to avoid infinite loops
  }
}

// Validate AI response
function validateAIResponse(response: any): boolean {
  if (!response || !response.choices || !response.choices[0]) {
    return false;
  }
  
  const content = response.choices[0].message?.content;
  if (!content || typeof content !== 'string') {
    return false;
  }
  
  // Ensure response is at least 10 characters
  if (content.trim().length < 10) {
    return false;
  }
  
  return true;
}

// Enhanced rate limit detection
function isRateLimitError(error: any): boolean {
  if (typeof error === 'string') {
    return error.includes('429') || 
           error.includes('rate limit') || 
           error.includes('Rate limit exceeded') ||
           error.includes('free-models-per-min') ||
           error.includes('free-models-per-day');
  }
  
  if (error instanceof Error) {
    return error.message.includes('429') || 
           error.message.includes('rate limit') || 
           error.message.includes('Rate limit exceeded') ||
           error.message.includes('free-models-per-min') ||
           error.message.includes('free-models-per-day');
  }
  
  return false;
}

// Core OpenRouter API call function with key rotation
export async function callOpenRouter(
  modelName: string,
  messages: AIMessage[],
  options: {
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  } = {}
): Promise<AIResponse> {
  const {
    temperature = 0.7,
    max_tokens = 2000,
    stream = false
  } = options;

  if (!validateAIConfig()) {
    throw new Error('AI configuration is invalid. Please check your OpenRouter API keys in your .env file.');
  }

  // Try each API key in order until one succeeds
  const validConfigs = AI_CONFIGS.filter(config => config.key);
  let lastError: Error | null = null;
  let rateLimitedKeys: string[] = [];

  for (const config of validConfigs) {
    try {
      console.log(`🤖 Trying ${config.name} with model: ${modelName}`);
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AidJobs Platform'
        },
        body: JSON.stringify({
          model: modelName,
          messages,
          temperature,
          max_tokens,
          stream
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = `${config.name} API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`;
        
        // Check for rate limiting - don't retry rate limit errors, move to next key
        if (response.status === 429 || isRateLimitError(errorMessage)) {
          rateLimitedKeys.push(config.name);
          console.log(`⚠️ ${config.name} is rate limited, trying next key...`);
          throw new Error(errorMessage);
        }
        
        // Check for server errors and retry with same key
        if (response.status >= 500) {
          console.log(`🔄 Server error from ${config.name}, trying next key...`);
          throw new Error(errorMessage);
        }
        
        // Log non-rate-limit errors (but don't fail if logging fails)
        try {
          await logError(
            'AI_API_ERROR',
            errorMessage,
            `callOpenRouter - ${config.name}`
          );
        } catch (logError) {
          console.warn('Could not log error to database:', logError);
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!validateAIResponse(data)) {
        const errorMessage = 'Invalid or insufficient response from AI model';
        
        try {
          await logError(
            'AI_VALIDATION_ERROR',
            `${errorMessage} - Response: ${JSON.stringify(data)}`,
            `callOpenRouter - ${config.name}`
          );
        } catch (logError) {
          console.warn('Could not log error to database:', logError);
        }
        
        throw new Error(errorMessage);
      }

      console.log(`✅ ${config.name} responded successfully`);
      return {
        content: data.choices[0].message.content,
        usage: data.usage
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Track rate limited keys
      if (isRateLimitError(lastError.message)) {
        if (!rateLimitedKeys.includes(config.name)) {
          rateLimitedKeys.push(config.name);
        }
      }
      
      console.log(`⚠️ ${config.name} failed, trying next key...`);
      continue;
    }
  }

  // All keys failed - provide helpful error message
  let errorMessage = 'All OpenRouter API keys are temporarily unavailable.';
  
  if (rateLimitedKeys.length === validConfigs.length) {
    errorMessage = `All OpenRouter API keys have hit their rate limits. This is common with free tier usage. Please try again in a few minutes, or consider upgrading your OpenRouter account for higher limits.

Rate limited keys: ${rateLimitedKeys.join(', ')}

To resolve this:
1. Wait a few minutes and try again
2. Add credits to your OpenRouter account for higher limits
3. Contact support if the issue persists`;
  } else if (rateLimitedKeys.length > 0) {
    errorMessage = `Some OpenRouter API keys are rate limited, others failed with errors. Please try again in a few minutes.

Rate limited: ${rateLimitedKeys.join(', ')}
Last error: ${lastError?.message}`;
  }
  
  try {
    await logError(
      'AI_ALL_KEYS_FAILED',
      `All ${validConfigs.length} keys failed. Rate limited: ${rateLimitedKeys.length}. Last error: ${lastError?.message}`,
      'callOpenRouter'
    );
  } catch (logError) {
    console.warn('Could not log error to database:', logError);
  }
  
  throw new Error(errorMessage);
}

// Core AI function with automatic fallback and better rate limit handling
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
  const {
    model = 'deepseek/deepseek-chat-v3-0324:free',
    temperature = 0.7,
    max_tokens = 2000,
    stream = false
  } = options;

  return await callOpenRouter(model, messages, {
    temperature,
    max_tokens,
    stream
  });
}

// Specialized AI functions for different AidJobs tools

// 1. Job Description Generation
export async function generateJobDescription(websiteContent: {
  title: string;
  description: string;
  content: string;
  url: string;
}): Promise<string> {
  const systemPrompt = `You are an AI job description expert for the nonprofit and development sector. Use the organization's website or project page to understand their mission, work, and context. Then generate a rich, mission-aligned job description for a role that fits within their goals.

Create a comprehensive job description that includes:
- Clear job title (based on inferred needs)
- Mission-aligned summary that connects to the organization's purpose
- Detailed responsibilities that are purpose-driven and specific
- Skills & qualifications (realistic but thoughtful)
- DEI-friendly language throughout
- Suggested salary range (based on region or similar benchmarks)
- SDG relevance if identifiable
- Clear application instructions

Make it professional, engaging, and unique to this organization. Use warm, professional, inviting tone that attracts mission-driven candidates.`;

  const userPrompt = `Based on this organization's website content, please generate a comprehensive job description:

Organization: ${websiteContent.title}
Website: ${websiteContent.url}
Description: ${websiteContent.description}
Content: ${websiteContent.content}

Please create a job description that aligns with their mission and work.`;

  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], { 
    model: 'deepseek/deepseek-chat-v3-0324:free',
    temperature: 0.8, 
    max_tokens: 3000 
  });

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
  ], { 
    model: 'deepseek/deepseek-chat-v3-0324:free',
    temperature: 0.6, 
    max_tokens: 2500 
  });

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
  ], { 
    model: 'deepseek/deepseek-chat-v3-0324:free',
    temperature: 0.7, 
    max_tokens: 2000 
  });

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
  ], { 
    model: 'deepseek/deepseek-chat-v3-0324:free',
    temperature: 0.5, 
    max_tokens: 2000 
  });

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
  ], { 
    model: 'deepseek/deepseek-chat-v3-0324:free',
    temperature: 0.6, 
    max_tokens: 2500 
  });

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
  ], { 
    model: 'deepseek/deepseek-chat-v3-0324:free',
    temperature: 0.7, 
    max_tokens: 2500 
  });

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
  ], { 
    model: 'deepseek/deepseek-chat-v3-0324:free',
    temperature: 0.6, 
    max_tokens: 2500 
  });

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
  ], { 
    model: 'deepseek/deepseek-chat-v3-0324:free',
    temperature: 0.8, 
    max_tokens: 2500 
  });

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

  const response = await callAI(messages, { 
    model: 'deepseek/deepseek-chat-v3-0324:free',
    temperature: 0.7, 
    max_tokens: 1500 
  });
  
  return response.content;
}

// Enhanced utility function to check AI service status
export async function checkAIStatus(): Promise<{
  available: boolean;
  model: string;
  error?: string;
  workingKeys?: string[];
  failedKeys?: string[];
}> {
  try {
    if (!validateAIConfig()) {
      return {
        available: false,
        model: 'none',
        error: 'No valid API keys configured. Please set VITE_OPENROUTER_API_KEY_1, _2, or _3 in your .env file.'
      };
    }

    // Test with a longer message to pass validation
    const testMessages: AIMessage[] = [
      { 
        role: 'user', 
        content: 'Say "AI system working and all components are fully operational, ready to assist with your requests" and nothing else.' 
      }
    ];

    const validConfigs = AI_CONFIGS.filter(config => config.key);
    const workingKeys: string[] = [];
    const failedKeys: string[] = [];

    // Test each key
    for (const config of validConfigs) {
      try {
        await callOpenRouter('deepseek/deepseek-chat-v3-0324:free', testMessages, { max_tokens: 100 });
        workingKeys.push(config.name);
        // If first key works, we're good
        break;
      } catch (error) {
        failedKeys.push(config.name);
        console.log(`⚠️ ${config.name} status check failed:`, error instanceof Error ? error.message : error);
      }
    }

    if (workingKeys.length > 0) {
      return {
        available: true,
        model: 'deepseek/deepseek-chat-v3-0324:free',
        workingKeys,
        failedKeys
      };
    } else {
      return {
        available: false,
        model: 'none',
        error: 'All OpenRouter API keys are currently unavailable or rate limited',
        workingKeys,
        failedKeys
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Only log non-rate-limit errors to avoid spam (but don't fail if logging fails)
    if (!errorMessage.includes('429') && !errorMessage.includes('rate limit')) {
      try {
        await logError(
          'AI_STATUS_CHECK_ERROR',
          errorMessage,
          'checkAIStatus'
        );
      } catch (logError) {
        console.warn('Could not log error to database:', logError);
      }
    }
    
    return {
      available: false,
      model: 'none',
      error: errorMessage
    };
  }
}

// Initialize AI service on app start with enhanced logging
export function initializeAI(): void {
  console.log('🔧 Initializing AI Service...');
  
  const validConfigs = AI_CONFIGS.filter(config => config.key);
  console.log(`🔑 Found ${validConfigs.length} valid API keys out of ${AI_CONFIGS.length} total`);
  
  validConfigs.forEach((config, index) => {
    console.log(`   ${index + 1}. ${config.name}: ${config.key.substring(0, 20)}...`);
  });
  
  if (validConfigs.length === 0) {
    console.warn('⚠️ No valid OpenRouter API keys found in environment variables');
    console.warn('📝 Please set at least one of: VITE_OPENROUTER_API_KEY_1, VITE_OPENROUTER_API_KEY_2, VITE_OPENROUTER_API_KEY_3');
    console.warn('🔗 Get your API keys from: https://openrouter.ai/keys');
    return;
  }
  
  console.log('✅ AI Service initialized with DeepSeek Chat V3 (deepseek/deepseek-chat-v3-0324:free)');
  console.log(`🎯 Primary model: ${validConfigs[0].name} (${validConfigs[0].default_model})`);
  console.log('🔄 Automatic key rotation enabled for rate limit handling');
  
  // Test the connection (but don't block initialization)
  checkAIStatus().then(status => {
    if (status.available) {
      console.log('🟢 AI Service is online and ready');
      if (status.workingKeys && status.workingKeys.length > 0) {
        console.log(`✅ Working keys: ${status.workingKeys.join(', ')}`);
      }
      if (status.failedKeys && status.failedKeys.length > 0) {
        console.log(`⚠️ Failed/Rate-limited keys: ${status.failedKeys.join(', ')}`);
      }
    } else {
      console.log('🔴 AI Service status:', status.error);
    }
  }).catch(error => {
    console.log('🔴 AI Service connection test failed:', error.message);
  });
}