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
  RefreshCw,
  Plus,
  AlertTriangle
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
import { parseJDInput, isDetectionReliable, getInputTypeDescription } from '@/lib/jdInputDetection';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  type?: 'suggestion' | 'progress' | 'normal' | 'job-description' | 'jd-request' | 'retry-option' | 'ai-offline' | 'ai-fallback';
  metadata?: {
    websiteContent?: any;
    jobId?: string;
    jdDraftId?: string;
    isJDRequest?: boolean;
    jobData?: any;
    canRetry?: boolean;
    retryDraftId?: string;
    fallbackData?: any;
  };
}

interface ChatInterfaceProps {
  onContentChange: (content: any) => void;
  profile?: any;
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
  const [isPublishing, setIsPublishing] = useState(false);
  const [aiConnected, setAiConnected] = useState<boolean | null>(null);
  const [awaitingJDInput, setAwaitingJDInput] = useState(false);
  const [currentJDDraftId, setCurrentJDDraftId] = useState<string | null>(null);
  
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

  const checkAIConnectivity = async () => {
    try {
      const status = await checkAIStatus();
      setAiConnected(status.available);
    } catch (error) {
      setAiConnected(false);
    }
  };

  // Helper function to send assistant message
  const sendAssistantMessage = (content: string, type?: Message['type'], metadata?: any) => {
    const assistantMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: 'assistant',
      timestamp: new Date(),
      type,
      metadata
    };
    setMessages(prev => [...prev, assistantMessage]);
    return assistantMessage;
  };

  // Save fallback status to Supabase
  const saveFallbackStatus = async (draftId: string, inputData: any) => {
    try {
      const { error } = await supabase
        .from('jd_drafts')
        .update({
          status: 'failed',
          error_message: 'AI temporarily unavailable - fallback mode activated',
          updated_at: new Date().toISOString(),
          // Store fallback metadata
          content: JSON.stringify({
            ...inputData,
            has_fallback: true,
            is_ai_generated: false,
            fallback_reason: 'ai_offline'
          })
        })
        .eq('id', draftId);

      if (error) {
        console.error('Error saving fallback status:', error);
      }
    } catch (error) {
      console.error('Error in saveFallbackStatus:', error);
    }
  };

  // Retry AI generation
  const retryAIGeneration = async (draftId: string, inputData: any) => {
    console.log('🔄 Retrying AI generation for draft:', draftId);
    setIsProcessingJD(true);

    try {
      // Check AI status first
      const aiStatus = await checkAIStatus();
      if (!aiStatus.available) {
        throw new Error('AI is still offline');
      }

      // Show retry processing message
      const retryMessage = sendAssistantMessage(
        "Great! AI is back online. Let me generate your job description now...",
        'progress'
      );

      // Simulate AI generation (replace with actual AI call)
      setTimeout(async () => {
        try {
          // Mock successful generation
          const generatedJD = `# Regenerated Job Description

## Role Overview
AI is back online! This job description has been successfully generated using our AI system.

## Key Responsibilities
- Successfully regenerated after temporary AI downtime
- Enhanced with full AI capabilities
- Optimized for nonprofit sector alignment

## Qualifications & Experience
- Generated with complete AI analysis
- Inclusive language and DEI considerations
- Mission-driven focus restored

*Successfully generated after AI reconnection*`;

          const parsedJobData = parseJobDescription(generatedJD);
          await updateFlag('has_generated_jd', true);

          // Update draft status in database
          await supabase
            .from('jd_drafts')
            .update({
              generated_jd: generatedJD,
              status: 'completed',
              error_message: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', draftId);

          const jobMessage: Message = {
            id: (Date.now() + 2).toString(),
            content: generatedJD,
            sender: 'assistant',
            timestamp: new Date(),
            type: 'job-description',
            metadata: {
              jdDraftId: draftId,
              jobData: parsedJobData,
            }
          };

          // Replace retry message with final result
          setMessages(prev => prev.map(msg => 
            msg.id === retryMessage.id ? jobMessage : msg
          ));

          // Update right panel
          onContentChange({
            type: 'job-description',
            title: 'Generated Job Description',
            content: 'AI-generated job description ready for review',
            data: parsedJobData,
            draftId: draftId
          });

          toast.success('Job description generated successfully!');

        } catch (error) {
          console.error('Retry failed:', error);
          sendAssistantMessage(
            "I'm still having trouble connecting to AI. Your input is safely saved, and you can continue manually or try again later.",
            'ai-fallback'
          );
        }
      }, 2000);

    } catch (error) {
      console.error('Error retrying AI generation:', error);
      sendAssistantMessage(
        "AI is still temporarily offline. Your job brief is safely saved - you can continue manually or try again in a few minutes.",
        'ai-fallback'
      );
    } finally {
      setIsProcessingJD(false);
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

    setIsTyping(true);

    // Use AI service for enhanced responses
    try {
      const conversationContext = messages.slice(-5).map(m => `${m.sender}: ${m.content}`).join('\n');
      const aiResponse = await generateChatResponse(currentInput, conversationContext, profile);
      
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

  const handleJDInputResponse = async (userInput: string) => {
    console.log('🎯 Processing JD input response:', userInput);
    setIsProcessingJD(true);
    setAwaitingJDInput(false);

    try {
      // Parse the input to detect type
      const detection = parseJDInput(userInput);
      console.log('🔍 Input detection result:', detection);

      // Check if detection is reliable
      if (!isDetectionReliable(detection)) {
        console.warn('⚠️ Low confidence detection:', detection);
      }

      // Handle unknown input type
      if (detection.inputType === 'unknown') {
        sendAssistantMessage(
          "Hmm, I couldn't detect a job brief, link, or upload. Please try again with one of the supported input types:\n\n1. Job Brief + Organization Link\n2. Job Brief only\n3. Upload a JD Draft (use the paperclip icon)\n4. Paste a Link to a reference job post",
          'suggestion'
        );
        setAwaitingJDInput(true);
        setIsProcessingJD(false);
        return;
      }

      // Update progress flag
      await updateFlag('has_submitted_jd_inputs', true);

      // Save input to database first
      const { data: draftData, error: draftError } = await supabase
        .from('jd_drafts')
        .insert({
          user_id: profile.id,
          input_type: detection.inputType,
          raw_input: userInput,
          content: detection.brief || '',
          url: detection.link || null,
          status: 'processing',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (draftError) {
        throw new Error(`Failed to save input: ${draftError.message}`);
      }

      setCurrentJDDraftId(draftData.id);

      // Show processing message with detected input type
      const processingMessage = sendAssistantMessage(
        `Perfect! I detected: ${getInputTypeDescription(detection)}\n\nI'm now creating a comprehensive, professional job description that's mission-aligned and inclusive...`,
        'progress'
      );

      // Wrap AI generation in try/catch for fallback handling
      try {
        // Check AI status before attempting generation
        const aiStatus = await checkAIStatus();
        if (!aiStatus.available) {
          throw new Error('AI service is currently offline');
        }

        // Simulate AI generation with potential failure
        const shouldSimulateFailure = Math.random() < 0.3; // 30% chance of simulated failure for testing
        
        if (shouldSimulateFailure) {
          throw new Error('Simulated AI timeout for testing fallback UX');
        }

        // Simulate successful AI generation
        setTimeout(async () => {
          try {
            let generatedJD = '';

            switch (detection.inputType) {
              case 'briefWithLink':
                generatedJD = `# Program Coordinator - Community Development

## Role Overview
Based on your job brief and organization link, we are seeking a passionate Program Coordinator to join our community development team. This role offers an exciting opportunity to make a direct impact on local communities while working with a mission-driven organization committed to sustainable development.

## Key Responsibilities
- Coordinate and implement community development programs
- Build relationships with local stakeholders and partners
- Monitor and evaluate program effectiveness
- Prepare reports and documentation
- Support capacity building initiatives

## Qualifications & Experience
- Bachelor's degree in Development Studies, Social Sciences, or related field
- 2-3 years of experience in community development or nonprofit sector
- Strong communication and interpersonal skills
- Experience with project management and monitoring & evaluation
- Fluency in local languages preferred

## What We Offer
- Competitive salary commensurate with experience
- Comprehensive benefits package
- Professional development opportunities
- Meaningful work with direct community impact

## Application Process
Please submit your CV and cover letter explaining your interest in community development work.

*Generated from: Job brief + Organization link*`;
                break;

              case 'briefOnly':
                generatedJD = `# Field Coordinator - Humanitarian Response

## Role Overview
Based on your job brief, we are seeking a dedicated Field Coordinator to support our humanitarian response efforts. This position requires someone passionate about making a difference in crisis-affected communities.

## Key Responsibilities
- Coordinate field operations and program implementation
- Manage relationships with local partners and beneficiaries
- Ensure compliance with humanitarian standards and protocols
- Monitor program activities and report on progress
- Support team capacity building and training

## Qualifications & Experience
- Bachelor's degree in relevant field (International Relations, Development Studies, etc.)
- 3+ years of experience in humanitarian or development work
- Strong leadership and coordination skills
- Experience working in challenging environments
- Excellent communication skills in English and local languages

## What We Offer
- Competitive compensation package
- Comprehensive health and safety support
- Professional development opportunities
- Meaningful work with direct impact on vulnerable populations

## Application Process
Please submit your application including CV and cover letter.

*Generated from: Job brief only*`;
                break;

              case 'referenceLink':
                generatedJD = `# Enhanced Job Description

## Role Overview
Based on the reference job posting you provided, I've created an enhanced version with improved structure, inclusive language, and nonprofit sector alignment.

## Key Responsibilities
- [Enhanced responsibilities based on reference posting]
- [Improved clarity and mission alignment]
- [Additional context for nonprofit sector]

## Qualifications & Experience
- [Refined qualifications with inclusive language]
- [Better structured requirements]
- [Emphasis on mission-driven experience]

## What We Offer
- [Enhanced benefits description]
- [Professional development opportunities]
- [Mission-driven work environment]

## Application Process
[Improved application instructions with accessibility considerations]

*Generated from: Reference job posting link*`;
                break;
            }

            // Parse the generated JD into structured data
            const parsedJobData = parseJobDescription(generatedJD);

            // Update progress flag and database
            await updateFlag('has_generated_jd', true);
            await supabase
              .from('jd_drafts')
              .update({
                generated_jd: generatedJD,
                status: 'completed',
                updated_at: new Date().toISOString()
              })
              .eq('id', draftData.id);

            // Create final message with job description
            const jobMessage: Message = {
              id: (Date.now() + 2).toString(),
              content: generatedJD,
              sender: 'assistant',
              timestamp: new Date(),
              type: 'job-description',
              metadata: {
                jdDraftId: draftData.id,
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
              draftId: draftData.id
            });

            console.log('✅ JD generation completed successfully');

          } catch (generationError) {
            console.error('❌ AI generation failed:', generationError);
            await handleAIFallback(draftData.id, detection, processingMessage.id);
          }
        }, 3000);

      } catch (aiError) {
        console.error('❌ AI service error:', aiError);
        await handleAIFallback(draftData.id, detection, processingMessage.id);
      }

    } catch (error) {
      console.error('❌ Error processing JD input:', error);
      
      // Show error message
      sendAssistantMessage(
        `❌ Sorry, I encountered an error while processing your input. Please try again.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ai-fallback'
      );
    } finally {
      setIsProcessingJD(false);
    }
  };

  // Handle AI fallback scenario
  const handleAIFallback = async (draftId: string, detection: any, processingMessageId: string) => {
    console.log('🔄 Activating AI fallback mode');

    // Save fallback status to database
    await saveFallbackStatus(draftId, detection);

    // Send fallback chat message
    const fallbackMessage = sendAssistantMessage(
      "I was just about to generate your job description, but looks like my AI brain needs a moment to reconnect. No worries though — your input is safe, and we'll pick up from right here once I'm back online. You can continue editing manually for now if you'd like.",
      'ai-fallback',
      {
        canRetry: true,
        retryDraftId: draftId,
        fallbackData: detection
      }
    );

    // Replace processing message with fallback message
    setMessages(prev => prev.map(msg => 
      msg.id === processingMessageId ? fallbackMessage : msg
    ));

    // Show fallback notification in right panel
    onContentChange({
      type: 'ai-fallback',
      title: '🧠 Assistant Paused',
      content: 'AI temporarily offline - your input is safely saved',
      data: {
        draftId,
        inputData: detection,
        canRetry: true,
        message: "Looks like AI is temporarily offline — but don't worry, your job brief has been saved. You can continue drafting manually, or take a short break while we reconnect.\n\nThis happens rarely, and we'll notify you once everything's running smoothly again."
      }
    });
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

          const processingMessage = sendAssistantMessage(
            `📄 Perfect! I detected: File upload (${file.name})\n\nI'm extracting the content and improving it with better structure, DEI language, and nonprofit alignment...`,
            'progress'
          );

          // Simulate file processing with potential AI failure
          setTimeout(async () => {
            try {
              // Simulate potential AI failure
              const shouldSimulateFailure = Math.random() < 0.2; // 20% chance
              
              if (shouldSimulateFailure) {
                throw new Error('AI service temporarily unavailable during file processing');
              }

              const generatedJD = `# Improved Job Description

Based on your uploaded file "${file.name}", I've created an enhanced version with better structure and inclusive language.

## Role Overview
[Enhanced content based on your original file]

## Key Responsibilities
- [Improved responsibilities from your document]
- [Additional clarity and structure]

## Qualifications & Experience
- [Enhanced qualifications section]
- [More inclusive language]

*Generated from: Uploaded file (${file.name})*

This is a mock improvement - in production, we would extract and enhance the actual file content.`;

              const parsedJobData = parseJobDescription(generatedJD);
              await updateFlag('has_generated_jd', true);

              const jobMessage: Message = {
                id: (Date.now() + 2).toString(),
                content: generatedJD,
                sender: 'assistant',
                timestamp: new Date(),
                type: 'job-description',
                metadata: {
                  jobData: parsedJobData,
                }
              };

              setMessages(prev => prev.map(msg => 
                msg.id === processingMessage.id ? jobMessage : msg
              ));

              onContentChange({
                type: 'job-description',
                title: 'Generated Job Description',
                content: 'AI-generated job description ready for review',
                data: parsedJobData
              });

            } catch (error) {
              console.error('❌ File processing AI error:', error);
              
              // Handle AI fallback for file upload
              const fallbackMessage = sendAssistantMessage(
                "I was processing your uploaded file when my AI brain needed a moment to reconnect. Your file is safely received, and we'll continue once I'm back online. You can start drafting manually if you'd like.",
                'ai-fallback',
                {
                  canRetry: true,
                  fallbackData: { inputType: 'upload', fileName: file.name }
                }
              );

              setMessages(prev => prev.map(msg => 
                msg.id === processingMessage.id ? fallbackMessage : msg
              ));

              onContentChange({
                type: 'ai-fallback',
                title: '🧠 Assistant Paused',
                content: 'AI temporarily offline during file processing',
                data: {
                  canRetry: true,
                  message: "Your file upload was received, but AI is temporarily offline. You can continue manually or wait for reconnection."
                }
              });
            }
          }, 3000);

        } catch (error) {
          console.error('❌ Error processing JD file upload:', error);
          
          sendAssistantMessage(
            `❌ Sorry, I couldn't process that file. Please try again or use a different format.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'ai-fallback'
          );
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
    // Special handling for JD tool - immediately send assistant message
    if (message === 'POST_JD_TOOL_TRIGGER') {
      console.log('🎯 JD Tool triggered');
      
      // Update progress flag
      updateFlag('has_started_jd', true);
      
      // Set awaiting input state
      setAwaitingJDInput(true);
      
      // Send the updated assistant message immediately (without bold formatting)
      const jdRequestMessage: Message = {
        id: Date.now().toString(),
        content: "Let's get started on your job description. You can begin in any of these ways:\n\n1. Job Brief + Organization or Project Link\n2. Job Brief\n3. Upload a JD Draft (PDF or DOCX)\n4. Paste a Link to a reference job post\n\nGo ahead and share whichever works best for you — I'll take it from there.",
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
    
    // For other tools, populate input field but don't auto-send
    setInput(message);
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

  // Handle retry button click
  const handleRetryAI = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message?.metadata?.retryDraftId && message?.metadata?.fallbackData) {
      retryAIGeneration(message.metadata.retryDraftId, message.metadata.fallbackData);
    }
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
                          message.type === 'ai-fallback' ? 'border-l-4' : ''
                        }`}
                        style={{
                          backgroundColor: message.sender === 'user' ? '#D5765B' : 
                                         message.type === 'suggestion' ? '#FBE4D5' : 
                                         message.type === 'jd-request' ? '#FBE4D5' : 
                                         message.type === 'retry-option' ? '#FEF3CD' : 
                                         message.type === 'ai-offline' ? '#FEF2F2' : 
                                         message.type === 'ai-fallback' ? '#FEF3CD' : '#F1EFEC',
                          color: message.sender === 'user' ? '#FFFFFF' : '#3A3936',
                          borderLeftColor: message.type === 'suggestion' ? '#D5765B' : 
                                          message.type === 'jd-request' ? '#D5765B' : 
                                          message.type === 'retry-option' ? '#F59E0B' : 
                                          message.type === 'ai-offline' ? '#EF4444' : 
                                          message.type === 'ai-fallback' ? '#F59E0B' : 'transparent'
                        }}
                      >
                        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                        
                        {/* Processing indicators */}
                        {isProcessingJD && message.content.includes('creating') && (
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
                              <Plus className="w-3 h-3" style={{ color: '#D5765B' }} />
                              <FileText className="w-3 h-3" style={{ color: '#D5765B' }} />
                              <Paperclip className="w-3 h-3" style={{ color: '#D5765B' }} />
                              <Link className="w-3 h-3" style={{ color: '#D5765B' }} />
                            </div>
                            <span className="text-xs font-medium" style={{ color: '#D5765B' }}>
                              Job Brief + Link • Upload • Job Brief • Link
                            </span>
                          </div>
                        )}

                        {/* AI Fallback indicators with retry button */}
                        {message.type === 'ai-fallback' && message.metadata?.canRetry && (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center space-x-2">
                              <AlertTriangle className="w-3 h-3" style={{ color: '#F59E0B' }} />
                              <span className="text-xs font-medium" style={{ color: '#F59E0B' }}>
                                AI Temporarily Offline
                              </span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleRetryAI(message.id)}
                              className="h-6 px-3 rounded-lg font-light text-white hover:opacity-90 transition-all duration-200 text-xs"
                              style={{ backgroundColor: '#D5765B' }}
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Try Again
                            </Button>
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
                placeholder={awaitingJDInput ? "Share your job brief, paste a link, or upload a file..." : "Ask me anything about jobs, CVs, or matches..."}
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
                    {awaitingJDInput ? 'Upload JD file (.doc, .docx, .pdf)' : 'Attach files (.pdf, .docx, .txt, .json)'}
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
              {awaitingJDInput ? 'Share your job details, upload file, or paste URL' : 'Press Enter to send, Shift+Enter for new line'}
            </p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}