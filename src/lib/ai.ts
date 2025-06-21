// Enhanced AI Integration with Multiple OpenRouter Models and Fallback
// Centralized AI service for all AidJobs tools with robust error handling

export interface AIConfig {
  type: 'openrouter';
  name: string;
  key: string;
  model: string;
  priority: number;
  description: string;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Multiple AI configurations with fallback priority
const AI_CONFIGS: AIConfig[] = [
  {
    type: 'openrouter',
    name: 'DeepSeek R1 Qwen3 8B',
    key: import.meta.env.VITE_OPENROUTER_API_KEY_1 || '',
    model: 'deepseek/deepseek-r1-0528-qwen3-8b:free',
    priority: 1,
    description: 'Primary AI model for job description generation'
  },
  {
    type: 'openrouter',
    name: 'DeepSeek R1',
    key: import.meta.env.VITE_OPENROUTER_API_KEY_2 || '',
    model: 'deepseek/deepseek-r1-0528:free',
    priority: 2,
    description: 'Secondary AI model for fallback'
  },
  {
    type: 'openrouter',
    name: 'Qwen3 14B',
    key: import.meta.env.VITE_OPENROUTER_API_KEY_3 || '',
    model: 'qwen/qwen3-14b-04-28:free',
    priority: 3,
    description: 'Tertiary AI model for fallback'
  }
];

// Validate AI configurations
export function validateAIConfigs(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const config of AI_CONFIGS) {
    if (!config.key) {
      errors.push(`Missing API key for ${config.name} (VITE_OPENROUTER_API_KEY_${config.priority})`);
    } else if (!config.key.startsWith('sk-or-v1-')) {
      errors.push(`Invalid API key format for ${config.name}`);
    }
  }
  
  if (errors.length > 0) {
    console.error('❌ AI Configuration Errors:', errors);
    return { valid: false, errors };
  }
  
  return { valid: true, errors: [] };
}

// Rate limit tracking
let lastRateLimitError: number | null = null;
const RATE_LIMIT_COOLDOWN = 60000; // 1 minute cooldown

function isInRateLimitCooldown(): boolean {
  if (!lastRateLimitError) return false;
  return Date.now() - lastRateLimitError < RATE_LIMIT_COOLDOWN;
}

// Check if error is retryable
function isRetryableError(error: any): boolean {
  if (error.status) {
    return error.status === 429 || // Rate limit
           error.status >= 500 ||   // Server errors
           error.status === 408;    // Timeout
  }
  
  return error.name === 'TypeError' || 
         error.name === 'NetworkError' ||
         error.message?.includes('timeout') ||
         error.message?.includes('network') ||
         error.message?.includes('fetch');
}

// Validate AI response
function validateAIResponse(response: any): boolean {
  return response &&
         response.choices &&
         response.choices.length > 0 &&
         response.choices[0].message &&
         response.choices[0].message.content &&
         response.choices[0].message.content.trim().length > 50;
}

// Log error to Supabase
async function logError(
  userId: string | null,
  errorType: string,
  details: string,
  source: string
): Promise<void> {
  try {
    const { supabase } = await import('./supabase');
    const { error } = await supabase
      .from('error_logs')
      .insert({
        user_id: userId,
        error_type: errorType,
        details,
        source
      });

    if (error) {
      console.error('Failed to log error to database:', error);
    }
  } catch (err) {
    console.error('Error logging to database:', err);
  }
}

// Call single AI model
async function callSingleModel(
  config: AIConfig,
  messages: AIMessage[],
  userId: string | null
): Promise<AIResponse> {
  console.log(`🤖 Trying model: ${config.name} (${config.model})`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'AidJobs Platform'
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(`HTTP ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
      (error as any).status = response.status;
      throw error;
    }

    const data = await response.json();
    
    if (!validateAIResponse(data)) {
      throw new Error('Invalid or insufficient response from AI model');
    }

    console.log(`✅ Success with model: ${config.name}`);
    return {
      content: data.choices[0].message.content,
      model: config.model,
      usage: data.usage
    };

  } catch (error: any) {
    console.error(`❌ Model ${config.name} failed:`, error.message);
    
    // Log the error
    await logError(
      userId,
      'ai_model_failure',
      `Model: ${config.model}, Error: ${error.message}`,
      'ai_fallback_system'
    );
    
    throw error;
  }
}

// Main AI call with fallback logic
export async function callAI(
  messages: AIMessage[],
  options: {
    userId?: string | null;
    skipRateLimitCheck?: boolean;
  } = {}
): Promise<AIResponse> {
  const { userId = null, skipRateLimitCheck = false } = options;
  
  // Validate configurations
  const validation = validateAIConfigs();
  if (!validation.valid) {
    throw new Error(`AI configuration invalid: ${validation.errors.join(', ')}`);
  }

  // Check rate limit cooldown
  if (!skipRateLimitCheck && isInRateLimitCooldown()) {
    throw new Error('Rate limit active. Please wait before trying again.');
  }

  console.log('🔄 Starting AI call with fallback logic...');
  
  const errors: string[] = [];
  
  // Try each model in priority order
  for (const config of AI_CONFIGS) {
    try {
      const response = await callSingleModel(config, messages, userId);
      
      // Clear rate limit tracking on success
      lastRateLimitError = null;
      
      console.log(`🎉 Successfully generated response using: ${config.name}`);
      return response;
      
    } catch (error: any) {
      errors.push(`${config.name}: ${error.message}`);
      
      // Track rate limits
      if (error.status === 429) {
        lastRateLimitError = Date.now();
      }
      
      // If this is not a retryable error, don't try other models
      if (!isRetryableError(error)) {
        console.error(`💥 Non-retryable error with ${config.name}, stopping fallback`);
        break;
      }
      
      console.log(`⏭️ Trying next model due to error: ${error.message}`);
      continue;
    }
  }
  
  // All models failed
  const allErrors = errors.join('; ');
  console.error('💥 All AI models failed:', allErrors);
  
  // Log the complete failure
  await logError(
    userId,
    'all_ai_models_failed',
    `All models failed: ${allErrors}`,
    'ai_fallback_system'
  );
  
  throw new Error('Sorry — all AI models are temporarily unavailable. Please try again shortly.');
}

// Specialized functions for different AidJobs tools

// 1. Job Description Generation
export async function generateJobDescription(input: {
  content: string;
  type: 'brief' | 'upload' | 'link';
  userId?: string;
}): Promise<string> {
  const systemPrompt = `You are a nonprofit HR assistant who writes expert job descriptions based on user briefs. Create comprehensive, professional job descriptions that are inclusive, mission-aligned, and follow nonprofit sector best practices. Include clear sections for role overview, responsibilities, qualifications, and application process.`;

  let userPrompt = '';
  
  switch (input.type) {
    case 'brief':
      userPrompt = `Please create a comprehensive job description based on this brief: "${input.content}"`;
      break;
    case 'upload':
      userPrompt = `Please refine and improve this job description draft: "${input.content}"`;
      break;
    case 'link':
      userPrompt = `Please rewrite this job posting with better clarity, DEI language, and nonprofit alignment: "${input.content}"`;
      break;
  }

  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], { userId: input.userId });

  return response.content;
}

// 2. CV Analysis
export async function analyzeCVContent(cvText: string, userId?: string): Promise<string> {
  const systemPrompt = `You are an AI CV analysis expert specializing in nonprofit and development sector careers. Analyze the provided CV and provide comprehensive insights including skills assessment, experience relevance, areas for improvement, and career recommendations.`;

  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Please analyze this CV content: ${cvText}` }
  ], { userId });

  return response.content;
}

// 3. Cover Letter Generation
export async function generateCoverLetter(
  cvSummary: string,
  jobDescription: string,
  organizationInfo: string,
  userId?: string
): Promise<string> {
  const systemPrompt = `You are an AI cover letter expert for nonprofit applications. Create compelling, personalized cover letters that connect candidate experience to the role and demonstrate passion for the organization's mission.`;

  const userPrompt = `Please write a cover letter based on:
CANDIDATE: ${cvSummary}
JOB: ${jobDescription}
ORGANIZATION: ${organizationInfo}`;

  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], { userId });

  return response.content;
}

// 4. General Chat Response
export async function generateChatResponse(
  userMessage: string,
  conversationContext: string = '',
  userProfile?: any
): Promise<string> {
  const systemPrompt = `You are an AI assistant for AidJobs, a nonprofit recruitment platform. Help with job searching, career advice, CV assistance, organization hiring support, and nonprofit sector insights. Be helpful, knowledgeable, and encouraging.`;

  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt }
  ];

  if (conversationContext) {
    messages.push({ role: 'user', content: `Context: ${conversationContext}` });
  }

  messages.push({ role: 'user', content: userMessage });

  const response = await callAI(messages, { userId: userProfile?.id });
  return response.content;
}

// Check AI system status
export async function checkAIStatus(): Promise<{
  available: boolean;
  workingModels: string[];
  failedModels: string[];
  error?: string;
}> {
  const validation = validateAIConfigs();
  if (!validation.valid) {
    return {
      available: false,
      workingModels: [],
      failedModels: AI_CONFIGS.map(c => c.name),
      error: validation.errors.join(', ')
    };
  }

  const workingModels: string[] = [];
  const failedModels: string[] = [];
  
  const testMessages: AIMessage[] = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Say "AI system working" and nothing else.' }
  ];
  
  for (const config of AI_CONFIGS) {
    try {
      await callSingleModel(config, testMessages, null);
      workingModels.push(config.name);
    } catch (error) {
      failedModels.push(config.name);
    }
  }
  
  return {
    available: workingModels.length > 0,
    workingModels,
    failedModels
  };
}

// Initialize AI service
export function initializeAI(): void {
  console.log('🔧 Initializing Enhanced AI Service...');
  
  const validation = validateAIConfigs();
  if (!validation.valid) {
    console.error('❌ AI Service initialization failed:', validation.errors);
    console.error('📝 Please check your .env file and ensure all OpenRouter API keys are set');
    return;
  }
  
  console.log('✅ AI Service initialized with multiple models:');
  AI_CONFIGS.forEach(config => {
    console.log(`   ${config.priority}. ${config.name} (${config.model})`);
  });
  
  // Test the connection
  checkAIStatus().then(status => {
    if (status.available) {
      console.log(`🟢 AI Service online - ${status.workingModels.length}/${AI_CONFIGS.length} models working`);
      console.log('✅ Working models:', status.workingModels.join(', '));
      if (status.failedModels.length > 0) {
        console.log('⚠️ Failed models:', status.failedModels.join(', '));
      }
    } else {
      console.log('🔴 AI Service offline:', status.error);
    }
  }).catch(error => {
    console.log('🔴 AI Service connection test failed:', error.message);
  });
}