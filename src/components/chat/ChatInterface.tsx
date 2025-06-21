import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUp, 
  Bot, 
  Paperclip, 
  Mic,
  Square,
  Globe,
  Loader2,
  FileText,
  Link,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CategorizedToolDropdowns } from '@/components/chat/CategorizedToolDropdowns';
import { JobActionButtons } from '@/components/chat/JobActionButtons';
import { useUserProgress } from '@/hooks/useUserProgress';
import { parseJobDescription } from '@/lib/jobDescriptionParser';
import { generateChatResponse, checkAIStatus } from '@/lib/ai';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  type?: 'suggestion' | 'progress' | 'normal' | 'job-description' | 'jd-request' | 'retry-option';
  metadata?: {
    websiteContent?: any;
    jobId?: string;
    jdDraftId?: string;
    isJDRequest?: boolean;
    jobData?: any;
    canRetry?: boolean;
    retryDraftId?: string;
  };
}

interface ChatInterfaceProps {
  onContentChange: (content: any) => void;
  profile?: any;
}

// Input classification function
function classifyJDInput(input: string): 'brief_only' | 'brief_plus_link' | 'link_only' | 'unclear' {
  const urlRegex = /(https?:\/\/[^\s]+)/;
  const hasLink = urlRegex.test(input);
  const plainText = input.replace(urlRegex, '').trim();
  const hasMeaningfulText = plainText.length > 30 && plainText.split(' ').length > 6;

  if (hasLink && hasMeaningfulText) return 'brief_plus_link';
  if (hasLink && !hasMeaningfulText) return 'link_only';
  if (!hasLink && hasMeaningfulText) return 'brief_only';
  return 'unclear';
}

// Extract URL from input
function extractUrlFromInput(input: string): string | null {
  const urlMatch = input.match(/(https?:\/\/[^\s]+)/);
  return urlMatch ? urlMatch[1] : null;
}

// Extract brief text (removing URLs)
function extractBriefFromInput(input: string): string {
  return input.replace(/(https?:\/\/[^\s]+)/g, '').trim();
}

// Generate JD functions for different input types
async function generateJDFromBrief(brief: string): Promise<string> {
  const { callAI } = await import('@/lib/ai');
  
  const systemPrompt = `You are an expert job description writer specializing in the nonprofit and development sector. Create a comprehensive, professional job description based on the brief provided.

Generate a complete job description that includes:
1. Job Title - Clear, specific, and appropriate for the nonprofit sector
2. Organization Context - Brief background about the type of organization
3. Role Overview - Mission-aligned summary connecting to social impact
4. Key Responsibilities - 5-7 specific, actionable responsibilities
5. Required Qualifications - Essential skills, experience, and education
6. Preferred Qualifications - Nice-to-have skills and experience
7. Skills & Competencies - Technical and soft skills needed
8. Working Conditions - Location, travel requirements, work environment
9. What We Offer - Benefits, growth opportunities, impact potential
10. How to Apply - Clear application instructions

Guidelines:
- Use inclusive, DEI-friendly language throughout
- Focus on impact and mission alignment
- Be specific about experience requirements (years, sectors, skills)
- Include relevant SDG connections where appropriate
- Use professional but warm tone that attracts purpose-driven candidates
- Ensure the JD is comprehensive enough to post immediately
- Make it engaging and inspiring while remaining professional

Format the output as a well-structured job description ready for posting.`;

  const userPrompt = `Please create a comprehensive job description based on this brief:

"${brief}"

Generate a complete, professional job description suitable for the nonprofit/development sector.`;

  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.7,
    max_tokens: 4000
  });

  return response.content;
}

async function generateJDFromBriefAndLink(input: string): Promise<string> {
  const { callAI } = await import('@/lib/ai');
  
  const brief = extractBriefFromInput(input);
  const url = extractUrlFromInput(input);
  
  if (!url) {
    throw new Error('No URL found in input');
  }

  // Fetch organization context from URL
  let orgContext = '';
  try {
    orgContext = await fetchOrganizationContext(url);
  } catch (error) {
    console.warn('⚠️ Could not fetch organization context, proceeding with brief only');
    orgContext = `Organization website: ${url}`;
  }

  const systemPrompt = `You are an expert job description writer specializing in the nonprofit and development sector. Create a comprehensive, professional job description based on the brief and organizational context provided.

Use the organizational context to:
- Align the role with the organization's mission and values
- Include relevant sector-specific language and requirements
- Connect the position to the organization's impact areas
- Ensure cultural and operational fit

Generate a complete job description that includes all standard sections with mission alignment.

Guidelines:
- Use inclusive, DEI-friendly language throughout
- Focus on impact and mission alignment with this specific organization
- Be specific about experience requirements relevant to their sector
- Include relevant SDG connections based on their work
- Use professional but warm tone that attracts purpose-driven candidates
- Ensure the JD reflects the organization's culture and values
- Make it engaging and inspiring while remaining professional

Format the output as a well-structured job description ready for posting.`;

  const userPrompt = `Please create a comprehensive job description based on this information:

**Job Brief:**
"${brief}"

**Organization Context:**
${orgContext}

Generate a complete, professional job description that aligns with this organization's mission and work.`;

  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.7,
    max_tokens: 4000
  });

  return response.content;
}

async function generateJDFromJobPostLink(url: string): Promise<string> {
  const { callAI } = await import('@/lib/ai');
  
  // Fetch existing job posting content
  let existingJD = '';
  try {
    existingJD = await fetchJobPostingContent(url);
  } catch (error) {
    throw new Error('Could not fetch content from the provided URL. Please check the link and try again.');
  }

  const systemPrompt = `You are an expert job description writer specializing in the nonprofit and development sector. Rewrite and improve the provided job posting with better clarity, DEI language, and nonprofit sector alignment.

Improvements to make:
- Enhance clarity and readability
- Use inclusive, DEI-friendly language throughout
- Improve structure and organization
- Add mission-aligned language appropriate for nonprofit sector
- Strengthen impact statements and purpose-driven messaging
- Ensure professional tone while remaining engaging
- Add any missing standard sections
- Remove jargon and make language accessible
- Include relevant SDG connections where appropriate

Generate a complete, improved job description with all standard sections.

Guidelines:
- Maintain the core intent and requirements of the original posting
- Significantly improve language, structure, and appeal
- Focus on attracting mission-driven candidates
- Use warm, professional tone appropriate for nonprofit sector
- Ensure the rewritten JD is ready for immediate posting

Format the output as a well-structured, professional job description.`;

  const userPrompt = `Please rewrite and improve this job posting:

**Source URL:** ${url}

**Original Job Posting:**
${existingJD}

Create an improved version with better clarity, DEI language, and nonprofit sector alignment.`;

  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.7,
    max_tokens: 4000
  });

  return response.content;
}

async function generateJDFromUploadedDraft(fileContent: string, fileName: string): Promise<string> {
  const { callAI } = await import('@/lib/ai');
  
  const systemPrompt = `You are an expert job description writer specializing in the nonprofit and development sector. Refine and improve the uploaded job description draft with better structure, clarity, and nonprofit sector best practices.

Improvements to make:
- Enhance overall structure and organization
- Improve clarity and readability
- Use inclusive, DEI-friendly language throughout
- Strengthen mission alignment and impact messaging
- Add professional polish while maintaining authenticity
- Ensure all standard sections are present and well-written
- Remove jargon and improve accessibility
- Add relevant SDG connections where appropriate
- Optimize for attracting purpose-driven candidates

Generate a refined job description with all standard sections.

Guidelines:
- Preserve the original intent and core requirements
- Significantly improve language, structure, and professional appeal
- Focus on nonprofit sector best practices
- Use warm, professional tone that attracts mission-driven talent
- Ensure the refined JD is ready for immediate posting
- Maintain any organization-specific details and requirements

Format the output as a polished, professional job description.`;

  const userPrompt = `Please refine and improve this job description draft:

**Original File:** ${fileName}

**Content:**
${fileContent}

Create a refined, professional version optimized for the nonprofit sector.`;

  const response = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], {
    temperature: 0.6,
    max_tokens: 4000
  });

  return response.content;
}

// Fetch organization context from URL
async function fetchOrganizationContext(url: string): Promise<string> {
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const html = data.contents;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const title = doc.querySelector('title')?.textContent || 'Organization';
    const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content') || 
                           doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
    
    const bodyText = doc.body?.textContent || '';
    const words = bodyText.replace(/\s+/g, ' ').trim().split(' ');
    const content = words.slice(0, 500).join(' ');
    
    return `Organization: ${title}\nDescription: ${metaDescription}\nContent: ${content}`;
  } catch (error) {
    console.error('Error fetching organization context:', error);
    throw new Error('Failed to fetch organization information from URL');
  }
}

// Fetch job posting content from URL
async function fetchJobPostingContent(url: string): Promise<string> {
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const html = data.contents;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const title = doc.querySelector('title')?.textContent || 'Job Posting';
    const bodyText = doc.body?.textContent || '';
    const words = bodyText.replace(/\s+/g, ' ').trim().split(' ');
    const content = words.slice(0, 1000).join(' ');
    
    return `Title: ${title}\n\nContent: ${content}`;
  } catch (error) {
    console.error('Error fetching job posting content:', error);
    throw new Error('Failed to fetch job posting content from URL');
  }
}

// Extract file content
async function extractFileContent(file: File): Promise<string> {
  try {
    const text = await file.text();
    return text.substring(0, 5000); // Limit to first 5000 characters
  } catch (error) {
    throw new Error('Failed to extract content from file');
  }
}

export function ChatInterface({ onContentChange, profile }: ChatInterfaceProps) {
  const { flags, loading: progressLoading, updateFlag, updateFlags } = useUserProgress(profile?.id);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm your AI assistant for AidJobs. I can help you with job posting, CV analysis, finding matches, and more. What would you like to work on today?",
      sender: 'assistant',
      timestamp: new Date(),
    },
  ]);
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isProcessingJD, setIsProcessingJD] = useState(false);
  const [awaitingJDInput, setAwaitingJDInput] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.max(60, Math.min(textareaRef.current.scrollHeight, 200));
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  // Check AI status on mount
  useEffect(() => {
    checkAIStatus().then(status => {
      setAiAvailable(status.available);
    });
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');

    // Check if we're awaiting JD input
    if (awaitingJDInput) {
      await handleJDInputResponse(currentInput);
      return;
    }

    setIsTyping(true);

    // Use AI service for enhanced responses if available
    try {
      if (aiAvailable) {
        const conversationContext = messages.slice(-5).map(m => `${m.sender}: ${m.content}`).join('\n');
        const aiResponse = await generateChatResponse(currentInput, conversationContext, profile);
        
        const responseMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: aiResponse,
          sender: 'assistant',
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, responseMessage]);
      } else {
        // Fallback to simple response when AI is not available
        const responseMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: generateSimpleResponse(currentInput),
          sender: 'assistant',
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, responseMessage]);
      }
      
      updateMainContent(currentInput);
      await updateProgressBasedOnInput(currentInput);
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Fallback to simple response
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: generateSimpleResponse(currentInput),
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiResponse]);
      updateMainContent(currentInput);
      await updateProgressBasedOnInput(currentInput);
    } finally {
      setIsTyping(false);
    }
  };

  const handleJDInputResponse = async (userInput: string) => {
    console.log('🎯 Processing JD input response:', userInput);
    setIsProcessingJD(true);
    setAwaitingJDInput(false);

    try {
      // Classify the input type
      const inputType = classifyJDInput(userInput);
      console.log('🔍 Input classified as:', inputType);

      // Check if input is unclear
      if (inputType === 'unclear') {
        const clarificationMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "Could you add more detail to help me create a great job description? For example: 'We need a Livelihood Coordinator for a project in Sri Lanka…'",
          sender: 'assistant',
          timestamp: new Date(),
          type: 'jd-request'
        };

        setMessages(prev => [...prev, clarificationMessage]);
        setAwaitingJDInput(true);
        setIsProcessingJD(false);
        return;
      }

      // Check if AI is available
      if (!aiAvailable) {
        const offlineMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "AI is currently offline. Please try again in a few minutes.",
          sender: 'assistant',
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, offlineMessage]);
        setIsProcessingJD(false);
        return;
      }

      // Store in jd_drafts table
      const { data: draft, error: draftError } = await supabase
        .from('jd_drafts')
        .insert({
          user_id: profile.id,
          input_summary: userInput,
          input_type: inputType,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (draftError) {
        throw new Error('Failed to save job description request');
      }

      // Update user progress flags
      await updateFlag('has_submitted_jd_inputs', true);

      let processingMessage: Message;

      // Create appropriate processing message based on input type
      switch (inputType) {
        case 'brief_only':
          processingMessage = {
            id: (Date.now() + 1).toString(),
            content: `✅ Starting your JD based on your brief...\n\n🤖 Creating a comprehensive job description that's mission-aligned and ready for posting...`,
            sender: 'assistant',
            timestamp: new Date(),
          };
          break;
        case 'brief_plus_link':
          const url = extractUrlFromInput(userInput);
          const brief = extractBriefFromInput(userInput);
          processingMessage = {
            id: (Date.now() + 1).toString(),
            content: `✅ Perfect! I have your brief and organization link.\n\n🔗 Analyzing: ${url}\n📝 Brief: "${brief.substring(0, 100)}..."\n\n🤖 Creating a mission-aligned JD that reflects your organization's work...`,
            sender: 'assistant',
            timestamp: new Date(),
          };
          break;
        case 'link_only':
          const jobUrl = extractUrlFromInput(userInput);
          processingMessage = {
            id: (Date.now() + 1).toString(),
            content: `🔗 Fetching your old job post and rewriting it now...\n\nSource: ${jobUrl}\n\n🤖 Creating an improved version with better clarity, DEI language, and nonprofit alignment...`,
            sender: 'assistant',
            timestamp: new Date(),
          };
          break;
        default:
          throw new Error('Unable to classify input type');
      }

      setMessages(prev => [...prev, processingMessage]);

      // Generate JD using the appropriate method
      let generatedJD: string;
      
      switch (inputType) {
        case 'brief_plus_link':
          generatedJD = await generateJDFromBriefAndLink(userInput);
          break;
        case 'link_only':
          const url = extractUrlFromInput(userInput);
          if (!url) throw new Error('No URL found');
          generatedJD = await generateJDFromJobPostLink(url);
          break;
        case 'brief_only':
          generatedJD = await generateJDFromBrief(userInput);
          break;
        default:
          throw new Error('Unknown input type');
      }

      // Update draft with generated JD
      await supabase
        .from('jd_drafts')
        .update({ 
          generated_jd: generatedJD,
          status: 'completed'
        })
        .eq('id', draft.id);

      // Parse the generated JD into structured data
      const parsedJobData = parseJobDescription(generatedJD);

      // Create final message with job description
      const jobMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: generatedJD,
        sender: 'assistant',
        timestamp: new Date(),
        type: 'job-description',
        metadata: {
          jdDraftId: draft.id,
          jobData: parsedJobData,
        }
      };

      // Replace processing message with final result
      setMessages(prev => prev.map(msg => 
        msg.id === processingMessage.id ? jobMessage : msg
      ));

      // Show success message
      const successMessage: Message = {
        id: (Date.now() + 3).toString(),
        content: "🎉 Here's your job description! You can now refine, update tone, or view SDG alignment. The job description is ready for review and publishing.",
        sender: 'assistant',
        timestamp: new Date(),
        type: 'progress'
      };

      setMessages(prev => [...prev, successMessage]);

      // Show the structured JD in the right panel
      onContentChange({
        type: 'job-description',
        title: 'Generated Job Description',
        content: 'AI-generated job description ready for review',
        data: parsedJobData,
        draftId: draft.id
      });

      console.log('✅ JD generation completed successfully');

    } catch (error) {
      console.error('❌ Error processing JD input:', error);
      
      // Show error message
      const errorMessage: Message = {
        id: (Date.now() + 3).toString(),
        content: `❌ Sorry, I encountered an error while processing your input. Please try again.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessingJD(false);
    }
  };

  const generateSimpleResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('upload') && input.includes('cv')) {
      return "I'll help you upload and analyze your CV. Please select the file you'd like to upload, and I'll extract key information like skills, experience, and qualifications to help match you with relevant nonprofit opportunities.";
    } else if (input.includes('post a job') || input.includes('generate') && input.includes('job description')) {
      return "Please share the link to your organizational website or the project this role supports. I'll use that to generate a mission-aligned JD.";
    } else if (input.includes('search') && input.includes('ai')) {
      return "I'll use AI to search for jobs that match your profile and preferences. I can analyze job descriptions, requirements, and company cultures to find the best opportunities for you.";
    } else if (input.includes('manual') && input.includes('search')) {
      return "I'll help you set up manual job search filters and criteria. You can browse through job listings with custom filters for location, salary, organization type, and more.";
    } else if (input.includes('match') && input.includes('cv')) {
      return "I'll analyze your CV against available job postings to find the best matches. I'll consider your skills, experience, and career goals to suggest relevant opportunities.";
    } else if (input.includes('revise') && input.includes('cv')) {
      return "I'll help you tailor your CV for a specific job. I can suggest improvements, highlight relevant experience, and optimize keywords to increase your chances of success.";
    } else if (input.includes('cover letter') && !input.includes('refine')) {
      return "I'll help you write a compelling cover letter that showcases your passion for the nonprofit sector and highlights your relevant experience and skills.";
    } else if (input.includes('organization profile')) {
      return "I'll help you create a comprehensive organization profile that showcases your mission, values, impact, and culture to attract top talent.";
    } else if (input.includes('skill gaps')) {
      return "I'll analyze your current skills and suggest areas for improvement based on your career goals and market demands in the nonprofit sector.";
    } else if (input.includes('similar roles') || input.includes('alternative roles')) {
      return "Based on your background and interests, I'll suggest alternative career paths and roles you might not have considered in the nonprofit sector.";
    } else if (input.includes('refine') && input.includes('cover letter')) {
      return "I'll help you polish and refine your existing cover letter to make it more impactful, personalized, and aligned with the specific role you're applying for.";
    } else {
      return "I'm here to help with all aspects of nonprofit recruitment and career development. What specific task would you like to focus on today?";
    }
  };

  const updateProgressBasedOnInput = async (userInput: string) => {
    if (!profile?.id) {
      console.warn('Cannot update progress: profile or user ID not available');
      return;
    }

    const input = userInput.toLowerCase();
    
    try {
      if (input.includes('upload') && input.includes('cv')) {
        console.log('Updating CV upload progress...');
        await updateFlag('has_uploaded_cv', true);
        setTimeout(async () => {
          console.log('Updating CV analysis progress...');
          await updateFlag('has_analyzed_cv', true);
        }, 2000);
      } else if (input.includes('search') && input.includes('job')) {
        console.log('Updating job selection progress...');
        await updateFlag('has_selected_job', true);
      } else if (input.includes('cover letter') && !input.includes('refine')) {
        console.log('Updating cover letter progress...');
        await updateFlag('has_written_cover_letter', true);
      } else if (input.includes('applied') || input.includes('apply')) {
        console.log('Updating job application progress...');
        await updateFlag('has_applied_to_job', true);
      }
    } catch (error) {
      console.error('Error updating progress based on input:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userInput,
        userId: profile?.id
      });
      
      // Show user-friendly error message
      toast.error('Failed to update progress. Please try again.');
    }
  };

  const updateMainContent = (userInput: string) => {
    const input = userInput.toLowerCase();
    
    if (input.includes('job') && (input.includes('post') || input.includes('create'))) {
      onContentChange({
        type: 'jobs',
        title: 'Job Management',
        content: 'AI-powered job posting and management system'
      });
    } else if (input.includes('cv') || input.includes('resume')) {
      onContentChange({
        type: 'documents',
        title: 'Document Analysis',
        content: 'AI-powered CV and resume analysis'
      });
    } else if (input.includes('match')) {
      onContentChange({
        type: 'matches',
        title: 'Smart Matches',
        content: 'AI-powered candidate matching system'
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if we're in JD mode and this is a supported file type
    if (awaitingJDInput) {
      const allowedTypes = ['doc', 'docx', 'pdf', 'txt'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension && allowedTypes.includes(fileExtension)) {
        // Process as JD file upload
        setIsProcessingJD(true);
        setAwaitingJDInput(false);

        try {
          if (!aiAvailable) {
            const offlineMessage: Message = {
              id: (Date.now() + 1).toString(),
              content: "AI is currently offline. Please try again in a few minutes.",
              sender: 'assistant',
              timestamp: new Date(),
            };

            setMessages(prev => [...prev, offlineMessage]);
            setIsProcessingJD(false);
            return;
          }

          await updateFlag('has_submitted_jd_inputs', true);

          const processingMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: `📄 Perfect! I received your file: "${file.name}"\n\nI'm extracting the content and improving it with better structure, DEI language, and nonprofit alignment...`,
            sender: 'assistant',
            timestamp: new Date(),
          };

          setMessages(prev => [...prev, processingMessage]);

          // Extract file content
          const fileContent = await extractFileContent(file);

          // Store in jd_drafts table
          const { data: draft, error: draftError } = await supabase
            .from('jd_drafts')
            .insert({
              user_id: profile.id,
              input_summary: `Uploaded file: ${file.name}`,
              input_type: 'upload',
              file_name: file.name,
              file_type: fileExtension,
              content: fileContent,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (draftError) {
            throw new Error('Failed to save uploaded file');
          }

          // Generate improved JD
          const generatedJD = await generateJDFromUploadedDraft(fileContent, file.name);
          
          // Update draft with generated JD
          await supabase
            .from('jd_drafts')
            .update({ 
              generated_jd: generatedJD,
              status: 'completed'
            })
            .eq('id', draft.id);

          // Parse the generated JD into structured data
          const parsedJobData = parseJobDescription(generatedJD);

          // Create final message with improved job description
          const jobMessage: Message = {
            id: (Date.now() + 2).toString(),
            content: generatedJD,
            sender: 'assistant',
            timestamp: new Date(),
            type: 'job-description',
            metadata: {
              jdDraftId: draft.id,
              jobData: parsedJobData,
            }
          };

          // Replace processing message with final result
          setMessages(prev => prev.map(msg => 
            msg.id === processingMessage.id ? jobMessage : msg
          ));

          // Show the structured JD in the right panel
          onContentChange({
            type: 'job-description',
            title: 'Generated Job Description',
            content: 'AI-generated job description ready for review',
            data: parsedJobData,
            draftId: draft.id
          });

        } catch (error) {
          console.error('❌ Error processing JD file upload:', error);
          
          const errorMessage: Message = {
            id: (Date.now() + 3).toString(),
            content: `❌ Sorry, I couldn't process that file. Please try again or use a different format.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`,
            sender: 'assistant',
            timestamp: new Date(),
          };

          setMessages(prev => [...prev, errorMessage]);
        } finally {
          setIsProcessingJD(false);
        }

        e.target.value = '';
        return;
      }
    }

    // Regular file upload handling (CV, etc.)
    const allowedTypes = ['.pdf', '.docx', '.txt', '.json'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: `Sorry, only ${allowedTypes.join(', ')} files are supported.`,
        sender: 'assistant',
        timestamp: new Date(),
      }]);
      return;
    }

    if (file.name.toLowerCase().includes('cv') || file.name.toLowerCase().includes('resume')) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: "Perfect! I've received your CV. Let me analyze it for you...",
        sender: 'assistant',
        timestamp: new Date(),
      }]);
      
      try {
        await updateFlag('has_uploaded_cv', true);
        setTimeout(async () => {
          await updateFlag('has_analyzed_cv', true);
        }, 2000);
      } catch (error) {
        console.error('Error updating CV upload progress:', error);
        toast.error('Failed to update progress. Please try again.');
      }
    } else {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: `I've received your ${fileExtension} file: "${file.name}". How would you like me to help you with this document?`,
        sender: 'assistant',
        timestamp: new Date(),
      }]);
    }

    e.target.value = '';
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const canSend = input.trim().length > 0 && !isTyping && !isProcessingJD;

  const handleToolAction = (toolId: string, message: string) => {
    // CLEAR ALL PREVIOUS BEHAVIOR - Handle ONLY the JD tool
    if (message === 'POST_JD_TOOL_TRIGGER') {
      console.log('🎯 JD Tool triggered - NEW FLOW');
      
      // Update progress flag
      updateFlag('has_started_jd', true);
      
      // Set awaiting input state
      setAwaitingJDInput(true);
      
      // Send the EXACT message specified in the prompt
      const jdRequestMessage: Message = {
        id: Date.now().toString(),
        content: "Let's get started on your job description. You can choose how you'd like to begin:\n\n1. Paste a **brief only** (e.g., \"We need a field coordinator for a migration project…\")\n2. **Upload a JD draft** — I'll refine and improve it.\n3. Paste a **link to an old job post** — I'll fetch and rewrite it with better clarity, DEI, and alignment.\n4. Paste a **brief + organization/project link** — I'll use both to generate a well-aligned JD.\n\nSend any one of these to begin.",
        sender: 'assistant',
        timestamp: new Date(),
        type: 'jd-request',
        metadata: {
          isJDRequest: true
        }
      };
      
      setMessages(prev => [...prev, jdRequestMessage]);
      return;
    }
    
    // For other tools, use the existing logic
    setInput(message);
    // Auto-send the message
    setTimeout(() => handleSend(), 100);
  };

  const handleInactiveToolClick = (message: string) => {
    const inactiveMessage: Message = {
      id: Date.now().toString(),
      content: message,
      sender: 'assistant',
      timestamp: new Date(),
      type: 'suggestion'
    };
    setMessages(prev => [...prev, inactiveMessage]);
  };

  // Job action handlers
  const handleEditJob = (messageId: string) => {
    toast.info('Job editing feature coming soon!');
  };

  const handlePreviewJob = (messageId: string) => {
    toast.info('Job preview feature coming soon!');
  };

  const handlePublishJob = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message?.metadata?.jobId && !message?.metadata?.jdDraftId || !profile?.id) return;

    setIsPublishing(true);
    
    try {
      let jobId = message.metadata.jobId;
      
      // If we have a JD draft, create a job record first
      if (message.metadata.jdDraftId && !jobId) {
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .insert({
            user_id: profile.id,
            title: 'Generated Job Description',
            description: message.content,
            status: 'published',
            published_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (jobError) {
          throw jobError;
        }
        
        jobId = jobData.id;
      } else if (jobId) {
        // Update existing job status to published
        const { error } = await supabase
          .from('jobs')
          .update({ 
            status: 'published',
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId)
          .eq('user_id', profile.id);

        if (error) {
          throw error;
        }
      }

      // Update user progress
      await updateFlag('has_published_job', true);

      // Show success message
      const successMessage: Message = {
        id: Date.now().toString(),
        content: "🎉 Congratulations! Your job has been published successfully. It's now live and visible to mission-aligned candidates on AidJobs.\n\nNext steps:\n• Monitor applications in your dashboard\n• Use our AI matching to find top candidates\n• Set up interview workflows",
        sender: 'assistant',
        timestamp: new Date(),
        type: 'progress'
      };

      setMessages(prev => [...prev, successMessage]);
      toast.success('Job published successfully!');

    } catch (error) {
      console.error('Error publishing job:', error);
      toast.error('Failed to publish job. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div 
        className="flex flex-col h-full border-r"
        style={{ 
          backgroundColor: '#FFFFFF',
          borderColor: '#D8D5D2'
        }}
      >
        {/* Messages - Now takes full height */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-[85%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback 
                        className="text-sm"
                        style={{
                          backgroundColor: message.sender === 'user' ? '#FBE4D5' : '#F1EFEC',
                          color: message.sender === 'user' ? '#D5765B' : '#66615C'
                        }}
                      >
                        {message.sender === 'user' ? (
                          profile?.name?.charAt(0) || 'U'
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`mx-3 ${message.sender === 'user' ? 'text-right' : 'text-left'} w-full`}>
                      <motion.div
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        className={`inline-block p-3 rounded-2xl font-light leading-relaxed shadow-sm ${
                          message.type === 'suggestion' ? 'border-l-4' : ''
                        } ${
                          message.type === 'jd-request' ? 'border-l-4' : ''
                        } ${
                          message.type === 'retry-option' ? 'border-l-4' : ''
                        }`}
                        style={{
                          backgroundColor: message.sender === 'user' ? '#D5765B' : 
                                         message.type === 'suggestion' ? '#FBE4D5' : 
                                         message.type === 'jd-request' ? '#E8F5E8' : 
                                         message.type === 'retry-option' ? '#FEF3CD' : '#F1EFEC',
                          color: message.sender === 'user' ? '#FFFFFF' : '#3A3936',
                          borderLeftColor: message.type === 'suggestion' ? '#D5765B' : 
                                          message.type === 'jd-request' ? '#10B981' : 
                                          message.type === 'retry-option' ? '#F59E0B' : 'transparent'
                        }}
                      >
                        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                        
                        {/* Processing indicators */}
                        {isProcessingJD && message.content.includes('generating') && (
                          <div className="flex items-center mt-2 space-x-2">
                            <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#D5765B' }} />
                            <span className="text-xs" style={{ color: '#66615C' }}>
                              {aiAvailable ? 'Generating with AI...' : 'Generating with templates...'}
                            </span>
                          </div>
                        )}

                        {/* JD Request indicators */}
                        {message.type === 'jd-request' && (
                          <div className="flex items-center mt-2 space-x-2">
                            <div className="flex space-x-1">
                              <FileText className="w-3 h-3" style={{ color: '#10B981' }} />
                              <Paperclip className="w-3 h-3" style={{ color: '#10B981' }} />
                              <Link className="w-3 h-3" style={{ color: '#10B981' }} />
                            </div>
                            <span className="text-xs font-medium" style={{ color: '#10B981' }}>
                              Brief • Upload • Link
                            </span>
                          </div>
                        )}
                      </motion.div>
                      
                      {/* Job Action Buttons */}
                      {message.type === 'job-description' && message.sender === 'assistant' && (
                        <JobActionButtons
                          onEdit={() => handleEditJob(message.id)}
                          onPreview={() => handlePreviewJob(message.id)}
                          onPublish={() => handlePublishJob(message.id)}
                          isPublishing={isPublishing}
                        />
                      )}
                      
                      <p 
                        className="text-xs mt-2 font-light"
                        style={{ color: '#66615C' }}
                      >
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing Indicator */}
            <AnimatePresence>
              {(isTyping || isProcessingJD) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex justify-start"
                >
                  <div className="flex">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback 
                        style={{
                          backgroundColor: '#F1EFEC',
                          color: '#66615C'
                        }}
                      >
                        <Bot className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="mx-3">
                      <div 
                        className="inline-block p-3 rounded-2xl shadow-sm"
                        style={{ backgroundColor: '#F1EFEC' }}
                      >
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <motion.div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: '#66615C' }}
                              animate={{ y: [0, -4, 0] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                            />
                            <motion.div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: '#66615C' }}
                              animate={{ y: [0, -4, 0] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }}
                            />
                            <motion.div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: '#66615C' }}
                              animate={{ y: [0, -4, 0] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                            />
                          </div>
                          <span className="text-xs" style={{ color: '#66615C' }}>
                            {isProcessingJD ? 'Generating job description...' : 'AI is thinking...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* Input Area */}
        <div 
          className="p-4 border-t"
          style={{ borderColor: '#D8D5D2' }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={awaitingJDInput ? ".doc,.docx,.pdf,.txt" : ".pdf,.docx,.txt,.json"}
            onChange={handleFileChange}
            className="hidden"
          />

          <motion.div
            className="relative rounded-2xl border transition-all duration-200 shadow-sm"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: isFocused ? '#D5765B' : '#D8D5D2',
              borderWidth: '1px',
            }}
            animate={{
              borderColor: isFocused ? '#D5765B' : '#D8D5D2',
              boxShadow: isFocused ? '0 0 0 3px rgba(213, 118, 91, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div className="flex items-end space-x-2 p-3">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={awaitingJDInput ? "Paste a brief, upload a file, or share a job posting URL..." : "Ask me anything about jobs, CVs, or matches..."}
                className="flex-1 min-h-[60px] max-h-[200px] resize-none border-0 bg-transparent font-light text-sm focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 leading-relaxed"
                style={{ 
                  color: '#3A3936',
                  boxShadow: 'none'
                }}
                disabled={isTyping || isProcessingJD}
              />

              <motion.div
                whileHover={{ scale: canSend ? 1.1 : 1 }}
                whileTap={{ scale: canSend ? 0.9 : 1 }}
                className="flex-shrink-0"
              >
                <Button
                  onClick={handleSend}
                  disabled={!canSend}
                  className="h-6 w-6 rounded-lg text-white transition-all duration-200 shadow-sm p-0 flex items-center justify-center"
                  style={{ 
                    backgroundColor: canSend ? '#D5765B' : '#D8D5D2',
                    opacity: canSend ? 1 : 0.5
                  }}
                >
                  <ArrowUp className="w-3 h-3" />
                </Button>
              </motion.div>
            </div>

            <div 
              className="flex items-center justify-between px-3 pb-2 pt-1 border-t"
              style={{ borderColor: '#F1EFEC' }}
            >
              <div className="flex items-center space-x-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleFileUpload}
                      className="h-5 w-5 p-0 rounded-md hover:shadow-sm transition-all duration-200"
                      style={{ color: '#66615C' }}
                      disabled={isTyping || isProcessingJD}
                    >
                      <Paperclip className="w-2.5 h-2.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-gray-900 text-white text-xs">
                    {awaitingJDInput ? 'Upload JD file (.doc, .docx, .pdf, .txt)' : 'Attach files (.pdf, .docx, .txt, .json)'}
                  </TooltipContent>
                </Tooltip>

                {/* Categorized Tool Dropdowns */}
                {!progressLoading && (
                  <CategorizedToolDropdowns
                    flags={flags}
                    onToolAction={handleToolAction}
                    onInactiveToolClick={handleInactiveToolClick}
                    disabled={isTyping || isProcessingJD}
                  />
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleRecording}
                      className="h-5 w-5 p-0 rounded-md hover:shadow-sm transition-all duration-200"
                      style={{ 
                        color: isRecording ? '#D5765B' : '#66615C',
                        backgroundColor: isRecording ? '#FBE4D5' : 'transparent'
                      }}
                      disabled={isTyping || isProcessingJD}
                    >
                      {isRecording ? (
                        <Square className="w-2.5 h-2.5" />
                      ) : (
                        <Mic className="w-2.5 h-2.5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-gray-900 text-white text-xs">
                    {isRecording ? 'Stop recording' : 'Voice input'}
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="flex items-center space-x-1 text-xs" style={{ color: '#66615C' }}>
                {!aiAvailable && (
                  <span className="mr-2 text-xs" style={{ color: '#F59E0B' }}>AI Offline</span>
                )}
                <span>{input.length}</span>
                <span>/</span>
                <span>2000</span>
              </div>
            </div>
          </motion.div>
          
          <div className="flex justify-between items-center mt-2">
            <p 
              className="text-xs font-light"
              style={{ color: '#66615C' }}
            >
              {awaitingJDInput ? 'Provide job details, upload file, or paste URL' : 'Press Enter to send, Shift+Enter for new line'}
            </p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}