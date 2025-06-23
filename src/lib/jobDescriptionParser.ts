// Enhanced Job Description Parser - Convert AI-generated text to structured data
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
  salaryRange?: string;
  howToApply?: string;
  clarityScore: number;
  readingLevel: string;
  deiScore: number;
  jargonWarnings: string[];
}

// Enhanced SDG mapping with full names and descriptions
const SDG_MAPPING: Record<string, { name: string; description: string }> = {
  'SDG 1': { name: 'No Poverty', description: 'End poverty in all its forms everywhere' },
  'SDG 2': { name: 'Zero Hunger', description: 'End hunger, achieve food security and improved nutrition' },
  'SDG 3': { name: 'Good Health and Well-being', description: 'Ensure healthy lives and promote well-being for all' },
  'SDG 4': { name: 'Quality Education', description: 'Ensure inclusive and equitable quality education' },
  'SDG 5': { name: 'Gender Equality', description: 'Achieve gender equality and empower all women and girls' },
  'SDG 6': { name: 'Clean Water and Sanitation', description: 'Ensure availability and sustainable management of water' },
  'SDG 7': { name: 'Affordable and Clean Energy', description: 'Ensure access to affordable, reliable, sustainable energy' },
  'SDG 8': { name: 'Decent Work and Economic Growth', description: 'Promote sustained, inclusive economic growth and employment' },
  'SDG 9': { name: 'Industry, Innovation and Infrastructure', description: 'Build resilient infrastructure and promote innovation' },
  'SDG 10': { name: 'Reduced Inequalities', description: 'Reduce inequality within and among countries' },
  'SDG 11': { name: 'Sustainable Cities and Communities', description: 'Make cities and human settlements inclusive and sustainable' },
  'SDG 12': { name: 'Responsible Consumption and Production', description: 'Ensure sustainable consumption and production patterns' },
  'SDG 13': { name: 'Climate Action', description: 'Take urgent action to combat climate change' },
  'SDG 14': { name: 'Life Below Water', description: 'Conserve and sustainably use the oceans and marine resources' },
  'SDG 15': { name: 'Life on Land', description: 'Protect, restore and promote sustainable use of terrestrial ecosystems' },
  'SDG 16': { name: 'Peace, Justice and Strong Institutions', description: 'Promote peaceful and inclusive societies' },
  'SDG 17': { name: 'Partnerships for the Goals', description: 'Strengthen the means of implementation and revitalize partnerships' }
};

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
        return match[1].trim().replace(/[#*]/g, '');
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
      return lines.slice(1).join('\n').trim().replace(/[#*]/g, '');
    }
  }
  
  // Fallback: use first paragraph after title
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim());
  return paragraphs[1]?.replace(/^#+\s*[^\n]*\n/, '').trim().replace(/[#*]/g, '') || 'Mission-driven opportunity to create positive impact.';
}

// Enhanced sector extraction with more comprehensive mapping
function extractSectors(content: string): string[] {
  const sectorKeywords = {
    'Health': ['health', 'medical', 'healthcare', 'clinical', 'hospital', 'clinic', 'wellness', 'nutrition', 'mental health'],
    'Education': ['education', 'school', 'teaching', 'learning', 'academic', 'university', 'literacy', 'training'],
    'Environment': ['environment', 'climate', 'sustainability', 'conservation', 'green', 'renewable', 'biodiversity', 'ecosystem'],
    'Human Rights': ['human rights', 'justice', 'advocacy', 'legal', 'protection', 'equality', 'freedom', 'democracy'],
    'Humanitarian': ['humanitarian', 'emergency', 'disaster', 'relief', 'crisis', 'refugee', 'displacement', 'conflict'],
    'Development': ['development', 'poverty', 'economic', 'community', 'rural', 'urban', 'infrastructure', 'capacity building'],
    'Gender': ['gender', 'women', 'equality', 'empowerment', 'inclusion', 'diversity', 'feminism', 'girls'],
    'Livelihoods': ['livelihood', 'employment', 'income', 'economic', 'entrepreneurship', 'skills', 'microfinance', 'agriculture'],
    'Water & Sanitation': ['water', 'sanitation', 'hygiene', 'wash', 'clean water', 'sewage', 'drainage'],
    'Food Security': ['food', 'nutrition', 'hunger', 'agriculture', 'farming', 'crops', 'livestock', 'malnutrition'],
    'Child Protection': ['child', 'children', 'youth', 'protection', 'safeguarding', 'abuse', 'exploitation'],
    'Governance': ['governance', 'democracy', 'transparency', 'accountability', 'policy', 'government', 'civic']
  };
  
  const contentLower = content.toLowerCase();
  const foundSectors: string[] = [];
  
  for (const [sector, keywords] of Object.entries(sectorKeywords)) {
    const keywordCount = keywords.filter(keyword => contentLower.includes(keyword)).length;
    if (keywordCount >= 1) {
      foundSectors.push(sector);
    }
  }
  
  return foundSectors.length > 0 ? foundSectors.slice(0, 3) : ['Development'];
}

// Enhanced SDG extraction with better keyword mapping
function extractSDGs(content: string): string[] {
  const sdgKeywords = {
    'SDG 1': ['poverty', 'poor', 'income', 'economic empowerment', 'livelihood', 'basic needs'],
    'SDG 2': ['hunger', 'food', 'nutrition', 'agriculture', 'farming', 'malnutrition', 'food security'],
    'SDG 3': ['health', 'medical', 'healthcare', 'wellbeing', 'disease', 'mental health', 'wellness'],
    'SDG 4': ['education', 'learning', 'school', 'training', 'literacy', 'skills', 'knowledge'],
    'SDG 5': ['gender', 'women', 'equality', 'empowerment', 'girls', 'feminism', 'discrimination'],
    'SDG 6': ['water', 'sanitation', 'hygiene', 'wash', 'clean water', 'sewage'],
    'SDG 7': ['energy', 'electricity', 'renewable', 'solar', 'wind', 'power', 'fuel'],
    'SDG 8': ['employment', 'work', 'economic', 'growth', 'jobs', 'decent work', 'labor'],
    'SDG 9': ['infrastructure', 'innovation', 'technology', 'industry', 'research', 'development'],
    'SDG 10': ['inequality', 'inclusion', 'discrimination', 'marginalized', 'vulnerable', 'equity'],
    'SDG 11': ['cities', 'urban', 'communities', 'housing', 'transport', 'sustainable cities'],
    'SDG 12': ['consumption', 'production', 'waste', 'recycling', 'sustainable', 'circular economy'],
    'SDG 13': ['climate', 'environment', 'carbon', 'emissions', 'global warming', 'adaptation'],
    'SDG 14': ['ocean', 'marine', 'sea', 'fishing', 'coastal', 'aquatic'],
    'SDG 15': ['forest', 'biodiversity', 'ecosystem', 'wildlife', 'conservation', 'land'],
    'SDG 16': ['peace', 'justice', 'governance', 'institutions', 'rule of law', 'transparency'],
    'SDG 17': ['partnership', 'cooperation', 'collaboration', 'global', 'alliance', 'network']
  };
  
  const contentLower = content.toLowerCase();
  const foundSDGs: string[] = [];
  
  for (const [sdg, keywords] of Object.entries(sdgKeywords)) {
    const keywordCount = keywords.filter(keyword => contentLower.includes(keyword)).length;
    if (keywordCount >= 1) {
      foundSDGs.push(sdg);
    }
  }
  
  return foundSDGs.length > 0 ? foundSDGs.slice(0, 3) : ['SDG 8'];
}

// Enhanced section parsing with better pattern recognition
function extractSections(content: string): JobSection[] {
  const sectionPatterns = [
    { id: 'overview', title: 'Role Overview', patterns: [/(?:role|position|job)\s+(?:overview|summary|description)/i, /about\s+(?:the\s+)?(?:role|position)/i] },
    { id: 'responsibilities', title: 'Key Responsibilities', patterns: [/(?:key\s+)?responsibilities/i, /duties/i, /what\s+you.ll\s+do/i, /main\s+tasks/i] },
    { id: 'qualifications', title: 'Qualifications & Experience', patterns: [/qualifications/i, /requirements/i, /experience/i, /what\s+we.re\s+looking/i, /essential\s+criteria/i] },
    { id: 'competencies', title: 'Competencies', patterns: [/competencies/i, /skills/i, /abilities/i, /capabilities/i] },
    { id: 'offer', title: 'What We Offer', patterns: [/what\s+we\s+offer/i, /benefits/i, /package/i, /compensation/i] },
    { id: 'conditions', title: 'Working Conditions', patterns: [/working\s+conditions/i, /work\s+environment/i, /location/i, /contract/i] },
    { id: 'application', title: 'Application Process', patterns: [/how\s+to\s+apply/i, /application/i, /apply/i, /contact/i, /submit/i] },
    { id: 'organization', title: 'About the Organization', patterns: [/about\s+(?:us|the\s+organization|our\s+organization)/i, /organization/i, /company/i, /who\s+we\s+are/i] },
  ];
  
  const sections: JobSection[] = [];
  const contentSections = content.split(/\n\s*(?=#{1,3}\s|\*\*[^*]+\*\*|[A-Z][^:\n]*:)/);
  
  for (const section of contentSections) {
    if (!section.trim()) continue;
    
    const lines = section.split('\n');
    const header = lines[0]?.trim() || '';
    const content = lines.slice(1).join('\n').trim().replace(/[#*]/g, '');
    
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

// Enhanced organization extraction
function extractOrganization(content: string): string {
  const orgPatterns = [
    /organization:\s*(.+)/i,
    /company:\s*(.+)/i,
    /about\s+us[:\s]+(.+)/i,
    /we\s+are\s+(.+?)(?:\.|,|\n)/i,
    /(?:join|work\s+with)\s+(.+?)(?:\.|,|\n)/i,
  ];
  
  for (const pattern of orgPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1].trim().split(/[.\n]/)[0];
    }
  }
  
  return 'Mission-driven Organization';
}

// Enhanced location extraction
function extractLocation(content: string): string {
  const locationPatterns = [
    /location:\s*(.+)/i,
    /based\s+in\s+(.+?)(?:\.|,|\n)/i,
    /(?:remote|hybrid|on-site)/i,
    /(?:country|region|city):\s*(.+)/i,
  ];
  
  for (const pattern of locationPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1]?.trim().split(/[.\n]/)[0] || match[0];
    }
  }
  
  return 'Remote/Flexible';
}

// Enhanced contract type extraction
function extractContractType(content: string): string {
  const contractPatterns = [
    /full.?time/i,
    /part.?time/i,
    /contract/i,
    /consultant/i,
    /volunteer/i,
    /temporary/i,
    /permanent/i,
    /fixed.?term/i,
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

// Extract application deadline
function extractApplicationDeadline(content: string): string | undefined {
  const deadlinePatterns = [
    /deadline:\s*(.+)/i,
    /apply\s+by\s+(.+?)(?:\.|,|\n)/i,
    /closing\s+date:\s*(.+)/i,
    /applications\s+close\s+(.+?)(?:\.|,|\n)/i,
  ];
  
  for (const pattern of deadlinePatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1].trim().split(/[.\n]/)[0];
    }
  }
  
  return undefined;
}

// Extract salary range
function extractSalaryRange(content: string): string | undefined {
  const salaryPatterns = [
    /salary:\s*(.+)/i,
    /compensation:\s*(.+)/i,
    /\$[\d,]+\s*-\s*\$[\d,]+/i,
    /€[\d,]+\s*-\s*€[\d,]+/i,
    /£[\d,]+\s*-\s*£[\d,]+/i,
    /competitive\s+salary/i,
  ];
  
  for (const pattern of salaryPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1]?.trim().split(/[.\n]/)[0] || match[0];
    }
  }
  
  return undefined;
}

// Extract how to apply instructions
function extractHowToApply(content: string): string | undefined {
  const applyPatterns = [
    /how\s+to\s+apply[:\s]+(.*?)(?:\n\n|\n#|$)/is,
    /application\s+process[:\s]+(.*?)(?:\n\n|\n#|$)/is,
    /to\s+apply[:\s]+(.*?)(?:\n\n|\n#|$)/is,
  ];
  
  for (const pattern of applyPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1].trim().replace(/[#*]/g, '');
    }
  }
  
  return undefined;
}

// Enhanced clarity score calculation
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
  
  // Reward bullet points
  const hasBullets = /^[-•*]\s/m.test(content);
  if (hasBullets) score += 5;
  
  return Math.max(60, Math.min(100, score));
}

// Enhanced reading level determination
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

// Enhanced DEI score calculation
function calculateDEIScore(content: string): number {
  let score = 100;
  const contentLower = content.toLowerCase();
  
  // Check for gendered language
  const genderedTerms = ['guys', 'manpower', 'chairman', 'policeman', 'fireman', 'mankind'];
  const foundGendered = genderedTerms.filter(term => contentLower.includes(term));
  score -= foundGendered.length * 10;
  
  // Check for inclusive language
  const inclusiveTerms = ['diverse', 'inclusive', 'equal opportunity', 'all backgrounds', 'everyone', 'accessibility', 'accommodation'];
  const foundInclusive = inclusiveTerms.filter(term => contentLower.includes(term));
  score += foundInclusive.length * 5;
  
  // Check for accessibility mentions
  if (contentLower.includes('accommodation') || contentLower.includes('accessibility')) {
    score += 10;
  }
  
  // Check for bias-free language
  const biasTerms = ['native speaker', 'cultural fit', 'young', 'energetic', 'digital native'];
  const foundBias = biasTerms.filter(term => contentLower.includes(term));
  score -= foundBias.length * 8;
  
  return Math.max(60, Math.min(100, score));
}

// Enhanced jargon identification
function identifyJargonWarnings(content: string): string[] {
  const jargonTerms = [
    { term: 'synergize', suggestion: 'work together' },
    { term: 'leverage', suggestion: 'use' },
    { term: 'paradigm', suggestion: 'approach' },
    { term: 'ideate', suggestion: 'brainstorm' },
    { term: 'operationalize', suggestion: 'implement' },
    { term: 'stakeholder', suggestion: 'partner or community member' },
    { term: 'deliverables', suggestion: 'results or outputs' },
    { term: 'bandwidth', suggestion: 'capacity or time' },
    { term: 'circle back', suggestion: 'follow up' },
    { term: 'deep dive', suggestion: 'detailed analysis' },
    { term: 'low-hanging fruit', suggestion: 'easy wins' },
    { term: 'move the needle', suggestion: 'make progress' },
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

// Main parsing function with enhanced capabilities
export function parseJobDescription(aiGeneratedContent: string): ParsedJobDescription {
  const title = extractJobTitle(aiGeneratedContent);
  const summary = extractJobSummary(aiGeneratedContent);
  const sector = extractSectors(aiGeneratedContent);
  const sdgs = extractSDGs(aiGeneratedContent);
  const sections = extractSections(aiGeneratedContent);
  const organization = extractOrganization(aiGeneratedContent);
  const location = extractLocation(aiGeneratedContent);
  const contractType = extractContractType(aiGeneratedContent);
  const applicationDeadline = extractApplicationDeadline(aiGeneratedContent);
  const salaryRange = extractSalaryRange(aiGeneratedContent);
  const howToApply = extractHowToApply(aiGeneratedContent);
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
    applicationDeadline,
    salaryRange,
    howToApply,
    clarityScore,
    readingLevel,
    deiScore,
    jargonWarnings,
  };
}

// Helper function to get SDG information
export function getSDGInfo(sdgCode: string): { name: string; description: string } | null {
  return SDG_MAPPING[sdgCode] || null;
}