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
import { useUserProgress } from '@/hooks/useUserProgress';
import { generateChatResponse, checkAIStatus, callAI } from '@/lib/ai';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  type?: 'suggestion' | 'progress' | 'normal';
  metadata?: {
    websiteContent?: any;
    jobId?: string;
    draftId?: string;
  };
}

interface ChatInterfaceProps {
  onContentChange: (content: any) => void;
  profile?: any;
}

// Real AI function for JD generation using the AI service
async function generateFullJD(input: string, inputType: 'brief' | 'upload' | 'link'): Promise<any> {
  console.log('🤖 Generating JD with input:', { inputType, inputLength: input.length });
  
  // Construct the AI prompt for structured JD generation
  const systemPrompt = `You are an expert AI assistant specializing in creating comprehensive job descriptions for the nonprofit, humanitarian, and development sector. 

Your task is to generate a complete, professional job description based on the user's input. You must return a valid JSON object with the following exact structure:

{
  "overview": {
    "title": "Job Title",
    "organization": "Organization Name",
    "location": "Location (Remote/City/Country)",
    "contract_type": "full-time|part-time|contract|consultant|volunteer|internship|temporary|freelance",
    "salary_range": "Salary range or 'Competitive' or 'Commensurate with experience'",
    "application_deadline": "YYYY-MM-DD format or 'Until filled'"
  },
  "sections": {
    "job_summary": {
      "title": "Job Summary",
      "content": "Compelling 2-3 sentence overview of the role and its impact",
      "locked": false
    },
    "responsibilities": {
      "title": "Key Responsibilities",
      "content": "• Bullet point list of main duties and responsibilities",
      "locked": false
    },
    "qualifications": {
      "title": "Qualifications",
      "content": "• Required and preferred qualifications\n• Education requirements\n• Experience requirements",
      "locked": false
    },
    "skills_competencies": {
      "title": "Skills & Competencies",
      "content": "• Technical skills\n• Soft skills\n• Language requirements",
      "locked": false
    },
    "how_to_apply": {
      "title": "How to Apply",
      "content": "Clear instructions on application process and required documents",
      "locked": false
    }
  },
  "metadata": {
    "sdgs": ["Relevant SDG names"],
    "sectors": ["Relevant sectors"],
    "impact_areas": ["Impact areas"],
    "dei_score": 85,
    "clarity_score": 90,
    "ai_suggestions": [
      {
        "text": "Suggestion text",
        "type": "enhancement|improvement|warning"
      }
    ]
  }
}

Guidelines:
- Use inclusive, bias-free language
- Focus on impact and mission alignment
- Include specific, actionable responsibilities
- Make qualifications realistic and not overly restrictive
- Ensure content is appropriate for nonprofit/development sector
- Use bullet points for lists
- Keep content professional but engaging
- Return ONLY the JSON object, no additional text`;

  let userPrompt = '';
  
  if (inputType === 'brief') {
    userPrompt = `Create a comprehensive job description based on this job brief:\n\n${input}`;
  } else if (inputType === 'link') {
    userPrompt = `Create a comprehensive job description based on this job brief and organization information:\n\n${input}`;
  } else if (inputType === 'upload') {
    userPrompt = `Create a comprehensive job description based on this uploaded job description file. Improve and enhance the content while maintaining the core requirements:\n\n${input}`;
  }

  try {
    // Call the AI service
    const response = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      temperature: 0.7,
      max_tokens: 3000
    });

    console.log('🤖 Raw AI response:', response.content);

    // Parse the JSON response
    let jdData;
    try {
      // Clean the response to extract JSON
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      jdData = JSON.parse(jsonMatch[0]);
      console.log('✅ Parsed JD data:', jdData);
    } catch (parseError) {
      console.error('❌ Failed to parse AI response as JSON:', parseError);
      throw new Error('AI response was not valid JSON');
    }

    // Validate the structure
    if (!jdData.overview || !jdData.sections || !jdData.metadata) {
      throw new Error('AI response missing required structure');
    }

    return jdData;

  } catch (error) {
    console.error('❌ Error in generateFullJD:', error);
    
    // Fallback error response
    throw new Error(`Failed to generate job description: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
  const [aiConnected, setAiConnected] = useState<boolean | null>(null);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [isGeneratingJD, setIsGeneratingJD] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Utility function to convert markdown to HTML while preserving list markers
  const convertMarkdownToHtml = (text: string): string => {
    return text
      // Convert bold formatting (**text** or __text__) to <strong>
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      // Convert italic formatting (*text* or _text_) to <em>
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      // Convert headers (# ## ### etc.) to appropriate heading tags
      .replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
      .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
      .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
      .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
      .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
      .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
      // Convert strikethrough (~~text~~) to <del>
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      // Convert blockquotes (> text) to <blockquote>
      .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
      // Convert inline code (`code`) to <code>
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Convert code blocks (```code```) to <pre><code>
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // Convert horizontal rules (--- or ***) to <hr>
      .replace(/^[-*]{3,}$/gm, '<hr>')
      // Preserve list markers but don't convert to HTML lists (keep as plain text)
      // This preserves: "1. item", "a. item", "- item", "* item"
      // Convert line breaks to <br> tags
      .replace(/\n/g, '<br>')
      // Clean up extra whitespace but preserve intentional spacing
      .replace(/<br><br><br>/g, '<br><br>')
      .trim();
  };

  // Function to detect if input is valid for JD generation
  const detectJDInput = (userInput: string): { isValid: boolean; type?: 'brief' | 'link' | 'upload'; hasLink?: boolean } => {
    const input = userInput.toLowerCase().trim();
    
    // Check for URLs in the input
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const hasUrl = urlRegex.test(userInput);
    
    // Check if it's a substantial job brief (more than 50 characters and contains job-related keywords)
    const jobKeywords = ['position', 'role', 'job', 'responsibilities', 'qualifications', 'requirements', 'experience', 'skills', 'organization', 'company', 'team', 'manager', 'coordinator', 'officer', 'director', 'analyst', 'specialist', 'program', 'project', 'development', 'humanitarian', 'nonprofit', 'ngo'];
    const hasJobKeywords = jobKeywords.some(keyword => input.includes(keyword));
    const isSubstantial = userInput.trim().length > 50;
    
    if (hasUrl && hasJobKeywords && isSubstantial) {
      return { isValid: true, type: 'link', hasLink: true };
    } else if (hasJobKeywords && isSubstantial) {
      return { isValid: true, type: 'brief', hasLink: false };
    }
    
    return { isValid: false };
  };

  // Function to generate and store JD
  const generateAndStoreJD = async (userInput: string, inputType: 'brief' | 'link' | 'upload') => {
    if (!profile?.id) {
      toast.error('Please sign in to generate job descriptions');
      return;
    }

    setIsGeneratingJD(true);
    
    try {
      console.log('🚀 Starting JD generation process...');
      
      // Update progress flags
      await updateFlag('has_started_jd', true);
      
      // Generate the structured JD using AI
      const jdData = await generateFullJD(userInput, inputType);
      
      console.log('📝 Generated JD data:', jdData);
      
      // Store in Supabase job_drafts table
      const { data: draft, error } = await supabase
        .from('job_drafts')
        .insert({
          user_id: profile.id,
          title: jdData.overview.title,
          organization_name: jdData.overview.organization,
          location: jdData.overview.location,
          contract_type: jdData.overview.contract_type,
          salary_range: jdData.overview.salary_range,
          application_end_date: jdData.overview.application_deadline !== 'Until filled' ? jdData.overview.application_deadline : null,
          sections: jdData.sections,
          metadata: jdData.metadata,
          section_order: Object.keys(jdData.sections),
          ai_generated: true,
          ai_generation_method: inputType,
          generation_metadata: {
            input_type: inputType,
            input_content: userInput.substring(0, 1000), // Store first 1000 chars for reference
            generated_at: new Date().toISOString(),
            ai_model: 'deepseek-chat-v3',
            processing_time: Date.now()
          },
          draft_status: 'draft'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      console.log('✅ Stored draft in Supabase:', draft);

      // Update progress flags
      await updateFlag('has_generated_jd', true);
      await updateFlag('jd_generation_failed', false);

      // Trigger the JD editor to open with this draft
      onContentChange({
        type: 'job-description-editor',
        draftId: draft.id,
        title: 'Job Description Editor',
        content: 'AI-generated job description ready for editing'
      });

      // Add success message to chat
      const successMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Your job description is ready! You can now review, edit, and improve it using the editor on the right.",
        sender: 'assistant',
        timestamp: new Date(),
        type: 'progress'
      };

      setMessages(prev => [...prev, successMessage]);

    } catch (error) {
      console.error('❌ Error generating JD:', error);
      
      // Update failure flag
      await updateFlag('jd_generation_failed', true);
      
      // Add error message to chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I encountered an error while generating your job description: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or contact support if the issue persists.`,
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to generate job description');
    } finally {
      setIsGeneratingJD(false);
    }
  };

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

  // Check AI connectivity on component mount
  useEffect(() => {
    checkAIConnectivity();
  }, []);

  const checkAIConnectivity = async () => {
    try {
      const status = await checkAIStatus();
      setAiConnected(status.available);
    } catch (error) {
      setAiConnected(false);
    }
  };

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

    // Check if this is a JD generation request and we're in the Post a Job tool
    if (activeToolId === 'post-job-generate-jd') {
      const jdDetection = detectJDInput(currentInput);
      
      if (jdDetection.isValid && jdDetection.type) {
        // Add immediate acknowledgment message
        const ackMessage: Message = {
          id: (Date.now() + 0.5).toString(),
          content: "Thanks! Generating your job description now...",
          sender: 'assistant',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, ackMessage]);
        
        // Generate and store the JD
        await generateAndStoreJD(currentInput, jdDetection.type);
        return;
      }
    }

    setIsTyping(true);

    // Use AI service for enhanced responses
    try {
      // Prepare conversation context
      const conversationContext = messages.slice(-5).map(m => `${m.sender}: ${m.content}`).join('\n');
      
      // Add system prompt for Post a Job tool if active
      let systemPrompt = undefined;
      if (activeToolId === 'post-job-generate-jd') {
        systemPrompt = `You are an expert AI assistant helping users post jobs on AidJobs — a platform for the nonprofit, humanitarian, and development sector. You are guiding them to generate a high-quality job description (JD) using one of three allowed input methods:

1. Paste a job brief + organization or project website link  
2. Paste a job brief only  
3. Upload an old JD file  

You must only accept and process one of these three input types. Guide the user naturally based on their input.

Your tone is helpful, respectful, and professional — never robotic. Never use code blocks, formatting symbols, or markdown.

Always follow these rules:
- When the tool starts, ask: "How would you like to begin?" and list the three options.
- If the user enters valid input, confirm and begin JD generation.
- If input is partial or unclear, gently clarify what's needed.
- If the user enters irrelevant or unrelated input, gently redirect.
- If the user asks something off-topic, answer briefly and bring them back.
- If they say "cancel" or "start over," confirm and reset the chat flow.
- If a JD has already been generated, help them refine or publish it.
- If the AI fails, respond with: "The assistant is currently offline. You can still edit your JD manually or try again shortly."

Your job is to keep the flow intelligent, natural, helpful, and resilient.`;
      }
      
      // Generate AI response
      const aiResponse = await generateChatResponse(
        currentInput, 
        conversationContext, 
        profile,
        systemPrompt
      );
      
      // Convert markdown to HTML for proper rendering
      const formattedResponse = convertMarkdownToHtml(aiResponse);
      
      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: formattedResponse,
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, responseMessage]);
      updateMainContent(currentInput);
      await updateProgressBasedOnInput(currentInput);
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Special fallback for Post a Job tool
      if (activeToolId === 'post-job-generate-jd') {
        const fallbackMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "The assistant is currently offline. You can still edit your JD manually or try again shortly.",
          sender: 'assistant',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, fallbackMessage]);
        
        // Set jd_generation_failed flag
        if (profile?.id) {
          await updateFlag('jd_generation_failed', true);
        }
      } else {
        // Fallback to simple response for other tools
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: generateSimpleResponse(currentInput),
          sender: 'assistant',
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, aiResponse]);
      }
      
      updateMainContent(currentInput);
      await updateProgressBasedOnInput(currentInput);
    } finally {
      setIsTyping(false);
    }
  };

  const generateSimpleResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('upload') && input.includes('cv')) {
      return "I'll help you upload and analyze your CV. Please select the file you'd like to upload, and I'll extract key information like skills, experience, and qualifications to help match you with relevant nonprofit opportunities.";
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
    
    if (input.includes('cv') || input.includes('resume')) {
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

    // Check if we're in the Post a Job tool and this is a JD file
    if (activeToolId === 'post-job-generate-jd') {
      const allowedTypes = ['.pdf', '.docx', '.txt'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          content: `Sorry, only ${allowedTypes.join(', ')} files are supported for job description uploads.`,
          sender: 'assistant',
          timestamp: new Date(),
        }]);
        return;
      }

      // Add user message about file upload
      const userMessage: Message = {
        id: Date.now().toString(),
        content: `Uploaded file: ${file.name}`,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      // Add acknowledgment message
      const ackMessage: Message = {
        id: (Date.now() + 0.5).toString(),
        content: "Thanks! Processing your uploaded job description file...",
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, ackMessage]);

      // Generate JD from uploaded file (using filename as placeholder for actual file content)
      await generateAndStoreJD(`Uploaded JD file: ${file.name}\n\nPlease enhance and improve this job description while maintaining the core requirements and structure.`, 'upload');
      
      e.target.value = '';
      return;
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

  const canSend = input.trim().length > 0 && !isTyping && !isGeneratingJD;

  const handleToolAction = async (toolId: string, message: string, autoSubmit = false) => {
    // Set active tool ID for context-aware responses
    setActiveToolId(toolId);
    
    // For Post a Job tool, update progress flag and show AI-generated response
    if (toolId === 'post-job-generate-jd') {
      if (profile?.id) {
        await updateFlag('has_started_jd', true);
      }
      
      // Set input but don't auto-send
      setInput(message);
      
      // Auto-submit if requested (for AI-controlled tools)
      if (autoSubmit) {
        // First, add the user message
        const userMessage: Message = {
          id: Date.now().toString(),
          content: message,
          sender: 'user',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, userMessage]);
        setInput(''); // Clear input field
        setIsTyping(true);
        
        // Then generate and add the AI response
        try {
          // Prepare conversation context
          const conversationContext = messages.slice(-5).map(m => `${m.sender}: ${m.content}`).join('\n');
          
          // Add system prompt for Post a Job tool
          const systemPrompt = `You are an expert AI assistant helping users post jobs on AidJobs — a platform for the nonprofit, humanitarian, and development sector. You are guiding them to generate a high-quality job description (JD) using one of three allowed input methods:

1. Paste a job brief + organization or project website link  
2. Paste a job brief only  
3. Upload an old JD file  

You must only accept and process one of these three input types. Guide the user naturally based on their input.

Your tone is helpful, respectful, and professional — never robotic. Never use code blocks, formatting symbols, or markdown.

Always follow these rules:
- When the tool starts, ask: "How would you like to begin?" and list the three options.
- If the user enters valid input, confirm and begin JD generation.
- If input is partial or unclear, gently clarify what's needed.
- If the user enters irrelevant or unrelated input, gently redirect.
- If the user asks something off-topic, answer briefly and bring them back.
- If they say "cancel" or "start over," confirm and reset the chat flow.
- If a JD has already been generated, help them refine or publish it.
- If the AI fails, respond with: "The assistant is currently offline. You can still edit your JD manually or try again shortly."

Your job is to keep the flow intelligent, natural, helpful, and resilient.`;
          
          // Generate AI response with updated message
          const aiResponse = await generateChatResponse(
            message, 
            conversationContext, 
            profile,
            systemPrompt
          );
          
          // Update the message to be more action-oriented
          const updatedResponse = aiResponse.replace(
            "Just let me know which method works best for you!",
            "You can go ahead and paste the brief (with or without a link), or upload a file — whichever works best for you."
          );
          
          // Convert markdown to HTML for proper rendering
          const formattedResponse = convertMarkdownToHtml(updatedResponse);
          
          const responseMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: formattedResponse,
            sender: 'assistant',
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, responseMessage]);
        } catch (error) {
          console.error('Error getting AI response:', error);
          
          // Special fallback for Post a Job tool with updated message
          const fallbackMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: "I'll help you create a professional job description for the nonprofit sector. How would you like to begin?<br><br>1. <strong>Paste a job brief + organization link</strong> — Share your job requirements along with your organization's website<br>2. <strong>Paste a job brief only</strong> — Share just your job requirements and I'll help structure them<br>3. <strong>Upload an old JD file</strong> — Upload an existing job description to enhance and improve<br><br>You can go ahead and paste the brief (with or without a link), or upload a file — whichever works best for you.",
            sender: 'assistant',
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, fallbackMessage]);
          
          // Set jd_generation_failed flag
          if (profile?.id) {
            await updateFlag('jd_generation_failed', true);
          }
        } finally {
          setIsTyping(false);
        }
      }
    } else {
      // For other tools, just set the input
      setInput(message);
    }
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
                          message.type === 'progress' ? 'border-l-4 border-l-green-500' : ''
                        }`}
                        style={{
                          backgroundColor: message.sender === 'user' ? '#D5765B' : 
                                         message.type === 'suggestion' ? '#FBE4D5' : 
                                         message.type === 'progress' ? '#F0FDF4' : '#F1EFEC',
                          color: message.sender === 'user' ? '#FFFFFF' : '#3A3936',
                          borderLeftColor: message.type === 'suggestion' ? '#D5765B' : 
                                          message.type === 'progress' ? '#10B981' : 'transparent'
                        }}
                      >
                        <div 
                          className="text-sm"
                          dangerouslySetInnerHTML={{ __html: message.content }}
                          style={{
                            lineHeight: '1.6'
                          }}
                        />
                      </motion.div>
                      
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
              {(isTyping || isGeneratingJD) && (
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
                            {isGeneratingJD ? 'Generating job description...' : 'AI is thinking...'}
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
            accept=".pdf,.docx,.txt,.json"
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
                placeholder="Ask me anything about jobs, CVs, or matches..."
                className="flex-1 min-h-[60px] max-h-[200px] resize-none border-0 bg-transparent font-light text-sm focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 leading-relaxed"
                style={{ 
                  color: '#3A3936',
                  boxShadow: 'none'
                }}
                disabled={isTyping || isGeneratingJD}
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
                      disabled={isTyping || isGeneratingJD}
                    >
                      <Paperclip className="w-2.5 h-2.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-gray-900 text-white text-xs">
                    Attach files (.pdf, .docx, .txt, .json)
                  </TooltipContent>
                </Tooltip>

                {/* Categorized Tool Dropdowns */}
                {!progressLoading && (
                  <CategorizedToolDropdowns
                    flags={flags}
                    onToolAction={handleToolAction}
                    onInactiveToolClick={handleInactiveToolClick}
                    disabled={isTyping || isGeneratingJD}
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
                      disabled={isTyping || isGeneratingJD}
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
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}