// JD Input Parser - Intelligently detect and process different types of job description inputs

export interface ParsedJDInput {
  type: 'brief' | 'link' | 'briefWithLink' | 'unknown';
  content: string;
  url?: string;
  confidence: number; // 0-1 confidence score
}

// URL validation
export function isValidUrl(text: string): boolean {
  try {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    return urlRegex.test(text);
  } catch {
    return false;
  }
}

// Extract first URL from text
export function extractUrl(text: string): string | null {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = text.match(urlRegex);
  return matches && matches.length > 0 ? matches[0] : null;
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

// Check if text contains job-related keywords
export function containsJobKeywords(text: string): boolean {
  const jobKeywords = [
    'role', 'position', 'job', 'responsibilities', 'experience', 'skills', 
    'qualifications', 'requirements', 'coordinator', 'manager', 'officer',
    'specialist', 'consultant', 'director', 'assistant', 'analyst'
  ];
  
  const textLower = text.toLowerCase();
  return jobKeywords.some(keyword => textLower.includes(keyword));
}

// Check if text is substantial enough to be a job brief
export function isSubstantialBrief(text: string): boolean {
  const words = text.trim().split(/\s+/);
  return words.length >= 15 && containsJobKeywords(text);
}

// Parse JD input to determine type and extract relevant parts
export function parseJDInput(input: string): ParsedJDInput {
  const trimmedInput = input.trim();
  
  // Check if input is empty or too short
  if (trimmedInput.length < 10) {
    return {
      type: 'unknown',
      content: trimmedInput,
      confidence: 0.9
    };
  }
  
  // Check if input contains a URL
  const url = extractUrl(trimmedInput);
  
  if (url) {
    // Remove URL from text to check if there's substantial content besides the URL
    const textWithoutUrl = trimmedInput.replace(url, '').trim();
    
    if (isSubstantialBrief(textWithoutUrl)) {
      // Input contains both a URL and substantial text - likely a brief with link
      return {
        type: 'briefWithLink',
        content: textWithoutUrl,
        url,
        confidence: 0.9
      };
    } else {
      // Input is primarily just a URL - likely a reference link
      return {
        type: 'link',
        content: trimmedInput,
        url,
        confidence: 0.9
      };
    }
  } else if (isSubstantialBrief(trimmedInput)) {
    // Input is substantial text without a URL - likely a brief
    return {
      type: 'brief',
      content: trimmedInput,
      confidence: 0.9
    };
  } else if (containsJobKeywords(trimmedInput)) {
    // Input contains job keywords but isn't substantial - likely a brief but low confidence
    return {
      type: 'brief',
      content: trimmedInput,
      confidence: 0.6
    };
  } else {
    // Input doesn't match any clear pattern
    return {
      type: 'unknown',
      content: trimmedInput,
      confidence: 0.5
    };
  }
}

// Get follow-up questions based on input type and content
export function getFollowUpQuestions(parsedInput: ParsedJDInput): string[] {
  const questions: string[] = [];
  
  if (parsedInput.type === 'brief' || parsedInput.type === 'briefWithLink') {
    const content = parsedInput.content.toLowerCase();
    
    // Check for missing key information
    if (!content.includes('location') && !content.includes('remote') && !content.includes('hybrid')) {
      questions.push('What is the location for this role? (e.g., remote, specific city, hybrid)');
    }
    
    if (!content.includes('contract') && !content.includes('full-time') && !content.includes('part-time')) {
      questions.push('What type of contract is this? (e.g., full-time, part-time, consultant)');
    }
    
    if (!content.includes('experience') && !content.includes('years')) {
      questions.push('What level of experience is required for this role?');
    }
    
    if (!content.includes('organization') && !content.includes('company') && parsedInput.type !== 'briefWithLink') {
      questions.push('What organization is this role for?');
    }
  }
  
  // Limit to top 2 questions
  return questions.slice(0, 2);
}