// Enhanced AI functions for JD refinement
export async function refineJDSection(
  sectionTitle: string,
  sectionContent: string,
  refinementInstructions: string
): Promise<string> {
  const systemPrompt = `You are an AI expert in refining job descriptions for the nonprofit sector. Focus specifically on improving the requested section while maintaining the overall tone and purpose of the job description.

Follow these guidelines:
- Address the specific refinement instructions provided
- Maintain or enhance clarity and readability
- Use inclusive, unbiased language
- Keep the content authentic and appropriate for the nonprofit sector
- Preserve any key information from the original content
- Format with appropriate Markdown if needed`;

  const userPrompt = `Please refine this job description section:

SECTION TITLE:
${sectionTitle}

CURRENT CONTENT:
${sectionContent}

REFINEMENT INSTRUCTIONS:
${refinementInstructions}`;

  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], { 
    temperature: 0.7, 
    max_tokens: 2000 
  });

  return response.content;
}

// Additional AI functions for tone adjustment and bias detection
export async function adjustTone(
  content: string,
  targetTone: 'formal' | 'inspiring' | 'conversational' | 'professional'
): Promise<string> {
  const systemPrompt = `You are an AI expert in adjusting the tone of nonprofit job descriptions. Rewrite the content to match the specified tone while preserving all key information and maintaining appropriateness for the nonprofit sector.`;

  const userPrompt = `Please adjust this content to have a ${targetTone} tone:

${content}`;

  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], { 
    temperature: 0.7, 
    max_tokens: 2000 
  });

  return response.content;
}

export async function detectBiasAndSuggestAlternatives(
  content: string
): Promise<{
  biasDetected: boolean;
  issues: string[];
  suggestions: string[];
  improvedContent: string;
}> {
  const systemPrompt = `You are an AI expert in detecting bias and promoting inclusive language in job descriptions. Analyze the content for potential bias and suggest improvements.`;

  const userPrompt = `Please analyze this job description content for bias and suggest improvements:

${content}`;

  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], { 
    temperature: 0.5, 
    max_tokens: 2000 
  });

  // In a real implementation, this would parse the AI response
  return {
    biasDetected: false,
    issues: [],
    suggestions: [],
    improvedContent: response.content
  };
}