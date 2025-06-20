import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUp, 
  Bot, 
  Sparkles, 
  Paperclip, 
  Settings, 
  ChevronDown,
  Upload,
  Briefcase,
  Search,
  Eye,
  Target,
  FileEdit,
  Mail,
  Building,
  Lightbulb,
  RotateCcw,
  Wand2,
  Mic,
  Square,
  CheckCircle,
  Clock,
  ArrowRight,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppState } from '@/hooks/useAppState';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  type?: 'suggestion' | 'progress' | 'normal';
}

interface EnhancedChatInterfaceProps {
  onContentChange: (content: any) => void;
  profile?: any;
}

interface ToolOption {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  category: 'documents' | 'jobs' | 'career' | 'organization';
  description: string;
  estimatedTime?: string;
  difficulty?: 'easy' | 'medium' | 'advanced';
  action: () => void;
}

export function EnhancedChatInterface({ onContentChange, profile }: EnhancedChatInterfaceProps) {
  const { state, updateState, addCompletedAction, getSuggestedActions, getToolAvailability } = useAppState();
  
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
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enhanced tool options with more metadata
  const toolOptions: ToolOption[] = [
    {
      id: 'upload-cv',
      label: 'Upload CV for Analysis',
      icon: Upload,
      category: 'documents',
      description: 'Upload and analyze your CV to extract skills, experience, and qualifications',
      estimatedTime: '2-3 min',
      difficulty: 'easy',
      action: () => {
        setInput('I want to upload my CV for analysis');
        updateState({ cvUploaded: true });
        addCompletedAction('CV Upload');
      }
    },
    {
      id: 'analyze-cv',
      label: 'Deep CV Analysis',
      icon: Target,
      category: 'documents',
      description: 'Get detailed insights about your CV including strengths and improvement areas',
      estimatedTime: '3-5 min',
      difficulty: 'easy',
      action: () => {
        setInput('Perform a deep analysis of my CV');
        updateState({ cvAnalyzed: true });
        addCompletedAction('CV Analysis');
      }
    },
    {
      id: 'revise-cv',
      label: 'Revise CV for Job',
      icon: FileEdit,
      category: 'documents',
      description: 'Tailor your CV for a specific job to increase your chances',
      estimatedTime: '10-15 min',
      difficulty: 'medium',
      action: () => {
        setInput('Help me revise my CV for a specific job');
        addCompletedAction('CV Revision');
      }
    },
    {
      id: 'cover-letter',
      label: 'Write Cover Letter',
      icon: Mail,
      category: 'documents',
      description: 'Create a compelling cover letter that showcases your passion',
      estimatedTime: '8-12 min',
      difficulty: 'medium',
      action: () => {
        setInput('Help me write a cover letter');
        updateState({ coverLetterGenerated: true });
        addCompletedAction('Cover Letter Creation');
      }
    },
    {
      id: 'refine-cover-letter',
      label: 'Refine Cover Letter',
      icon: Wand2,
      category: 'documents',
      description: 'Polish and improve your existing cover letter',
      estimatedTime: '5-8 min',
      difficulty: 'easy',
      action: () => {
        setInput('Help me refine and improve my cover letter');
        updateState({ coverLetterRefined: true });
        addCompletedAction('Cover Letter Refinement');
      }
    },
    {
      id: 'post-job',
      label: 'Post Job / Generate JD',
      icon: Briefcase,
      category: 'jobs',
      description: 'Create compelling job descriptions that attract top talent',
      estimatedTime: '15-20 min',
      difficulty: 'medium',
      action: () => {
        setInput('I want to post a job or generate a job description');
        updateState({ jobPosted: true });
        addCompletedAction('Job Posting');
      }
    },
    {
      id: 'search-jobs-ai',
      label: 'AI-Powered Job Search',
      icon: Search,
      category: 'jobs',
      description: 'Let AI find the perfect jobs based on your profile and preferences',
      estimatedTime: '5-10 min',
      difficulty: 'easy',
      action: () => {
        setInput('Help me search for jobs using AI');
        updateState({ jobSearchPerformed: true, jobSelected: true });
        addCompletedAction('AI Job Search');
      }
    },
    {
      id: 'manual-job-search',
      label: 'Manual Job Search',
      icon: Eye,
      category: 'jobs',
      description: 'Browse jobs with custom filters and criteria',
      estimatedTime: '10-30 min',
      difficulty: 'easy',
      action: () => {
        setInput('I want to manually search for jobs');
        updateState({ jobSearchPerformed: true, jobSelected: true });
        addCompletedAction('Manual Job Search');
      }
    },
    {
      id: 'match-cv',
      label: 'Match CV to Jobs',
      icon: Target,
      category: 'jobs',
      description: 'Find the best job matches based on your CV and experience',
      estimatedTime: '3-5 min',
      difficulty: 'easy',
      action: () => {
        setInput('Find job matches for my CV');
        updateState({ jobMatched: true });
        addCompletedAction('Job Matching');
      }
    },
    {
      id: 'skill-gaps',
      label: 'Analyze Skill Gaps',
      icon: Lightbulb,
      category: 'career',
      description: 'Identify skills to develop for your target roles',
      estimatedTime: '5-8 min',
      difficulty: 'medium',
      action: () => {
        setInput('Suggest skill gaps and training opportunities');
        updateState({ skillGapsAnalyzed: true });
        addCompletedAction('Skill Gap Analysis');
      }
    },
    {
      id: 'alternate-roles',
      label: 'Suggest Alternate Roles',
      icon: RotateCcw,
      category: 'career',
      description: 'Discover alternative career paths you might not have considered',
      estimatedTime: '5-10 min',
      difficulty: 'medium',
      action: () => {
        setInput('Suggest alternative roles I might be interested in');
        updateState({ alternateRolesSuggested: true });
        addCompletedAction('Alternative Roles');
      }
    },
    {
      id: 'org-profile',
      label: 'Create Org Profile',
      icon: Building,
      category: 'organization',
      description: 'Build a compelling organization profile to attract talent',
      estimatedTime: '20-30 min',
      difficulty: 'advanced',
      action: () => {
        setInput('Help me create an organization profile');
        updateState({ orgProfileCreated: true });
        addCompletedAction('Organization Profile');
      }
    }
  ];

  // Get suggested actions
  const suggestedActions = getSuggestedActions();

  // Auto-scroll to bottom
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

  // Show progress suggestions periodically
  useEffect(() => {
    if (suggestedActions.length > 0 && showSuggestions) {
      const timer = setTimeout(() => {
        const suggestion = suggestedActions[0];
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          content: `💡 **Suggested next step:** ${suggestion}`,
          sender: 'assistant',
          timestamp: new Date(),
          type: 'suggestion'
        }]);
        setShowSuggestions(false);
      }, 10000); // Show after 10 seconds of inactivity

      return () => clearTimeout(timer);
    }
  }, [suggestedActions, showSuggestions, messages.length]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setShowSuggestions(true); // Reset suggestions

    // Simulate AI response with enhanced logic
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: generateEnhancedAIResponse(input),
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
      updateMainContent(input);
    }, 1000 + Math.random() * 2000);
  };

  const generateEnhancedAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    // Context-aware responses based on current state
    if (input.includes('upload') && input.includes('cv')) {
      if (state.cvUploaded) {
        return "I see you've already uploaded a CV. Would you like to upload a new version or analyze your existing CV for insights?";
      }
      return "Great! I'll help you upload and analyze your CV. Please select the file you'd like to upload, and I'll extract key information like skills, experience, and qualifications to help match you with relevant nonprofit opportunities.";
    }
    
    if (input.includes('job') && input.includes('search')) {
      if (!state.cvUploaded) {
        return "I'd be happy to help you search for jobs! For the best results, I recommend uploading your CV first so I can find positions that match your background and skills. Would you like to do that now?";
      }
      return "Perfect! I'll use AI to search for jobs that match your profile. Based on your CV, I'll analyze job descriptions, requirements, and company cultures to find the best opportunities for you.";
    }
    
    // Add more context-aware responses...
    return "I'm here to help with all aspects of nonprofit recruitment and career development. What specific task would you like to focus on today?";
  };

  const updateMainContent = (userInput: string) => {
    // Enhanced content updates based on user input
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      updateState({ cvUploaded: true });
      addCompletedAction('CV Upload');
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

  const handleToolClick = (tool: ToolOption) => {
    const availability = getToolAvailability(tool.id);
    
    if (availability.isAvailable) {
      tool.action();
    } else {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: `To use "${tool.label}", you need to: ${availability.reason}. ${availability.suggestedAction ? `I recommend starting with "${availability.suggestedAction}".` : ''} Would you like me to help you with that first?`,
        sender: 'assistant',
        timestamp: new Date(),
      }]);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return '#10B981'; // Green
      case 'medium': return '#F59E0B'; // Yellow
      case 'advanced': return '#EF4444'; // Red
      default: return '#6B7280'; // Gray
    }
  };

  const renderEnhancedToolItem = (tool: ToolOption) => {
    const IconComponent = tool.icon;
    const availability = getToolAvailability(tool.id);
    const isActive = availability.isAvailable;
    
    return (
      <DropdownMenuItem
        key={tool.id}
        onClick={() => handleToolClick(tool)}
        className={`flex flex-col items-start space-y-2 py-3 px-3 cursor-pointer hover:shadow-sm transition-all duration-200 mx-1 rounded-lg ${
          isActive ? '' : 'opacity-60'
        }`}
        style={{ color: isActive ? '#3A3936' : '#66615C' }}
      >
        <div className="flex items-center space-x-3 w-full">
          <div className="flex items-center space-x-2 flex-1">
            <IconComponent 
              className="w-4 h-4 flex-shrink-0"
              style={{ color: isActive ? '#D5765B' : '#66615C' }}
            />
            <div className="flex-1">
              <div className="font-medium text-sm">{tool.label}</div>
              <div className="text-xs opacity-75 mt-1">{tool.description}</div>
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-1">
            {tool.estimatedTime && (
              <Badge 
                variant="outline" 
                className="text-xs px-2 py-0.5"
                style={{ borderColor: '#D8D5D2', color: '#66615C' }}
              >
                <Clock className="w-3 h-3 mr-1" />
                {tool.estimatedTime}
              </Badge>
            )}
            {tool.difficulty && (
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getDifficultyColor(tool.difficulty) }}
              />
            )}
          </div>
        </div>
        
        {!isActive && availability.reason && (
          <div className="text-xs opacity-75 italic">
            Requires: {availability.reason}
          </div>
        )}
      </DropdownMenuItem>
    );
  };

  const renderProgressCard = () => {
    const completedCount = state.completedActions.length;
    const totalTools = toolOptions.length;
    const progressPercentage = (completedCount / totalTools) * 100;

    return (
      <Card className="mb-4 border-0 shadow-sm" style={{ backgroundColor: '#F1EFEC' }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium" style={{ color: '#3A3936' }}>
              Your Progress
            </h3>
            <span className="text-xs" style={{ color: '#66615C' }}>
              {completedCount}/{totalTools}
            </span>
          </div>
          
          <div className="w-full bg-white rounded-full h-2 mb-3">
            <motion.div
              className="h-2 rounded-full"
              style={{ backgroundColor: '#D5765B' }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          
          {suggestedActions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium" style={{ color: '#3A3936' }}>
                Suggested next steps:
              </p>
              {suggestedActions.slice(0, 2).map((action, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <ArrowRight className="w-3 h-3" style={{ color: '#D5765B' }} />
                  <span className="text-xs" style={{ color: '#66615C' }}>
                    {action}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
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
        {/* Header with Progress */}
        <div 
          className="p-4 border-b"
          style={{ 
            backgroundColor: '#F1EFEC',
            borderColor: '#D8D5D2'
          }}
        >
          <div className="flex items-center space-x-3 mb-3">
            <motion.div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#D5765B' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <h2 
                className="text-base font-medium"
                style={{ color: '#3A3936' }}
              >
                AI Assistant
              </h2>
              <p 
                className="text-sm font-light"
                style={{ color: '#66615C' }}
              >
                Your nonprofit recruitment partner
              </p>
            </div>
          </div>
          
          {/* Progress indicator */}
          {state.completedActions.length > 0 && (
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
              <span className="text-xs" style={{ color: '#66615C' }}>
                {state.completedActions.length} tasks completed
              </span>
            </div>
          )}
        </div>

        {/* Messages with Progress Card */}
        <ScrollArea className="flex-1 p-4">
          {renderProgressCard()}
          
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
                    <div className={`mx-3 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
                      <motion.div
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        className={`inline-block p-3 rounded-2xl font-light leading-relaxed shadow-sm ${
                          message.type === 'suggestion' ? 'border-l-4' : ''
                        }`}
                        style={{
                          backgroundColor: message.sender === 'user' ? '#D5765B' : 
                                         message.type === 'suggestion' ? '#FBE4D5' : '#F1EFEC',
                          color: message.sender === 'user' ? '#FFFFFF' : '#3A3936',
                          borderLeftColor: message.type === 'suggestion' ? '#D5765B' : 'transparent'
                        }}
                      >
                        <p className="text-sm">{message.content}</p>
                        {message.type === 'suggestion' && (
                          <div className="mt-2 flex items-center space-x-1">
                            <Zap className="w-3 h-3" style={{ color: '#D5765B' }} />
                            <span className="text-xs font-medium" style={{ color: '#D5765B' }}>
                              AI Suggestion
                            </span>
                          </div>
                        )}
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

            {/* Enhanced Typing Indicator */}
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
                            AI is thinking...
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

        {/* Enhanced Input Area */}
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
                    Attach files (.pdf, .docx, .txt, .json)
                  </TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 rounded-md font-light hover:shadow-sm transition-all duration-200 text-xs"
                          style={{ color: '#66615C' }}
                          disabled={isTyping}
                        >
                          <Settings className="w-2.5 h-2.5 mr-1" />
                          <span className="text-xs">Tools</span>
                          <ChevronDown className="w-2 h-2 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-gray-900 text-white text-xs">
                      AI-powered tools for recruitment
                    </TooltipContent>
                  </Tooltip>

                  <DropdownMenuContent 
                    align="start" 
                    className="w-80 rounded-lg border shadow-lg max-h-96 overflow-y-auto"
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#D8D5D2'
                    }}
                  >
                    <DropdownMenuLabel 
                      className="px-3 py-2 text-sm font-medium border-b"
                      style={{ color: '#3A3936', borderColor: '#F1EFEC' }}
                    >
                      AI Tools & Features
                    </DropdownMenuLabel>
                    
                    {/* Group tools by category */}
                    {['documents', 'jobs', 'career', 'organization'].map(category => {
                      const categoryTools = toolOptions.filter(tool => tool.category === category);
                      const categoryLabels = {
                        documents: 'Documents & CVs',
                        jobs: 'Jobs & Matching',
                        career: 'Career Development',
                        organization: 'Organization'
                      };
                      
                      return (
                        <React.Fragment key={category}>
                          <DropdownMenuLabel 
                            className="px-3 py-1 text-xs font-medium"
                            style={{ color: '#66615C' }}
                          >
                            {categoryLabels[category as keyof typeof categoryLabels]}
                          </DropdownMenuLabel>
                          {categoryTools.map(renderEnhancedToolItem)}
                          <DropdownMenuSeparator style={{ backgroundColor: '#F1EFEC' }} />
                        </React.Fragment>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

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
            
            {state.completedActions.length > 0 && (
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-3 h-3" style={{ color: '#10B981' }} />
                <span className="text-xs" style={{ color: '#66615C' }}>
                  {Math.round((state.completedActions.length / toolOptions.length) * 100)}% complete
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}