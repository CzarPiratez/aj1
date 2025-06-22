import React from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  FileEdit, 
  Mail, 
  Wand2, 
  Target, 
  RotateCcw, 
  Building, 
  Briefcase, 
  Users, 
  Search, 
  Eye, 
  Lightbulb,
  ChevronDown,
  Sparkles,
  FileText,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UserProgressFlags } from '@/hooks/useUserProgress';

interface Tool {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  isActive: (flags: UserProgressFlags) => boolean;
  inactiveMessage: string;
  autoSubmitMessage?: string; // New property for auto-submit tools
}

interface CategorizedToolDropdownsProps {
  flags: UserProgressFlags;
  onToolAction: (toolId: string, message: string) => void;
  onInactiveToolClick: (message: string) => void;
  onAutoSubmit?: (message: string) => void; // New prop for direct auto-submit
  disabled?: boolean;
}

export function CategorizedToolDropdowns({ 
  flags, 
  onToolAction, 
  onInactiveToolClick, 
  onAutoSubmit,
  disabled = false 
}: CategorizedToolDropdownsProps) {
  
  const cvTools: Tool[] = [
    {
      id: 'upload-analyze-cv',
      label: 'Upload & Analyze CV',
      icon: Upload,
      description: 'Upload your CV and get AI-powered analysis',
      isActive: () => true,
      inactiveMessage: ''
    },
    {
      id: 'revise-cv',
      label: 'Revise CV for a Job',
      icon: FileEdit,
      description: 'Tailor your CV for a specific job opportunity',
      isActive: (flags) => flags.has_analyzed_cv,
      inactiveMessage: "You'll need to upload and analyze your CV before I can help you revise it for specific jobs. Click 'Upload & Analyze CV' above or drop your file here!"
    },
    {
      id: 'write-cover-letter',
      label: 'Write Cover Letter',
      icon: Mail,
      description: 'Create a compelling cover letter for your application',
      isActive: (flags) => flags.has_selected_job,
      inactiveMessage: "I'd love to help you write a cover letter! First, let's find and select a job you're interested in. Try 'Search Jobs (AI-Powered)' to get started."
    },
    {
      id: 'revise-cover-letter',
      label: 'Revise Cover Letter',
      icon: Wand2,
      description: 'Polish and improve your existing cover letter',
      isActive: (flags) => flags.has_written_cover_letter,
      inactiveMessage: "Once you've written a cover letter, I can help you refine and improve it. Let's start by creating your first draft!"
    }
  ];

  const jobsTools: Tool[] = [
    {
      id: 'search-jobs-ai',
      label: 'Search Jobs (AI-Powered)',
      icon: Search,
      description: 'Let AI find the perfect jobs for you',
      isActive: () => true,
      inactiveMessage: ''
    },
    {
      id: 'manual-job-search',
      label: 'Manual Job Search',
      icon: Eye,
      description: 'Browse jobs with custom filters and criteria',
      isActive: () => true,
      inactiveMessage: ''
    },
    {
      id: 'match-me-to-jobs',
      label: 'Match Me to Jobs',
      icon: Target,
      description: 'Find jobs that perfectly match your profile',
      isActive: (flags) => flags.has_analyzed_cv,
      inactiveMessage: "To find the best job matches for you, I need to analyze your CV first. Upload your CV and I'll find opportunities that align with your skills and experience!"
    },
    {
      id: 'explore-similar-roles',
      label: 'Explore Similar Roles',
      icon: RotateCcw,
      description: 'Discover alternative career paths and opportunities',
      isActive: (flags) => flags.has_applied_to_job,
      inactiveMessage: "Once you've applied to a job, I can suggest similar roles and alternative career paths. Let's get your first application submitted!"
    },
    {
      id: 'skill-gaps-upskill',
      label: 'Show Skill Gaps & Upskill Paths',
      icon: Lightbulb,
      description: 'Identify skills to develop and learning opportunities',
      isActive: (flags) => flags.has_analyzed_cv,
      inactiveMessage: "I can analyze your skill gaps and suggest upskilling paths once I understand your current abilities. Upload your CV so I can provide personalized recommendations!"
    }
  ];

  const organizationTools: Tool[] = [
    {
      id: 'generate-org-profile',
      label: 'Generate Org Profile',
      icon: Building,
      description: 'Create a compelling organization profile',
      isActive: () => true,
      inactiveMessage: '',
      autoSubmitMessage: "I'll help you create a compelling organization profile that showcases your mission, values, and culture to attract top talent. Please share your organization's website URL or provide some details about your organization, mission, and the type of work you do."
    },
    {
      id: 'post-job-generate-jd',
      label: 'Post a Job / Generate JD',
      icon: Briefcase,
      description: 'Generate a high-quality, inclusive job description using AI. Paste a job brief, upload an old JD, or share a link.',
      isActive: () => true,
      inactiveMessage: '',
      autoSubmitMessage: `Let's get started on your job description. You can begin in any of these ways:

Job Brief + Organization or Project Link

Job Brief

Upload a JD Draft (PDF or DOCX)

Paste a Link to a reference job post

Go ahead and share whichever works best for you — I'll take it from there.`
    },
    {
      id: 'match-candidates',
      label: 'Match Candidates',
      icon: Users,
      description: 'Find the best candidates for your posted jobs',
      isActive: (flags) => flags.has_published_job,
      inactiveMessage: "Once you've published a job, I can help you find and match the best candidates. Let's start by creating your job posting!",
      autoSubmitMessage: "I'll help you find and match the best candidates for your published jobs. I can analyze candidate profiles against your job requirements, considering skills, experience, cultural fit, and mission alignment. Which job would you like me to help you find candidates for?"
    }
  ];

  const handleToolClick = (tool: Tool) => {
    const isActive = tool.isActive(flags);
    
    if (!isActive) {
      onInactiveToolClick(tool.inactiveMessage);
      return;
    }

    // Check if this is an organization tool with auto-submit message
    if (tool.autoSubmitMessage && onAutoSubmit) {
      console.log(`🚀 Auto-submitting organization tool: ${tool.id}`);
      onAutoSubmit(tool.autoSubmitMessage);
    } else {
      // Regular tool behavior (no auto-submit)
      console.log(`🔧 Tool clicked: ${tool.id} - Regular behavior`);
      onToolAction(tool.id, '');
    }
  };

  const renderToolItem = (tool: Tool) => {
    const isActive = tool.isActive(flags);
    
    return (
      <DropdownMenuItem
        key={tool.id}
        onClick={() => handleToolClick(tool)}
        className={`flex flex-col items-start py-1.5 px-2 cursor-pointer hover:shadow-sm transition-all duration-200 mx-1 rounded-md ${
          isActive ? '' : 'opacity-60'
        }`}
        style={{ color: isActive ? '#3A3936' : '#66615C' }}
      >
        <div className="flex items-center justify-between w-full">
          <h4 
            className="text-xs"
            style={{ 
              color: isActive ? '#3A3936' : '#66615C',
              fontWeight: '450'
            }}
          >
            {tool.label}
          </h4>
          {isActive && (
            <Sparkles className="w-2 h-2 ml-2 flex-shrink-0" style={{ color: '#D5765B' }} />
          )}
        </div>
        <p 
          className="text-xs font-light leading-tight mt-0.5 opacity-75"
          style={{ color: isActive ? '#66615C' : '#8B8680' }}
        >
          {tool.description}
        </p>
      </DropdownMenuItem>
    );
  };

  const renderDropdown = (
    tools: Tool[], 
    label: string, 
    icon: React.ComponentType<any>, 
    tooltipText: string
  ) => {
    const IconComponent = icon;
    
    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 rounded-md font-light hover:shadow-sm transition-all duration-200 text-xs"
                style={{ color: '#66615C' }}
                disabled={disabled}
              >
                <IconComponent className="w-2.5 h-2.5 mr-1" />
                <span className="text-xs">{label}</span>
                <ChevronDown className="w-2 h-2 ml-1" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-gray-900 text-white text-xs">
            {tooltipText}
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent 
          align="start" 
          className="w-72 rounded-lg border shadow-lg"
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: '#D8D5D2',
            maxHeight: '400px',
            overflowY: 'auto'
          }}
        >
          <DropdownMenuLabel 
            className="px-2 py-1 text-xs"
            style={{ 
              color: '#66615C',
              fontWeight: '450'
            }}
          >
            {label} Tools
          </DropdownMenuLabel>
          {tools.map(renderToolItem)}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="flex items-center space-x-2">
      {renderDropdown(cvTools, 'CV', FileText, 'CV and cover letter tools')}
      {renderDropdown(jobsTools, 'Jobs', Briefcase, 'Job search and career development tools')}
      {renderDropdown(organizationTools, 'Organization', Building, 'Organization and hiring tools')}
    </div>
  );
};