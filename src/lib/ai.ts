// Global AI Integration for AidJobs Platform
// Centralized OpenRouter + DeepSeek configuration with rotating key fallback

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

// Parse API keys from environment variable
function parseApiKeys(): string[] {
  const keysString = import.meta.env.VITE_OPENROUTER_API_KEYS || '';
  if (!keysString) {
    console.error('❌ No OpenRouter API keys found in VITE_OPENROUTER_API_KEYS');
    return [];
  }
  
  const keys = keysString.split(',').map(key => key.trim()).filter(key => key.length > 0);
  console.log(`🔑 Loaded ${keys.length} OpenRouter API keys`);
  return keys;
}

// Get the model from environment
function getModel(): string {
  const model = import.meta.env.VITE_OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3-0324:free';
  console.log(`🤖 Using model: ${model}`);
  return model;
}

// Global configuration
const API_KEYS = parseApiKeys();
const MODEL = getModel();

// Validate configuration
export function validateAIConfig(): boolean {
  if (API_KEYS.length === 0) {
    console.error('❌ No valid OpenRouter API keys found. Please set VITE_OPENROUTER_API_KEYS in your .env file.');
    console.error('📝 Format: VITE_OPENROUTER_API_KEYS=key1,key2,key3,key4');
    console.error('🔗 Get your API keys from: https://openrouter.ai/keys');
    return false;
  }

  // Validate key format
  const invalidKeys = API_KEYS.filter(key => !key.startsWith('sk-or-v1-'));
  if (invalidKeys.length > 0) {
    console.error('❌ Invalid OpenRouter API key format detected:', invalidKeys);
    console.error('📝 Keys should start with "sk-or-v1-"');
    return false;
  }
  
  console.log(`✅ AI configuration valid: ${API_KEYS.length} keys, model: ${MODEL}`);
  return true;
}

// Enhanced error logging to Supabase
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
    }
  } catch (error) {
    console.error('Failed to log error to database:', error);
  }
}

// Enhanced rate limit and error detection
function isRateLimitError(error: any): boolean {
  if (typeof error === 'string') {
    return error.includes('429') || 
           error.includes('rate limit') || 
           error.includes('Rate limit exceeded') ||
           error.includes('free-models-per-min') ||
           error.includes('free-models-per-day') ||
           error.includes('quota');
  }
  
  if (error instanceof Error) {
    return error.message.includes('429') || 
           error.message.includes('rate limit') || 
           error.message.includes('Rate limit exceeded') ||
           error.message.includes('free-models-per-min') ||
           error.message.includes('free-models-per-day') ||
           error.message.includes('quota');
  }
  
  return false;
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

// Core OpenRouter API call function with rotating key fallback
export async function callOpenRouter(
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
  let lastError: Error | null = null;
  let rateLimitedKeys: string[] = [];
  let failedKeys: string[] = [];

  for (let i = 0; i < API_KEYS.length; i++) {
    const apiKey = API_KEYS[i];
    const keyName = `Key ${i + 1}`;
    
    try {
      console.log(`🤖 Trying ${keyName} with model: ${MODEL}`);
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AidJobs Platform'
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature,
          max_tokens,
          stream
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = `${keyName} API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`;
        
        // Check for rate limiting - move to next key immediately
        if (response.status === 429 || isRateLimitError(errorMessage)) {
          rateLimitedKeys.push(keyName);
          console.log(`⚠️ ${keyName} is rate limited, trying next key...`);
          lastError = new Error(errorMessage);
          continue;
        }
        
        // Check for server errors and retry with next key
        if (response.status >= 500) {
          failedKeys.push(keyName);
          console.log(`🔄 Server error from ${keyName}, trying next key...`);
          lastError = new Error(errorMessage);
          continue;
        }
        
        // Log non-rate-limit errors
        try {
          await logError(
            'AI_API_ERROR',
            errorMessage,
            `callOpenRouter - ${keyName}`
          );
        } catch (logError) {
          console.warn('Could not log error to database:', logError);
        }
        
        lastError = new Error(errorMessage);
        failedKeys.push(keyName);
        continue;
      }

      const data = await response.json();
      
      if (!validateAIResponse(data)) {
        const errorMessage = 'Invalid or insufficient response from AI model';
        
        try {
          await logError(
            'AI_VALIDATION_ERROR',
            `${errorMessage} - Response: ${JSON.stringify(data)}`,
            `callOpenRouter - ${keyName}`
          );
        } catch (logError) {
          console.warn('Could not log error to database:', logError);
        }
        
        lastError = new Error(errorMessage);
        failedKeys.push(keyName);
        continue;
      }

      console.log(`✅ ${keyName} responded successfully`);
      return {
        content: data.choices[0].message.content,
        usage: data.usage
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Track rate limited keys
      if (isRateLimitError(lastError.message)) {
        if (!rateLimitedKeys.includes(keyName)) {
          rateLimitedKeys.push(keyName);
        }
      } else {
        failedKeys.push(keyName);
      }
      
      console.log(`⚠️ ${keyName} failed: ${lastError.message}`);
      continue;
    }
  }

  // All keys failed - provide helpful error message
  let errorMessage = 'All OpenRouter API keys are temporarily unavailable.';
  
  if (rateLimitedKeys.length === API_KEYS.length) {
    errorMessage = `All ${API_KEYS.length} OpenRouter API keys have hit their rate limits. This is common with free tier usage. Please try again in a few minutes.

Rate limited keys: ${rateLimitedKeys.join(', ')}

To resolve this:
1. Wait a few minutes and try again
2. Add credits to your OpenRouter account for higher limits
3. Contact support if the issue persists`;
  } else if (rateLimitedKeys.length > 0) {
    errorMessage = `Some OpenRouter API keys are rate limited, others failed with errors. Please try again in a few minutes.

Rate limited: ${rateLimitedKeys.join(', ')}
Failed: ${failedKeys.join(', ')}
Last error: ${lastError?.message}`;
  } else {
    errorMessage = `All ${API_KEYS.length} OpenRouter API keys failed with errors.

Failed keys: ${failedKeys.join(', ')}
Last error: ${lastError?.message}`;
  }
  
  try {
    await logError(
      'AI_ALL_KEYS_FAILED',
      `All ${API_KEYS.length} keys failed. Rate limited: ${rateLimitedKeys.length}, Failed: ${failedKeys.length}. Last error: ${lastError?.message}`,
      'callOpenRouter'
    );
  } catch (logError) {
    console.warn('Could not log error to database:', logError);
  }
  
  throw new Error(errorMessage);
}

// Core AI function with automatic fallback
export async function callAI(
  messages: AIMessage[],
  options: {
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  } = {}
): Promise<AIResponse> {
  return await callOpenRouter(messages, options);
}

// CV Analysis
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
    temperature: 0.6, 
    max_tokens: 2500 
  });

  return response.content;
}

// Cover Letter Generation
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
    temperature: 0.7, 
    max_tokens: 2000 
  });

  return response.content;
}

// Job Matching Analysis
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

// Skill Gap Analysis
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
    temperature: 0.6, 
    max_tokens: 2500 
  });

  return response.content;
}

// Organization Profile Generation
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
    temperature: 0.7, 
    max_tokens: 2500 
  });

  return response.content;
}

// Content Refinement
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
    temperature: 0.6, 
    max_tokens: 2500 
  });

  return response.content;
}

// Alternative Career Paths
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
    temperature: 0.8, 
    max_tokens: 2500 
  });

  return response.content;
}

// Enhanced General AI Chat Assistant
export async function generateChatResponse(
  userMessage: string,
  conversationContext: string = '',
  userProfile?: any
): Promise<string> {
  let systemPrompt = `You are an AI assistant for AidJobs, a nonprofit recruitment platform. You help with:

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
  workingKeys?: number;
  totalKeys?: number;
}> {
  try {
    if (!validateAIConfig()) {
      return {
        available: false,
        model: 'none',
        error: 'No valid API keys configured. Please set VITE_OPENROUTER_API_KEYS in your .env file.',
        totalKeys: API_KEYS.length
      };
    }

    // Test with a simple message
    const testMessages: AIMessage[] = [
      { 
        role: 'user', 
        content: 'Say "AI system working and all components are fully operational, ready to assist with your requests" and nothing else.' 
      }
    ];

    let workingKeys = 0;
    
    // Test first key only for status check (to avoid hitting all keys)
    try {
      await callOpenRouter(testMessages, { max_tokens: 100 });
      workingKeys = 1; // At least one key is working
    } catch (error) {
      // If first key fails, we'll report as unavailable but still show total keys
      console.log('AI status check: First key failed, but others may work');
    }

    return {
      available: workingKeys > 0,
      model: MODEL,
      workingKeys,
      totalKeys: API_KEYS.length
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Only log non-rate-limit errors
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
      error: errorMessage,
      totalKeys: API_KEYS.length
    };
  }
}

// Initialize AI service on app start
export function initializeAI(): void {
  console.log('🔧 Initializing AI Service...');
  console.log(`🤖 Model: ${MODEL}`);
  console.log(`🔑 API Keys: ${API_KEYS.length} configured`);
  
  if (API_KEYS.length === 0) {
    console.warn('⚠️ No OpenRouter API keys found in VITE_OPENROUTER_API_KEYS');
    console.warn('📝 Please set VITE_OPENROUTER_API_KEYS=key1,key2,key3,key4 in your .env file');
    console.warn('🔗 Get your API keys from: https://openrouter.ai/keys');
    return;
  }
  
  // Show obfuscated keys for debugging
  API_KEYS.forEach((key, index) => {
    const obfuscated = key.substring(0, 12) + '*'.repeat(8) + key.substring(key.length - 4);
    console.log(`   ${index + 1}. ${obfuscated}`);
  });
  
  console.log('✅ AI Service initialized with rotating key fallback');
  console.log('🔄 Automatic key rotation enabled for rate limit handling');
  
  // Test the connection (but don't block initialization)
  checkAIStatus().then(status => {
    if (status.available) {
      console.log(`🟢 AI Service is online (${status.workingKeys}/${status.totalKeys} keys working)`);
    } else {
      console.log(`🔴 AI Service status: ${status.error} (${status.totalKeys} keys configured)`);
    }
  }).catch(error => {
    console.log('🔴 AI Service connection test failed:', error.message);
  });
}