// AI Model Fallback System for Job Description Generation
import { supabase } from './supabase';

export interface AIModel {
  name: string;
  endpoint: string;
  apiKey: string;
  priority: number;
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

// AI Models in priority order
const AI_MODELS: AIModel[] = [
  {
    name: 'deepseek/deepseek-r1-0528-qwen3-8b:free',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: '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',
    priority: 1
  },
  {
    name: 'deepseek/deepseek-r1-0528:free',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: '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',
    priority: 2
  },
  {
    name: 'qwen/qwen3-14b-04-28:free',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: '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',
    priority: 3
  }
];

// Log error to Supabase
async function logError(
  userId: string | null,
  errorType: string,
  details: string,
  source: string
): Promise<void> {
  try {
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

// Check if error is retryable
function isRetryableError(error: any): boolean {
  if (error.status) {
    // HTTP status codes that indicate we should try next model
    return error.status === 429 || // Rate limit
           error.status >= 500 ||   // Server errors
           error.status === 408;    // Timeout
  }
  
  // Network errors, timeouts, etc.
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
         response.choices[0].message.content.trim().length > 50; // Minimum meaningful response
}

// Call single AI model
async function callSingleModel(
  model: AIModel,
  messages: AIMessage[],
  userId: string | null
): Promise<AIResponse> {
  console.log(`🤖 Trying model: ${model.name}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(model.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${model.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'AidJobs Platform'
      },
      body: JSON.stringify({
        model: model.name,
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

    console.log(`✅ Success with model: ${model.name}`);
    return {
      content: data.choices[0].message.content,
      model: model.name,
      usage: data.usage
    };

  } catch (error: any) {
    console.error(`❌ Model ${model.name} failed:`, error.message);
    
    // Log the error
    await logError(
      userId,
      'ai_model_failure',
      `Model: ${model.name}, Error: ${error.message}`,
      'ai_model_fallback'
    );
    
    throw error;
  }
}

// Main AI call with fallback logic
export async function callAIWithFallback(
  messages: AIMessage[],
  userId: string | null = null
): Promise<AIResponse> {
  console.log('🔄 Starting AI call with fallback logic...');
  
  const errors: string[] = [];
  
  for (const model of AI_MODELS) {
    try {
      const response = await callSingleModel(model, messages, userId);
      
      // If we get here, the model succeeded
      console.log(`🎉 Successfully generated response using: ${model.name}`);
      return response;
      
    } catch (error: any) {
      errors.push(`${model.name}: ${error.message}`);
      
      // If this is not a retryable error, don't try other models
      if (!isRetryableError(error)) {
        console.error(`💥 Non-retryable error with ${model.name}, stopping fallback`);
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
    'ai_model_fallback'
  );
  
  throw new Error('All AI models are currently unavailable. Please try again in a few minutes.');
}

// Specialized function for job description generation
export async function generateJobDescriptionWithFallback(
  userInput: string,
  inputType: 'brief' | 'upload' | 'link',
  userId: string | null = null
): Promise<string> {
  const systemMessage = "You are a nonprofit HR assistant who writes expert job descriptions based on user briefs. Create comprehensive, professional job descriptions that are inclusive, mission-aligned, and follow nonprofit sector best practices. Include clear sections for role overview, responsibilities, qualifications, and application process.";
  
  let userMessage = '';
  
  switch (inputType) {
    case 'brief':
      userMessage = `Please create a comprehensive job description based on this brief: "${userInput}"`;
      break;
    case 'upload':
      userMessage = `Please refine and improve this job description draft: "${userInput}"`;
      break;
    case 'link':
      userMessage = `Please rewrite this job posting with better clarity, DEI language, and nonprofit alignment: "${userInput}"`;
      break;
  }
  
  const messages: AIMessage[] = [
    { role: 'system', content: systemMessage },
    { role: 'user', content: userMessage }
  ];
  
  try {
    const response = await callAIWithFallback(messages, userId);
    return response.content;
  } catch (error) {
    console.error('❌ Job description generation failed:', error);
    throw error;
  }
}

// Check AI system status
export async function checkAISystemStatus(): Promise<{
  available: boolean;
  workingModels: string[];
  failedModels: string[];
}> {
  const workingModels: string[] = [];
  const failedModels: string[] = [];
  
  const testMessages: AIMessage[] = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Say "AI system working" and nothing else.' }
  ];
  
  for (const model of AI_MODELS) {
    try {
      await callSingleModel(model, testMessages, null);
      workingModels.push(model.name);
    } catch (error) {
      failedModels.push(model.name);
    }
  }
  
  return {
    available: workingModels.length > 0,
    workingModels,
    failedModels
  };
}