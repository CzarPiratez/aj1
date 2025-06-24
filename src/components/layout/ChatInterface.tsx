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
import { generateChatResponse, checkAIStatus } from '@/lib/ai';
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
    activeTask?: string;
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
  const [aiConnected, setAiConnected] = useState<boolean | null>(null);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [jdGenerationStep, setJdGenerationStep] = useState<string>('initial');
  
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

  // Phase 1: JD Generation Initial Flow
  const startJDGeneration = async () => {
    console.log('🚀 Starting JD Generation flow');
    
    // Update progress flags
    try {
      await updateFlag('has_started_jd', true);
    } catch (error) {
      console.error('Error updating JD start flag:', error);
    }

    // Set active task
    setActiveTask('post-job-generate-jd');
    setJdGenerationStep('initial-choice');

    // Add AI's initial message
    const initialMessage: Message = {
      id: Date.now().toString(),
      content: `Great! I'll help you create a compelling job description. I have three ways to get started:

**1. Brief + Link** 📝🔗
Provide a brief description of the role and your organization's website URL. I'll analyze your site to understand your mission and create a tailored JD.

**2. Brief Only** 📝
Just give me a text description of the role, organization, and requirements. Perfect if you don't have a website or prefer manual input.

**3. Upload Existing JD** 📄
Upload an existing job description file (PDF, DOC, DOCX) that I can analyze and improve.

Which option works best for you? Just type **1**, **2**, or **3**.`,
      sender: 'assistant',
      timestamp: new Date(),
      type: 'suggestion',
      metadata: {
        activeTask: 'post-job-generate-jd'
      }
    };

    setMessages(prev => [...prev, initialMessage]);

    // Update main content to show JD editor
    onContentChange({
      type: 'post-job-editor',
      title: 'Job Description Editor',
      content: 'AI-powered job description generation and editing',
      activeTask: 'post-job-generate-jd',
      step: 'initial-choice'
    });
  };

  // Handle JD Generation Flow
  const handleJDGenerationFlow = async (userInput: string) => {
    const input = userInput.trim();
    
    if (jdGenerationStep === 'initial-choice') {
      if (input === '1') {
        setJdGenerationStep('collecting-brief-link');
        const response: Message = {
          id: Date.now().toString(),
          content: `Perfect! I'll create your job description using a brief + your organization's website.

Please provide:
1. **Role title** (e.g., "Program Manager - Climate Action")
2. **Brief description** of the role and key requirements
3. **Organization website URL** so I can understand your mission and tone

You can write this all in one message, or I can guide you step by step. What would you prefer?`,
          sender: 'assistant',
          timestamp: new Date(),
          type: 'suggestion'
        };
        setMessages(prev => [...prev, response]);
        return true;
      } else if (input === '2') {
        setJdGenerationStep('collecting-brief-only');
        const response: Message = {
          id: Date.now().toString(),
          content: `Great choice! I'll create your job description from your text description.

Please provide:
1. **Organization name** and brief background
2. **Role title** and level (e.g., "Senior Program Officer")
3. **Key responsibilities** and main focus areas
4. **Required qualifications** and experience
5. **Location** and contract type (full-time, part-time, etc.)

Feel free to write this in a natural way - I'll organize it into a professional job description!`,
          sender: 'assistant',
          timestamp: new Date(),
          type: 'suggestion'
        };
        setMessages(prev => [...prev, response]);
        return true;
      } else if (input === '3') {
        setJdGenerationStep('waiting-upload');
        const response: Message = {
          id: Date.now().toString(),
          content: `Excellent! Please upload your existing job description file using the paperclip icon (📎) below.

I accept:
- PDF files (.pdf)
- Word documents (.doc, .docx)
- Text files (.txt)

Once uploaded, I'll analyze the content and suggest improvements to make it more engaging and effective for attracting top nonprofit talent.`,
          sender: 'assistant',
          timestamp: new Date(),
          type: 'suggestion'
        };
        setMessages(prev => [...prev, response]);
        return true;
      } else {
        const response: Message = {
          id: Date.now().toString(),
          content: `I didn't catch that. Please choose one of the options by typing:
- **1** for Brief + Link
- **2** for Brief Only  
- **3** for Upload Existing JD

Which would you like to use?`,
          sender: 'assistant',
          timestamp: new Date(),
          type: 'suggestion'
        };
        setMessages(prev => [...prev, response]);
        return true;
      }
    } else if (jdGenerationStep === 'collecting-brief-link' || jdGenerationStep === 'collecting-brief-only') {
      // Process the collected information
      setJdGenerationStep('generating');
      setIsTyping(true);

      try {
        // Update progress flag
        await updateFlag('has_submitted_jd_inputs', true);

        // Simulate AI processing (in real implementation, this would call AI functions)
        setTimeout(async () => {
          const generatedJD = `# Program Manager - Climate Action

## About [Organization Name]
[Organization description based on provided information]

## Role Overview
We are seeking a dynamic Program Manager to lead our climate action initiatives...

## Key Responsibilities
- Develop and implement climate action programs
- Coordinate with international partners and stakeholders
- Monitor and evaluate program effectiveness
- Manage program budgets and timelines

## Required Qualifications
- Master's degree in Environmental Science, International Development, or related field
- 5+ years of experience in program management
- Strong analytical and communication skills
- Experience with climate change mitigation strategies

## What We Offer
- Competitive salary commensurate with experience
- Comprehensive benefits package
- Professional development opportunities
- Flexible working arrangements

*This is a full-time position based in [Location]. We are an equal opportunity employer committed to diversity and inclusion.*`;

          // Update progress flag
          await updateFlag('has_generated_jd', true);

          const response: Message = {
            id: Date.now().toString(),
            content: `🎉 **Job Description Generated Successfully!**

I've created a comprehensive job description based on your input. You can see it in the editor on the right side of your screen.

The JD includes:
✅ Compelling role overview
✅ Clear responsibilities and qualifications  
✅ Professional formatting
✅ Inclusive language

You can now:
- **Edit** any section directly
- **Refine with AI** for specific improvements
- **Save as Draft** to continue later
- **Publish** when ready

Would you like me to refine any particular section or make adjustments to the tone?`,
            sender: 'assistant',
            timestamp: new Date(),
            type: 'progress'
          };

          setMessages(prev => [...prev, response]);
          setIsTyping(false);
          setJdGenerationStep('generated');

          // Update main content with generated JD
          onContentChange({
            type: 'post-job-editor',
            title: 'Job Description Editor',
            content: 'Generated job description ready for editing',
            activeTask: 'post-job-generate-jd',
            step: 'generated',
            generatedJD: generatedJD
          });
        }, 3000);

      } catch (error) {
        console.error('Error in JD generation:', error);
        await updateFlag('jd_generation_failed', true);
        
        const errorResponse: Message = {
          id: Date.now().toString(),
          content: `I encountered an issue generating your job description. Let me try a different approach or you can provide additional details to help me create a better JD.

Would you like to:
1. Try again with more specific details
2. Start over with a different input method
3. Get help with what information works best

What would you prefer?`,
          sender: 'assistant',
          timestamp: new Date(),
          type: 'suggestion'
        };
        setMessages(prev => [...prev, errorResponse]);
        setIsTyping(false);
      }
      return true;
    }

    return false;
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

    // Check if we're in JD generation flow
    if (activeTask === 'post-job-generate-jd') {
      const handled = await handleJDGenerationFlow(currentInput);
      if (handled) return;
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

    // Handle JD upload during generation flow
    if (activeTask === 'post-job-generate-jd' && jdGenerationStep === 'waiting-upload') {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: `Perfect! I've received your job description file: "${file.name}". Let me analyze it and create an improved version...`,
        sender: 'assistant',
        timestamp: new Date(),
      }]);
      
      // Process the uploaded JD file
      setJdGenerationStep('generating');
      setIsTyping(true);
      
      try {
        await updateFlag('has_submitted_jd_inputs', true);
        
        // Simulate processing
        setTimeout(async () => {
          await updateFlag('has_generated_jd', true);
          
          const response: Message = {
            id: Date.now().toString(),
            content: `🎉 **Job Description Analysis Complete!**

I've analyzed your uploaded JD and created an enhanced version with:
✅ Improved structure and flow
✅ More engaging language
✅ Better formatting
✅ Inclusive terminology
✅ Clear call-to-action

The enhanced job description is now available in the editor. You can review, edit, and refine it further!`,
            sender: 'assistant',
            timestamp: new Date(),
            type: 'progress'
          };
          
          setMessages(prev => [...prev, response]);
          setIsTyping(false);
          setJdGenerationStep('generated');
          
          onContentChange({
            type: 'post-job-editor',
            title: 'Job Description Editor',
            content: 'Enhanced job description ready for editing',
            activeTask: 'post-job-generate-jd',
            step: 'generated',
            generatedJD: '# Enhanced Job Description\n\n[Processed content from uploaded file]'
          });
        }, 2500);
        
      } catch (error) {
        console.error('Error processing uploaded JD:', error);
        await updateFlag('jd_generation_failed', true);
        setIsTyping(false);
      }
      
      e.target.value = '';
      return;
    }

    // Handle CV uploads
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

  const canSend = input.trim().length > 0 && !isTyping;

  const handleToolAction = (toolId: string, message: string) => {
    // Phase 1: Handle JD Generation tool
    if (toolId === 'post-job-generate-jd' && message === 'START_JD_GENERATION') {
      startJDGeneration();
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
                        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
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
              {isTyping && (
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
                            {activeTask === 'post-job-generate-jd' && jdGenerationStep === 'generating' 
                              ? 'Generating job description...' 
                              : 'AI is thinking...'}
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
                placeholder={
                  activeTask === 'post-job-generate-jd' && jdGenerationStep === 'initial-choice'
                    ? "Type 1, 2, or 3 to choose your preferred method..."
                    : activeTask === 'post-job-generate-jd' && jdGenerationStep.includes('collecting')
                    ? "Provide the details for your job description..."
                    : "Ask me anything about jobs, CVs, or matches..."
                }
                className="flex-1 min-h-[60px] max-h-[200px] resize-none border-0 bg-transparent font-light text-sm focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 leading-relaxed"
                style={{ 
                  color: '#3A3936',
                  boxShadow: 'none'
                }}
                disabled={isTyping}
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
                      disabled={isTyping}
                    >
                      <Paperclip className="w-2.5 h-2.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-gray-900 text-white text-xs">
                    {activeTask === 'post-job-generate-jd' && jdGenerationStep === 'waiting-upload'
                      ? 'Upload your job description file'
                      : 'Attach files (.pdf, .docx, .txt, .json)'}
                  </TooltipContent>
                </Tooltip>

                {/* Categorized Tool Dropdowns */}
                {!progressLoading && (
                  <CategorizedToolDropdowns
                    flags={flags}
                    onToolAction={handleToolAction}
                    onInactiveToolClick={handleInactiveToolClick}
                    disabled={isTyping}
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
                      disabled={isTyping}
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