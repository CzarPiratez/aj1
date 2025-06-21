// Job Description Parser - Convert AI-generated text to structured data
import { JobDescriptionData, JobSection } from '@/components/jd/JobDescriptionOutput';

export interface ParsedJobDescription {
  title: string;
  summary: string;
  sector: string[];
  sdgs: string[];
  sections: JobSection[];
  organization: string;
  location: string;
  contractType: string;
  applicationDeadline?: string;
  clarityScore: number;
  readingLevel: string;
  deiScore: number;
  jargonWarnings: string[];
}

// Extract job title from AI-generated content
function extractJobTitle(content: string): string {
  const lines = content.split('\n').filter(line => line.trim());
  
  // Look for common title patterns
  const titlePatterns = [
    /^#\s*(.+)$/,
    /^Job Title:\s*(.+)$/i,
    /^Position:\s*(.+)$/i,
    /^Role:\s*(.+)$/i,
  ];
  
  for (const line of lines.slice(0, 5)) {
    for (const pattern of titlePatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
  }
  
  // Fallback: use first non-empty line
  return lines[0]?.replace(/^#+\s*/, '').trim() || 'Job Opportunity';
}

// Extract job summary/overview
function extractJobSummary(content: string): string {
  const sections = content.split(/\n\s*\n/);
  
  // Look for summary patterns
  const summaryPatterns = [
    /(?:job\s+)?(?:role\s+)?(?:position\s+)?(?:overview|summary|description)/i,
    /about\s+(?:the\s+)?(?:role|position|job)/i,
    /we\s+are\s+(?:looking|seeking)/i,
  ];
  
  for (const section of sections) {
    const lines = section.split('\n');
    const header = lines[0]?.toLowerCase() || '';
    
    if (summaryPatterns.some(pattern => pattern.test(header))) {
      return lines.slice(1).join('\n').trim();
    }
  }
  
  // Fallback: use first paragraph after title
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim());
  return paragraphs[1]?.replace(/^#+\s*[^\n]*\n/, '').trim() || 'Mission-driven opportunity to create positive impact.';
}

// Extract sectors from content
function extractSectors(content: string): string[] {
  const sectorKeywords = {
    'Health': ['health', 'medical', 'healthcare', 'clinical', 'hospital', 'clinic'],
    'Education': ['education', 'school', 'teaching', 'learning', 'academic', 'university'],
    'Environment': ['environment', 'climate', 'sustainability', 'conservation', 'green', 'renewable'],
    'Human Rights': ['human rights', 'justice', 'advocacy', 'legal', 'protection', 'equality'],
    'Humanitarian': ['humanitarian', 'emergency', 'disaster', 'relief', 'crisis', 'refugee'],
    'Development': ['development', 'poverty', 'economic', 'community', 'rural', 'urban'],
    'Gender': ['gender', 'women', 'equality', 'empowerment', 'inclusion', 'diversity'],
    'Livelihoods': ['livelihood', 'employment', 'income', 'economic', 'entrepreneurship', 'skills'],
  };
  
  const contentLower = content.toLowerCase();
  const foundSectors: string[] = [];
  
  for (const [sector, keywords] of Object.entries(sectorKeywords)) {
    if (keywords.some(keyword => contentLower.includes(keyword))) {
      foundSectors.push(sector);
    }
  }
  
  return foundSectors.length > 0 ? foundSectors : ['Development'];
}

// Extract SDGs from content
function extractSDGs(content: string): string[] {
  const sdgKeywords = {
    'SDG 1': ['poverty', 'poor', 'income', 'economic'],
    'SDG 2': ['hunger', 'food', 'nutrition', 'agriculture'],
    'SDG 3': ['health', 'medical', 'healthcare', 'wellbeing'],
    'SDG 4': ['education', 'learning', 'school', 'training'],
    'SDG 5': ['gender', 'women', 'equality', 'empowerment'],
    'SDG 6': ['water', 'sanitation', 'hygiene', 'wash'],
    'SDG 8': ['employment', 'work', 'economic', 'growth'],
    'SDG 10': ['inequality', 'inclusion', 'discrimination'],
    'SDG 13': ['climate', 'environment', 'carbon', 'emissions'],
    'SDG 16': ['peace', 'justice', 'governance', 'institutions'],
    'SDG 17': ['partnership', 'cooperation', 'collaboration'],
  };
  
  const contentLower = content.toLowerCase();
  const foundSDGs: string[] = [];
  
  for (const [sdg, keywords] of Object.entries(sdgKeywords)) {
    if (keywords.some(keyword => contentLower.includes(keyword))) {
      foundSDGs.push(sdg);
    }
  }
  
  return foundSDGs.length > 0 ? foundSDGs.slice(0, 3) : ['SDG 8'];
}

// Parse content into sections
function extractSections(content: string): JobSection[] {
  const sectionPatterns = [
    { id: 'overview', title: 'Role Overview', patterns: [/(?:role|position|job)\s+(?:overview|summary|description)/i, /about\s+(?:the\s+)?(?:role|position)/i] },
    { id: 'responsibilities', title: 'Key Responsibilities', patterns: [/(?:key\s+)?responsibilities/i, /duties/i, /what\s+you.ll\s+do/i] },
    { id: 'qualifications', title: 'Qualifications & Experience', patterns: [/qualifications/i, /requirements/i, /experience/i, /what\s+we.re\s+looking/i] },
    { id: 'competencies', title: 'Competencies', patterns: [/competencies/i, /skills/i, /abilities/i] },
    { id: 'conditions', title: 'Working Conditions', patterns: [/working\s+conditions/i, /work\s+environment/i, /location/i] },
    { id: 'application', title: 'Application Process', patterns: [/how\s+to\s+apply/i, /application/i, /apply/i, /contact/i] },
    { id: 'organization', title: 'About the Organization', patterns: [/about\s+(?:us|the\s+organization|our\s+organization)/i, /organization/i, /company/i] },
  ];
  
  const sections: JobSection[] = [];
  const contentSections = content.split(/\n\s*(?=#{1,3}\s|\*\*[^*]+\*\*|[A-Z][^:\n]*:)/);
  
  for (const section of contentSections) {
    if (!section.trim()) continue;
    
    const lines = section.split('\n');
    const header = lines[0]?.trim() || '';
    const content = lines.slice(1).join('\n').trim();
    
    if (!content) continue;
    
    // Find matching section pattern
    let matchedSection = null;
    for (const pattern of sectionPatterns) {
      if (pattern.patterns.some(p => p.test(header))) {
        matchedSection = pattern;
        break;
      }
    }
    
    if (matchedSection) {
      sections.push({
        id: matchedSection.id,
        title: matchedSection.title,
        content: content,
        isLocked: false,
        isEditing: false,
      });
    } else if (header && content) {
      // Create custom section
      sections.push({
        id: `custom_${sections.length}`,
        title: header.replace(/^#+\s*|\*\*|\*|:$/g, '').trim(),
        content: content,
        isLocked: false,
        isEditing: false,
      });
    }
  }
  
  // Ensure we have at least basic sections
  if (sections.length === 0) {
    sections.push({
      id: 'overview',
      title: 'Role Overview',
      content: 'Mission-driven opportunity to create positive impact in the nonprofit sector.',
      isLocked: false,
      isEditing: false,
    });
  }
  
  return sections;
}

// Extract organization info
function extractOrganization(content: string): string {
  const orgPatterns = [
    /organization:\s*(.+)/i,
    /company:\s*(.+)/i,
    /about\s+us[:\s]+(.+)/i,
    /we\s+are\s+(.+?)(?:\.|,|\n)/i,
  ];
  
  for (const pattern of orgPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1].trim().split(/[.\n]/)[0];
    }
  }
  
  return 'Mission-driven Organization';
}

// Extract location
function extractLocation(content: string): string {
  const locationPatterns = [
    /location:\s*(.+)/i,
    /based\s+in\s+(.+?)(?:\.|,|\n)/i,
    /(?:remote|hybrid|on-site)/i,
  ];
  
  for (const pattern of locationPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1]?.trim().split(/[.\n]/)[0] || match[0];
    }
  }
  
  return 'Remote/Flexible';
}

// Extract contract type
function extractContractType(content: string): string {
  const contractPatterns = [
    /full.?time/i,
    /part.?time/i,
    /contract/i,
    /consultant/i,
    /volunteer/i,
    /temporary/i,
    /permanent/i,
  ];
  
  for (const pattern of contractPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[0].replace(/[.-]/g, '-').toLowerCase()
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('-');
    }
  }
  
  return 'Full-Time';
}

// Calculate clarity score
function calculateClarityScore(content: string): number {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim());
  const words = content.split(/\s+/).filter(w => w.trim());
  
  let score = 100;
  
  // Penalize very long sentences
  const avgSentenceLength = words.length / sentences.length;
  if (avgSentenceLength > 25) score -= 20;
  else if (avgSentenceLength > 20) score -= 10;
  
  // Penalize passive voice (rough estimation)
  const passiveIndicators = content.match(/\b(?:is|are|was|were|been|being)\s+\w+ed\b/gi) || [];
  const passiveRatio = passiveIndicators.length / sentences.length;
  if (passiveRatio > 0.3) score -= 15;
  
  // Reward clear structure
  const hasHeaders = /^#+\s|\*\*[^*]+\*\*/.test(content);
  if (hasHeaders) score += 10;
  
  return Math.max(60, Math.min(100, score));
}

// Determine reading level
function determineReadingLevel(content: string): string {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim());
  const words = content.split(/\s+/).filter(w => w.trim());
  const syllables = words.reduce((count, word) => {
    return count + Math.max(1, word.replace(/[^aeiouAEIOU]/g, '').length);
  }, 0);
  
  // Simplified Flesch-Kincaid calculation
  const avgSentenceLength = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;
  const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  
  if (score >= 90) return 'Elementary';
  if (score >= 80) return 'Middle School';
  if (score >= 70) return 'High School';
  if (score >= 60) return 'College';
  return 'Graduate';
}

// Calculate DEI score
function calculateDEIScore(content: string): number {
  let score = 100;
  const contentLower = content.toLowerCase();
  
  // Check for gendered language
  const genderedTerms = ['guys', 'manpower', 'chairman', 'policeman', 'fireman'];
  const foundGendered = genderedTerms.filter(term => contentLower.includes(term));
  score -= foundGendered.length * 10;
  
  // Check for inclusive language
  const inclusiveTerms = ['diverse', 'inclusive', 'equal opportunity', 'all backgrounds', 'everyone'];
  const foundInclusive = inclusiveTerms.filter(term => contentLower.includes(term));
  score += foundInclusive.length * 5;
  
  // Check for accessibility mentions
  if (contentLower.includes('accommodation') || contentLower.includes('accessibility')) {
    score += 10;
  }
  
  return Math.max(60, Math.min(100, score));
}

// Identify jargon warnings
function identifyJargonWarnings(content: string): string[] {
  const jargonTerms = [
    { term: 'synergize', suggestion: 'work together' },
    { term: 'leverage', suggestion: 'use' },
    { term: 'paradigm', suggestion: 'approach' },
    { term: 'ideate', suggestion: 'brainstorm' },
    { term: 'operationalize', suggestion: 'implement' },
    { term: 'stakeholder', suggestion: 'partner or community member' },
    { term: 'deliverables', suggestion: 'results or outputs' },
  ];
  
  const warnings: string[] = [];
  const contentLower = content.toLowerCase();
  
  for (const { term, suggestion } of jargonTerms) {
    if (contentLower.includes(term)) {
      warnings.push(`Consider replacing "${term}" with "${suggestion}"`);
    }
  }
  
  return warnings;
}

// Main parsing function
export function parseJobDescription(aiGeneratedContent: string): ParsedJobDescription {
  const title = extractJobTitle(aiGeneratedContent);
  const summary = extractJobSummary(aiGeneratedContent);
  const sector = extractSectors(aiGeneratedContent);
  const sdgs = extractSDGs(aiGeneratedContent);
  const sections = extractSections(aiGeneratedContent);
  const organization = extractOrganization(aiGeneratedContent);
  const location = extractLocation(aiGeneratedContent);
  const contractType = extractContractType(aiGeneratedContent);
  const clarityScore = calculateClarityScore(aiGeneratedContent);
  const readingLevel = determineReadingLevel(aiGeneratedContent);
  const deiScore = calculateDEIScore(aiGeneratedContent);
  const jargonWarnings = identifyJargonWarnings(aiGeneratedContent);
  
  return {
    title,
    summary,
    sector,
    sdgs,
    sections,
    organization,
    location,
    contractType,
    clarityScore,
    readingLevel,
    deiScore,
    jargonWarnings,
  };
}