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
import { generateChatResponse, checkAIStatus } from '@/lib/ai';
import { parseJobDescription } from '@/lib/jobDescriptionParser';
import { 
  processJDInput, 
  generateJDFromInput, 
  validateBriefInput,
  isValidUrl,
  extractDomain,
  createFallbackDraft
} from '@/lib/jobDescriptionService';
import { parseJDInput } from '@/lib/jdInputParser';
import { scrapeWebsite } from '@/lib/jobBuilder';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  type?: 'suggestion' | 'progress' | 'normal' | 'job-description' | 'jd-request' | 'retry-option' | 'ai-offline' | 'jd-modification';
  metadata?: {
    websiteContent?: any;
    jobId?: string;
    jdDraftId?: string;
    isJDRequest?: boolean;
    jobData?: any;
    canRetry?: boolean;
    retryDraftId?: string;
    modifiedSection?: string;
    originalContent?: string;
  };
}

interface ChatInterfaceProps {
  onContentChange: (content: any) => void;
  profile?: any;
  currentJDData?: any;
}

export function ChatInterface({ onContentChange, profile, currentJDData }: ChatInterfaceProps) {
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
  const [isPublishing, setIsPublishing] = useState(false);
  const [aiConnected, setAiConnected] = useState<boolean | null>(null);
  const [awaitingJDInput, setAwaitingJDInput] = useState(false);
  const [isModifyingJD, setIsModifyingJD] = useState(false);
  
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

  // Check AI connectivity on component mount
  useEffect(() => {
    checkAIConnectivity();
  }, []);

  // Add welcome message when currentJDData changes
  useEffect(() => {
    if (currentJDData && messages.length === 1) {
      // Add a welcome message specific to JD editing
      const jdWelcomeMessage: Message = {
        id: Date.now().toString(),
        content: `I see you're working on a job description for "${currentJDData.title}". I can help you refine specific sections or improve the overall content. Just let me know what you'd like to modify!`,
        sender: 'assistant',
        timestamp: new Date(),
        type: 'jd-modification'
      };
      
      setMessages(prev => [...prev, jdWelcomeMessage]);
    }
  }, [currentJDData, messages.length]);

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

    // Check if we're awaiting JD input
    if (awaitingJDInput) {
      await handleJDInputResponse(currentInput);
      return;
    }

    // Check if we're modifying a JD and have currentJDData
    if (currentJDData) {
      await handleJDModificationRequest(currentInput);
      return;
    }

    setIsTyping(true);

    // Use AI service for enhanced responses
    try {
      const conversationContext = messages.slice(-5).map(m => `${m.sender}: ${m.content}`).join('\n');
      const aiResponse = await generateChatResponse(currentInput, conversationContext, profile, currentJDData);
      
      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, responseMessage]);
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

  const handleJDModificationRequest = async (userInput: string) => {
    setIsModifyingJD(true);
    
    try {
      // Determine which section the user wants to modify
      const sectionKeywords: Record<string, string[]> = {
        'overview': ['overview', 'summary', 'about the role', 'about the position', 'introduction'],
        'responsibilities': ['responsibilities', 'duties', 'tasks', 'what you will do', 'key responsibilities'],
        'qualifications': ['qualifications', 'requirements', 'skills', 'experience', 'education', 'background'],
        'benefits': ['benefits', 'what we offer', 'perks', 'compensation', 'package', 'salary'],
        'application': ['application', 'how to apply', 'apply', 'submit', 'contact']
      };
      
      const inputLower = userInput.toLowerCase();
      let targetSectionId: string | null = null;
      
      // Check if the input mentions a specific section
      for (const [sectionId, keywords] of Object.entries(sectionKeywords)) {
        if (keywords.some(keyword => inputLower.includes(keyword))) {
          targetSectionId = sectionId;
          break;
        }
      }
      
      // If no specific section is mentioned, assume it's about the entire JD
      const isFullJDModification = !targetSectionId;
      
      // Get the section content if a specific section is targeted
      let originalContent = '';
      if (targetSectionId) {
        const section = currentJDData.sections.find((s: any) => s.id === targetSectionId || s.id.includes(targetSectionId));
        if (section) {
          originalContent = section.content;
        } else {
          // If section not found, assume it's about the entire JD
          originalContent = currentJDData.sections.map((s: any) => `${s.title}\n${s.content}`).join('\n\n');
        }
      } else {
        // Use the entire JD content
        originalContent = currentJDData.sections.map((s: any) => `${s.title}\n${s.content}`).join('\n\n');
      }
      
      // Show processing message
      const processingMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: targetSectionId 
          ? `I'm working on improving the ${targetSectionId} section based on your feedback...` 
          : "I'm working on improving the job description based on your feedback...",
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, processingMessage]);
      
      // Generate the modified content using AI
      const conversationContext = messages.slice(-5).map(m => `${m.sender}: ${m.content}`).join('\n');
      
      const aiResponse = await generateChatResponse(
        userInput,
        conversationContext,
        profile,
        {
          ...currentJDData,
          targetSection: targetSectionId,
          originalContent
        }
      );
      
      // Check if the response contains a modified section or full JD
      if (targetSectionId) {
        // Find the section in the current JD data
        const updatedSections = [...currentJDData.sections];
        const sectionIndex = updatedSections.findIndex(s => s.id === targetSectionId || s.id.includes(targetSectionId));
        
        if (sectionIndex !== -1) {
          // Update the section content
          updatedSections[sectionIndex] = {
            ...updatedSections[sectionIndex],
            content: aiResponse
          };
          
          // Update the main content with the modified JD
          onContentChange({
            ...mainContent,
            data: {
              ...currentJDData,
              sections: updatedSections
            }
          });
          
          // Create a response message showing the modification
          const modificationMessage: Message = {
            id: (Date.now() + 2).toString(),
            content: `I've updated the ${updatedSections[sectionIndex].title} section based on your feedback. Here's the new content:\n\n${aiResponse}`,
            sender: 'assistant',
            timestamp: new Date(),
            type: 'jd-modification',
            metadata: {
              modifiedSection: targetSectionId,
              originalContent
            }
          };
          
          // Replace the processing message with the modification message
          setMessages(prev => prev.map(msg => 
            msg.id === processingMessage.id ? modificationMessage : msg
          ));
        } else {
          // Section not found, provide a general response
          const responseMessage: Message = {
            id: (Date.now() + 2).toString(),
            content: `I couldn't find a specific section to modify, but here's my suggestion for improving your job description:\n\n${aiResponse}`,
            sender: 'assistant',
            timestamp: new Date(),
          };
          
          setMessages(prev => prev.map(msg => 
            msg.id === processingMessage.id ? responseMessage : msg
          ));
        }
      } else {
        // This is a full JD modification
        // Parse the AI response to extract sections
        const parsedJD = parseJobDescription(aiResponse);
        
        // Update the main content with the modified JD
        onContentChange({
          ...mainContent,
          data: {
            ...currentJDData,
            ...parsedJD
          }
        });
        
        // Create a response message
        const modificationMessage: Message = {
          id: (Date.now() + 2).toString(),
          content: `I've updated the job description based on your feedback. The changes have been applied to the editor on the right.`,
          sender: 'assistant',
          timestamp: new Date(),
          type: 'jd-modification'
        };
        
        // Replace the processing message with the modification message
        setMessages(prev => prev.map(msg => 
          msg.id === processingMessage.id ? modificationMessage : msg
        ));
      }
    } catch (error) {
      console.error('Error modifying JD:', error);
      
      // Show error message
      const errorMessage: Message = {
        id: (Date.now() + 3).toString(),
        content: `I'm sorry, I encountered an error while trying to modify the job description. Please try again with more specific instructions.`,
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsModifyingJD(false);
    }
  };

  const handleJDInputResponse = async (userInput: string) => {
    console.log('🎯 Processing JD input response:', userInput);
    setIsProcessingJD(true);
    setAwaitingJDInput(false);

    try {
      // Update progress flag
      await updateFlag('has_submitted_jd_inputs', true);

      // Parse the input to determine type
      const parsedInput = parseJDInput(userInput);
      console.log('📝 Parsed input:', parsedInput);

      let processingMessage: Message;
      let savedDraft: any = null;

      if (parsedInput.type === 'link' || parsedInput.type === 'briefWithLink') {
        // Handle URL input
        const url = parsedInput.url!;
        
        processingMessage = {
          id: (Date.now() + 1).toString(),
          content: `🔗 Perfect! I'm fetching the job posting from: ${extractDomain(url)}\n\nI'll analyze it and create an improved version with better clarity, DEI language, and nonprofit alignment...`,
          sender: 'assistant',
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, processingMessage]);

        try {
          // Scrape website content
          const websiteContent = await scrapeWebsite(url);
          
          // Process as website input
          savedDraft = await processJDInput(profile.id, 'link', websiteContent);
        } catch (scrapeError) {
          console.error('Error scraping website:', scrapeError);
          throw new Error(`Failed to fetch content from ${extractDomain(url)}. Please check the URL or try a different approach.`);
        }
      } else if (parsedInput.type === 'brief') {
        // Handle brief text input
        const validation = validateBriefInput(userInput);
        
        if (!validation.isValid) {
          // Ask for more information
          const clarificationMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: `${validation.reason}\n\nFor example: "We need a field coordinator for a migration project in Kenya. Looking for someone with 3+ years experience in humanitarian response, M&E, and team management."`,
            sender: 'assistant',
            timestamp: new Date(),
            type: 'jd-request'
          };

          setMessages(prev => [...prev, clarificationMessage]);
          setAwaitingJDInput(true);
          setIsProcessingJD(false);
          return;
        }

        processingMessage = {
          id: (Date.now() + 1).toString(),
          content: `✅ Great! I have all the details I need from your brief.\n\n🤖 Now creating a comprehensive, professional job description that's mission-aligned and inclusive...`,
          sender: 'assistant',
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, processingMessage]);

        // Process as brief input
        savedDraft = await processJDInput(profile.id, 'brief', userInput);
      } else {
        // Unknown input type
        const clarificationMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: `I'm not sure what type of input that is. Could you please:\n\n1. **Share a job brief** (e.g., "We need a program coordinator for...")\n2. **Paste a job posting URL** to improve an existing posting\n3. **Upload a file** with your job description draft\n\nWhich would you like to do?`,
          sender: 'assistant',
          timestamp: new Date(),
          type: 'jd-request'
        };

        setMessages(prev => [...prev, clarificationMessage]);
        setAwaitingJDInput(true);
        setIsProcessingJD(false);
        return;
      }

      if (!savedDraft) {
        throw new Error('Failed to save JD input');
      }

      // Generate JD using AI
      try {
        const generatedJD = await generateJDFromInput(savedDraft);

        // Parse the generated JD into structured data
        const parsedJobData = parseJobDescription(generatedJD);

        // Update progress flag
        await updateFlag('has_generated_jd', true);

        // Create final message with job description
        const jobMessage: Message = {
          id: (Date.now() + 2).toString(),
          content: generatedJD,
          sender: 'assistant',
          timestamp: new Date(),
          type: 'job-description',
          metadata: {
            jdDraftId: savedDraft.id,
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
          draftId: savedDraft.id
        });

        console.log('✅ JD generation completed successfully');

      } catch (aiError) {
        console.error('❌ AI generation error:', aiError);
        
        // Check if this is a rate limit error
        if (aiError instanceof Error && aiError.message === 'RATE_LIMIT_FALLBACK') {
          console.log('🚫 AI rate limit detected, showing fallback notification');
          
          // Show AI fallback notification
          onContentChange({
            type: 'ai-fallback',
            title: 'AI Assistant Paused',
            content: 'AI temporarily unavailable due to rate limits',
            data: {
              draftId: savedDraft.id,
              message: "It looks like my AI assistant is currently busy helping others — we're hitting a temporary limit. But don't worry — your input is saved, and I'll be ready to resume shortly.\n\nYou can try again in a few minutes, or continue drafting manually if you'd like."
            }
          });

          // Replace processing message with fallback info
          const fallbackMessage: Message = {
            id: (Date.now() + 2).toString(),
            content: `🧠 My AI assistant is temporarily busy, but your input is safely saved!\n\nI can retry generating your job description in a few minutes, or you can continue manually. Your progress won't be lost.`,
            sender: 'assistant',
            timestamp: new Date(),
            type: 'retry-option',
            metadata: {
              canRetry: true,
              retryDraftId: savedDraft.id
            }
          };

          setMessages(prev => prev.map(msg => 
            msg.id === processingMessage.id ? fallbackMessage : msg
          ));
        } else {
          throw aiError; // Re-throw other errors
        }
      }

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
      const allowedTypes = ['doc', 'docx', 'pdf'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension && allowedTypes.includes(fileExtension)) {
        // Process as JD file upload
        setIsProcessingJD(true);
        setAwaitingJDInput(false);

        try {
          await updateFlag('has_submitted_jd_inputs', true);

          const processingMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: `📄 Perfect! I received your file: "${file.name}"\n\nI'm extracting the content and improving it with better structure, DEI language, and nonprofit alignment...`,
            sender: 'assistant',
            timestamp: new Date(),
          };

          setMessages(prev => [...prev, processingMessage]);

          // Process the file upload
          const savedDraft = await processJDInput(profile.id, 'upload', file);
          if (!savedDraft) {
            throw new Error('Failed to save uploaded file');
          }

          // Generate improved JD
          const generatedJD = await generateJDFromInput(savedDraft);
          
          // Parse the generated JD into structured data
          const parsedJobData = parseJobDescription(generatedJD);
          
          await updateFlag('has_generated_jd', true);

          // Create final message with improved job description
          const jobMessage: Message = {
            id: (Date.now() + 2).toString(),
            content: generatedJD,
            sender: 'assistant',
            timestamp: new Date(),
            type: 'job-description',
            metadata: {
              jdDraftId: savedDraft.id,
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
            draftId: savedDraft.id
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

  const canSend = input.trim().length > 0 && !isTyping && !isProcessingJD && !isModifyingJD;

  const handleToolAction = (toolId: string, message: string) => {
    // Special handling for JD tool - immediately send assistant message
    if (message === 'POST_JD_TOOL_TRIGGER') {
      console.log('🎯 JD Tool triggered');
      
      // Update progress flag
      updateFlag('has_started_jd', true);
      
      // Set awaiting input state
      setAwaitingJDInput(true);
      
      // Send the smart assistant message
      const jdRequestMessage: Message = {
        id: Date.now().toString(),
        content: "Let's get started on your job description. You can choose how you'd like to begin:\n\n1. **Paste a brief** (e.g., \"We need a field coordinator for a migration project…\")\n2. **Upload a JD draft** you've written — I'll refine and improve it.\n3. **Paste a link** to an old job post — I'll fetch it and rewrite it with better clarity, DEI, and alignment.\n\nGive me one of these to begin! 🚀",
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
                        } ${
                          message.type === 'ai-offline' ? 'border-l-4' : ''
                        } ${
                          message.type === 'jd-modification' ? 'border-l-4' : ''
                        }`}
                        style={{
                          backgroundColor: message.sender === 'user' ? '#D5765B' : 
                                         message.type === 'suggestion' ? '#FBE4D5' : 
                                         message.type === 'jd-request' ? '#E8F5E8' : 
                                         message.type === 'retry-option' ? '#FEF3CD' : 
                                         message.type === 'ai-offline' ? '#FEF2F2' :
                                         message.type === 'jd-modification' ? '#E0F2F1' : '#F1EFEC',
                          color: message.sender === 'user' ? '#FFFFFF' : '#3A3936',
                          borderLeftColor: message.type === 'suggestion' ? '#D5765B' : 
                                          message.type === 'jd-request' ? '#10B981' : 
                                          message.type === 'retry-option' ? '#F59E0B' : 
                                          message.type === 'ai-offline' ? '#EF4444' :
                                          message.type === 'jd-modification' ? '#009688' : 'transparent'
                        }}
                      >
                        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                        
                        {/* Processing indicators */}
                        {isProcessingJD && message.content.includes('working on') && (
                          <div className="flex items-center mt-2 space-x-2">
                            <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#D5765B' }} />
                            <span className="text-xs" style={{ color: '#66615C' }}>
                              Generating with AI...
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

                        {/* Retry option indicators */}
                        {message.type === 'retry-option' && message.metadata?.canRetry && (
                          <div className="flex items-center mt-2 space-x-2">
                            <RefreshCw className="w-3 h-3" style={{ color: '#F59E0B' }} />
                            <span className="text-xs font-medium" style={{ color: '#F59E0B' }}>
                              Retry Available
                            </span>
                          </div>
                        )}

                        {/* AI Offline indicators */}
                        {message.type === 'ai-offline' && (
                          <div className="flex items-center mt-2 space-x-2">
                            <Globe className="w-3 h-3" style={{ color: '#EF4444' }} />
                            <span className="text-xs font-medium" style={{ color: '#EF4444' }}>
                              AI Offline
                            </span>
                          </div>
                        )}

                        {/* JD Modification indicators */}
                        {message.type === 'jd-modification' && (
                          <div className="flex items-center mt-2 space-x-2">
                            <FileText className="w-3 h-3" style={{ color: '#009688' }} />
                            <span className="text-xs font-medium" style={{ color: '#009688' }}>
                              JD Updated
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
                          onDownload={() => handlePreviewJob(message.id)}
                          onShare={() => handlePreviewJob(message.id)}
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
              {(isTyping || isProcessingJD || isModifyingJD) && (
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
                            {isProcessingJD ? 'Generating job description...' : 
                             isModifyingJD ? 'Updating job description...' : 'AI is thinking...'}
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
            accept={awaitingJDInput ? ".doc,.docx,.pdf" : ".pdf,.docx,.txt,.json"}
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
                placeholder={
                  currentJDData 
                    ? "Ask me to modify or improve specific parts of the job description..." 
                    : awaitingJDInput 
                      ? "Paste a brief, upload a file, or share a job posting URL..." 
                      : "Ask me anything about jobs, CVs, or matches..."
                }
                className="flex-1 min-h-[60px] max-h-[200px] resize-none border-0 bg-transparent font-light text-sm focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 leading-relaxed"
                style={{ 
                  color: '#3A3936',
                  boxShadow: 'none'
                }}
                disabled={isTyping || isProcessingJD || isModifyingJD}
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
                      disabled={isTyping || isProcessingJD || isModifyingJD}
                    >
                      <Paperclip className="w-2.5 h-2.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-gray-900 text-white text-xs">
                    {awaitingJDInput ? 'Upload JD file (.doc, .docx, .pdf)' : 'Attach files (.pdf, .docx, .txt, .json)'}
                  </TooltipContent>
                </Tooltip>

                {/* Categorized Tool Dropdowns */}
                {!progressLoading && (
                  <CategorizedToolDropdowns
                    flags={flags}
                    onToolAction={handleToolAction}
                    onInactiveToolClick={handleInactiveToolClick}
                    disabled={isTyping || isProcessingJD || isModifyingJD}
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
                      disabled={isTyping || isProcessingJD || isModifyingJD}
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
              {currentJDData 
                ? "Ask me to improve specific sections or the entire job description" 
                : awaitingJDInput 
                  ? 'Share your job details, upload file, or paste URL' 
                  : 'Press Enter to send, Shift+Enter for new line'}
            </p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}