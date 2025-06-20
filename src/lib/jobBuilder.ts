// Job Builder utilities and AI integration
import { generateJobDescription as aiGenerateJobDescription } from './ai';

export interface WebsiteContent {
  title: string;
  description: string;
  content: string;
  url: string;
}

export interface JobDescription {
  title: string;
  organization: string;
  missionSummary: string;
  responsibilities: string[];
  qualifications: string[];
  salaryRange?: string;
  location?: string;
  sdgRelevance?: string[];
  organizationInfo: string;
}

// URL validation
export function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
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

// Web scraping function using a CORS proxy
export async function scrapeWebsite(url: string): Promise<WebsiteContent> {
  try {
    // Use a CORS proxy service to fetch the website content
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const html = data.contents;
    
    // Create a temporary DOM element to parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Extract title
    const title = doc.querySelector('title')?.textContent || 
                  doc.querySelector('h1')?.textContent || 
                  'Organization';
    
    // Extract meta description
    const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content') || 
                           doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
    
    // Extract main content (first 300 words)
    const bodyText = doc.body?.textContent || '';
    const words = bodyText.replace(/\s+/g, ' ').trim().split(' ');
    const content = words.slice(0, 300).join(' ');
    
    return {
      title: title.trim(),
      description: metaDescription.trim(),
      content: content.trim(),
      url
    };
  } catch (error) {
    console.error('Error scraping website:', error);
    
    // Fallback: return basic info
    return {
      title: extractDomain(url),
      description: '',
      content: `Organization website: ${url}`,
      url
    };
  }
}

// Generate job description using centralized AI service
export async function generateJobDescription(websiteContent: WebsiteContent): Promise<string> {
  try {
    return await aiGenerateJobDescription(websiteContent);
  } catch (error) {
    console.error('Error generating job description:', error);
    
    // Fallback job description
    return `# Job Opportunity at ${websiteContent.title}

## About the Organization
${websiteContent.title} is a mission-driven organization working to create positive impact. Based on their work and values, we're seeking a dedicated professional to join their team.

## Role Overview
We are looking for a passionate individual to contribute to our mission and help drive meaningful change in the nonprofit sector.

## Key Responsibilities
- Support organizational mission and strategic objectives
- Collaborate with team members on key initiatives
- Contribute to program development and implementation
- Engage with stakeholders and community partners

## Qualifications
- Bachelor's degree or equivalent experience
- 2-3 years of relevant experience in nonprofit or development sector
- Strong communication and interpersonal skills
- Passion for social impact and mission-driven work
- Ability to work collaboratively in a team environment

## What We Offer
- Competitive salary commensurate with experience
- Comprehensive benefits package
- Professional development opportunities
- Meaningful work with direct impact

To learn more about this organization, visit: ${websiteContent.url}

*This job description was generated based on the organization's website content. Please contact the organization directly for specific details about current openings.*`;
  }
}

// Save job draft to Supabase
export async function saveJobDraft(
  userId: string,
  jobDescription: string,
  websiteUrl: string,
  organizationName: string
) {
  const { supabase } = await import('@/lib/supabase');
  
  try {
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        user_id: userId,
        title: `Job at ${organizationName}`,
        description: jobDescription,
        organization_url: websiteUrl,
        organization_name: organizationName,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving job draft:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in saveJobDraft:', error);
    return null;
  }
}