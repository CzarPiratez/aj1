// JD Input Detection Utility
// Intelligently detects which type of input the user has provided for job description generation

export interface JDInputDetection {
  inputType: 'briefWithLink' | 'briefOnly' | 'referenceLink' | 'unknown';
  brief?: string;
  link?: string;
  confidence: number; // 0-1 score indicating confidence in detection
}

// URL validation - detects http/https URLs
export function isValidUrl(text: string): boolean {
  try {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    return urlRegex.test(text);
  } catch {
    return false;
  }
}

// Extract URLs from text
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = text.match(urlRegex);
  return matches || [];
}

// Check if text contains job-related keywords
export function containsJobKeywords(text: string): boolean {
  const jobKeywords = [
    // Role types
    'coordinator', 'manager', 'officer', 'specialist', 'consultant', 
    'director', 'assistant', 'analyst', 'advisor', 'lead', 'head',
    'supervisor', 'administrator', 'executive', 'associate',
    
    // Job-related terms
    'role', 'position', 'job', 'vacancy', 'opportunity', 'opening',
    'responsibilities', 'duties', 'tasks', 'requirements',
    'experience', 'skills', 'qualifications', 'education',
    'degree', 'certification', 'background', 'expertise',
    
    // Action words
    'manage', 'coordinate', 'oversee', 'implement', 'develop',
    'support', 'assist', 'lead', 'supervise', 'monitor',
    'evaluate', 'analyze', 'report', 'collaborate',
    
    // Nonprofit/development specific
    'program', 'project', 'community', 'development', 'humanitarian',
    'nonprofit', 'ngo', 'organization', 'mission', 'impact',
    'beneficiaries', 'stakeholders', 'partners', 'donors',
    'field', 'remote', 'country', 'region', 'local'
  ];
  
  const textLower = text.toLowerCase();
  return jobKeywords.some(keyword => textLower.includes(keyword));
}

// Check if text is substantial enough to be a job brief
export function isSubstantialBrief(text: string): boolean {
  const words = text.trim().split(/\s+/);
  
  // Must have at least 10 words
  if (words.length < 10) return false;
  
  // Must contain job-related keywords
  if (!containsJobKeywords(text)) return false;
  
  // Should have some structure (sentences)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length < 2) return false;
  
  return true;
}

// Check if URL appears to be a job posting or organization website
export function isJobRelatedUrl(url: string): boolean {
  const urlLower = url.toLowerCase();
  
  // Common job board domains
  const jobBoards = [
    'indeed.com', 'linkedin.com', 'glassdoor.com', 'monster.com',
    'careerbuilder.com', 'ziprecruiter.com', 'simplyhired.com',
    'idealist.org', 'devex.com', 'reliefweb.int', 'devnetjobs.org',
    'jobs.org', 'ngoaidmap.org', 'interaction.org'
  ];
  
  // Check if it's from a known job board
  if (jobBoards.some(domain => urlLower.includes(domain))) {
    return true;
  }
  
  // Check for job-related path segments
  const jobPaths = [
    '/jobs/', '/careers/', '/opportunities/', '/vacancies/',
    '/job/', '/career/', '/opportunity/', '/vacancy/',
    '/employment/', '/positions/', '/openings/', '/hiring/'
  ];
  
  if (jobPaths.some(path => urlLower.includes(path))) {
    return true;
  }
  
  // Check for job-related query parameters
  const jobParams = ['job', 'position', 'role', 'career', 'vacancy'];
  if (jobParams.some(param => urlLower.includes(`${param}=`) || urlLower.includes(`${param}%`))) {
    return true;
  }
  
  return false;
}

// Main parsing function
export function parseJDInput(message: string): JDInputDetection {
  const trimmedMessage = message.trim();
  
  // Handle empty or very short input
  if (trimmedMessage.length < 5) {
    return {
      inputType: 'unknown',
      confidence: 1.0
    };
  }
  
  // Extract URLs from the message
  const urls = extractUrls(trimmedMessage);
  const hasUrls = urls.length > 0;
  
  // Remove URLs to get the text content
  const textWithoutUrls = trimmedMessage.replace(/(https?:\/\/[^\s]+)/gi, '').trim();
  
  // Check if remaining text is substantial
  const hasSubstantialText = isSubstantialBrief(textWithoutUrls);
  const hasJobKeywords = containsJobKeywords(textWithoutUrls);
  
  // Decision logic
  if (hasUrls && hasSubstantialText) {
    // Has both URL and substantial job-related text
    return {
      inputType: 'briefWithLink',
      brief: textWithoutUrls,
      link: urls[0], // Use first URL found
      confidence: 0.9
    };
  } else if (hasUrls && !hasSubstantialText) {
    // Has URL but minimal or no additional text
    const url = urls[0];
    const isJobUrl = isJobRelatedUrl(url);
    
    return {
      inputType: 'referenceLink',
      link: url,
      confidence: isJobUrl ? 0.9 : 0.7
    };
  } else if (!hasUrls && hasSubstantialText) {
    // Has substantial text but no URLs
    return {
      inputType: 'briefOnly',
      brief: trimmedMessage,
      confidence: 0.9
    };
  } else if (!hasUrls && hasJobKeywords) {
    // Has some job keywords but not substantial enough
    return {
      inputType: 'briefOnly',
      brief: trimmedMessage,
      confidence: 0.6
    };
  } else {
    // Doesn't match any clear pattern
    return {
      inputType: 'unknown',
      confidence: 0.8
    };
  }
}

// Helper function to get a user-friendly description of the detected input
export function getInputTypeDescription(detection: JDInputDetection): string {
  switch (detection.inputType) {
    case 'briefWithLink':
      return `Job brief with organization link detected (${detection.confidence * 100}% confidence)`;
    case 'briefOnly':
      return `Job brief detected (${detection.confidence * 100}% confidence)`;
    case 'referenceLink':
      return `Reference job posting link detected (${detection.confidence * 100}% confidence)`;
    case 'unknown':
      return 'Input type unclear - please provide a job brief, link, or upload a file';
    default:
      return 'Unknown input type';
  }
}

// Validation function to check if detection is reliable
export function isDetectionReliable(detection: JDInputDetection): boolean {
  return detection.confidence >= 0.7;
}

// Get follow-up questions based on input type and content
export function getFollowUpQuestions(parsedInput: JDInputDetection): string[] {
  const questions: string[] = [];
  
  if (parsedInput.type === 'briefOnly' || parsedInput.type === 'briefWithLink') {
    const content = parsedInput.brief?.toLowerCase() || '';
    
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
    
    if (!content.includes('salary') && !content.includes('compensation') && !content.includes('pay')) {
      questions.push('Is there a salary range for this position? (optional)');
    }
    
    if (!content.includes('deadline') && !content.includes('apply by')) {
      questions.push('Is there an application deadline for this role?');
    }
  }
  
  // Limit to top 3 questions
  return questions.slice(0, 3);
}