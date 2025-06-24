import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  Send, 
  Eye, 
  Edit3, 
  Wand2, 
  Lock, 
  Unlock,
  FileText,
  Building,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Target,
  CheckCircle,
  AlertCircle,
  GripVertical,
  Plus,
  X,
  ExternalLink,
  Loader2,
  Share2,
  Mail,
  Copy,
  Linkedin,
  MessageCircle,
  Globe,
  Briefcase,
  Award,
  Languages,
  Sparkles,
  Heart,
  Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from '@/lib/supabase';
import { useUserProgress } from '@/hooks/useUserProgress';
import { toast } from 'sonner';

interface PostJobEditorProps {
  generatedJD?: string;
  activeTask?: string;
  step?: string;
  profile?: any;
}

interface JDSection {
  id: string;
  title: string;
  content: string;
  isLocked: boolean;
  isEditing: boolean;
  order: number;
  icon?: React.ComponentType<any>;
  type: string;
}

interface DragItem {
  id: string;
  index: number;
}

export function PostJobEditor({ generatedJD, activeTask, step, profile }: PostJobEditorProps) {
  const [sections, setSections] = useState<JDSection[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isDraft, setIsDraft] = useState(true);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);

  // Get user progress hook
  const { updateFlag } = useUserProgress(profile?.id);

  // Initialize sections when JD is generated
  useEffect(() => {
    if (generatedJD && step === 'generated') {
      const parsedSections = parseJDIntoSections(generatedJD);
      setSections(parsedSections);
    }
  }, [generatedJD, step]);

  const parseJDIntoSections = (jdContent: string): JDSection[] => {
    // Default sections structure based on requirements
    const defaultSections: JDSection[] = [
      {
        id: 'job-title',
        title: 'Job Title',
        content: '',
        isLocked: false,
        isEditing: false,
        order: 0,
        icon: Briefcase,
        type: 'title'
      },
      {
        id: 'overview',
        title: 'Overview Panel',
        content: '',
        isLocked: false,
        isEditing: false,
        order: 1,
        icon: FileText,
        type: 'overview'
      },
      {
        id: 'sdgs',
        title: 'SDGs (AI-Detected)',
        content: '',
        isLocked: false,
        isEditing: false,
        order: 2,
        icon: Target,
        type: 'sdgs'
      },
      {
        id: 'sectors',
        title: 'Sectors and Impact Areas',
        content: '',
        isLocked: false,
        isEditing: false,
        order: 3,
        icon: Globe,
        type: 'sectors'
      },
      {
        id: 'dei',
        title: 'DEI and Language Analysis',
        content: '',
        isLocked: false,
        isEditing: false,
        order: 4,
        icon: Heart,
        type: 'dei'
      },
      {
        id: 'summary',
        title: 'Job Summary',
        content: '',
        isLocked: false,
        isEditing: false,
        order: 5,
        icon: FileText,
        type: 'summary'
      },
      {
        id: 'responsibilities',
        title: 'Key Responsibilities',
        content: '',
        isLocked: false,
        isEditing: false,
        order: 6,
        icon: CheckCircle,
        type: 'responsibilities'
      },
      {
        id: 'qualifications',
        title: 'Qualifications and Competencies',
        content: '',
        isLocked: false,
        isEditing: false,
        order: 7,
        icon: Award,
        type: 'qualifications'
      },
      {
        id: 'experience',
        title: 'Experience and Languages',
        content: '',
        isLocked: false,
        isEditing: false,
        order: 8,
        icon: Languages,
        type: 'experience'
      },
      {
        id: 'contract',
        title: 'Contract Details',
        content: '',
        isLocked: false,
        isEditing: false,
        order: 9,
        icon: Calendar,
        type: 'contract'
      },
      {
        id: 'how-to-apply',
        title: 'How to Apply',
        content: '',
        isLocked: false,
        isEditing: false,
        order: 10,
        icon: Send,
        type: 'how-to-apply'
      },
      {
        id: 'organization',
        title: 'About the Organization',
        content: '',
        isLocked: false,
        isEditing: false,
        order: 11,
        icon: Building,
        type: 'organization'
      }
    ];

    // Parse the generated JD content
    const lines = jdContent.split('\n');
    let currentSection: Partial<JDSection> = {};
    let currentContent: string[] = [];
    const parsedSections: JDSection[] = [];

    lines.forEach((line) => {
      if (line.startsWith('#')) {
        // Save previous section
        if (currentSection.title) {
          const sectionTitle = currentSection.title.trim();
          const sectionContent = currentContent.join('\n').trim();
          
          // Find matching default section
          const matchingDefaultSection = defaultSections.find(s => {
            const sectionLower = sectionTitle.toLowerCase();
            const defaultLower = s.title.toLowerCase();
            
            return sectionLower.includes(defaultLower) || 
                  defaultLower.includes(sectionLower) ||
                  (sectionLower.includes('title') && s.type === 'title') ||
                  (sectionLower.includes('overview') && s.type === 'overview') ||
                  (sectionLower.includes('sdg') && s.type === 'sdgs') ||
                  (sectionLower.includes('sector') && s.type === 'sectors') ||
                  (sectionLower.includes('dei') && s.type === 'dei') ||
                  (sectionLower.includes('summary') && s.type === 'summary') ||
                  (sectionLower.includes('responsib') && s.type === 'responsibilities') ||
                  (sectionLower.includes('qualif') && s.type === 'qualifications') ||
                  (sectionLower.includes('experience') && s.type === 'experience') ||
                  (sectionLower.includes('contract') && s.type === 'contract') ||
                  (sectionLower.includes('apply') && s.type === 'how-to-apply') ||
                  (sectionLower.includes('organization') && s.type === 'organization');
          });
          
          if (matchingDefaultSection) {
            parsedSections.push({
              ...matchingDefaultSection,
              content: sectionContent,
              title: matchingDefaultSection.title // Use the standardized title
            });
          } else {
            // Create a custom section if no match
            parsedSections.push({
              id: `section-${parsedSections.length}`,
              title: sectionTitle,
              content: sectionContent,
              isLocked: false,
              isEditing: false,
              order: 100 + parsedSections.length, // Put custom sections at the end
              icon: FileText,
              type: 'custom'
            });
          }
        }
        
        // Start new section
        currentSection = {
          title: line.replace(/^#+\s*/, '')
        };
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    });

    // Add final section
    if (currentSection.title) {
      const sectionTitle = currentSection.title.trim();
      const sectionContent = currentContent.join('\n').trim();
      
      // Find matching default section
      const matchingDefaultSection = defaultSections.find(s => {
        const sectionLower = sectionTitle.toLowerCase();
        const defaultLower = s.title.toLowerCase();
        
        return sectionLower.includes(defaultLower) || 
              defaultLower.includes(sectionLower) ||
              (sectionLower.includes('title') && s.type === 'title') ||
              (sectionLower.includes('overview') && s.type === 'overview') ||
              (sectionLower.includes('sdg') && s.type === 'sdgs') ||
              (sectionLower.includes('sector') && s.type === 'sectors') ||
              (sectionLower.includes('dei') && s.type === 'dei') ||
              (sectionLower.includes('summary') && s.type === 'summary') ||
              (sectionLower.includes('responsib') && s.type === 'responsibilities') ||
              (sectionLower.includes('qualif') && s.type === 'qualifications') ||
              (sectionLower.includes('experience') && s.type === 'experience') ||
              (sectionLower.includes('contract') && s.type === 'contract') ||
              (sectionLower.includes('apply') && s.type === 'how-to-apply') ||
              (sectionLower.includes('organization') && s.type === 'organization');
      });
      
      if (matchingDefaultSection) {
        parsedSections.push({
          ...matchingDefaultSection,
          content: sectionContent,
          title: matchingDefaultSection.title // Use the standardized title
        });
      } else {
        // Create a custom section if no match
        parsedSections.push({
          id: `section-${parsedSections.length}`,
          title: sectionTitle,
          content: sectionContent,
          isLocked: false,
          isEditing: false,
          order: 100 + parsedSections.length, // Put custom sections at the end
          icon: FileText,
          type: 'custom'
        });
      }
    }

    // Add any missing default sections
    defaultSections.forEach(defaultSection => {
      const exists = parsedSections.some(s => s.type === defaultSection.type);
      if (!exists) {
        parsedSections.push({
          ...defaultSection,
          content: getDefaultContentForSection(defaultSection.type)
        });
      }
    });

    // Sort sections by order
    return parsedSections.sort((a, b) => a.order - b.order);
  };

  const getDefaultContentForSection = (type: string): string => {
    switch (type) {
      case 'title':
        return 'Enter the job title here';
      case 'overview':
        return 'Provide a brief overview of the position';
      case 'sdgs':
        return 'Sustainable Development Goals relevant to this position';
      case 'sectors':
        return 'Sectors and impact areas related to this position';
      case 'dei':
        return 'Diversity, Equity, and Inclusion considerations';
      case 'summary':
        return 'Summarize the key aspects of this job';
      case 'responsibilities':
        return 'List the key responsibilities for this position';
      case 'qualifications':
        return 'List required and preferred qualifications';
      case 'experience':
        return 'Detail required experience and language skills';
      case 'contract':
        return 'Specify contract type, duration, and other details';
      case 'how-to-apply':
        return 'Instructions for candidates on how to apply';
      case 'organization':
        return 'Information about the organization';
      default:
        return 'Add content here';
    }
  };

  const toggleSectionLock = (sectionId: string) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId 
        ? { ...section, isLocked: !section.isLocked }
        : section
    ));
  };

  const toggleSectionEdit = (sectionId: string) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId 
        ? { ...section, isEditing: !section.isEditing, isLocked: false }
        : { ...section, isEditing: false }
    ));
  };

  const updateSectionContent = (sectionId: string, newContent: string) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId 
        ? { ...section, content: newContent }
        : section
    ));
  };

  const updateSectionTitle = (sectionId: string, newTitle: string) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId 
        ? { ...section, title: newTitle }
        : section
    ));
  };

  const handleRefineWithAI = (sectionId: string, sectionTitle: string) => {
    // This would trigger the chat interface to ask for refinement instructions
    console.log(`Refining section: ${sectionTitle}`);
    // In real implementation, this would communicate with the chat interface
  };

  const addCustomSection = () => {
    const newSection: JDSection = {
      id: `custom-section-${Date.now()}`,
      title: 'Custom Section',
      content: 'Add your custom content here...',
      isLocked: false,
      isEditing: true,
      order: sections.length,
      icon: Lightbulb,
      type: 'custom'
    };
    setSections(prev => [...prev, newSection]);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, sectionId: string) => {
    e.dataTransfer.setData('text/plain', sectionId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedSectionId(sectionId);
    
    // Add a class to the dragged element for styling
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add('dragging');
    }
  };

  const handleDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedSectionId !== sectionId) {
      setDragOverSectionId(sectionId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverSectionId(null);
  };

  const handleDrop = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    
    const sourceSectionId = e.dataTransfer.getData('text/plain');
    
    if (sourceSectionId === targetSectionId) {
      return;
    }
    
    // Find the indices of the source and target sections
    const sourceIndex = sections.findIndex(section => section.id === sourceSectionId);
    const targetIndex = sections.findIndex(section => section.id === targetSectionId);
    
    if (sourceIndex === -1 || targetIndex === -1) {
      return;
    }
    
    // Create a new array with the reordered sections
    const newSections = [...sections];
    const [movedSection] = newSections.splice(sourceIndex, 1);
    newSections.splice(targetIndex, 0, movedSection);
    
    // Update the order property of each section
    const reorderedSections = newSections.map((section, index) => ({
      ...section,
      order: index
    }));
    
    setSections(reorderedSections);
    setDraggedSectionId(null);
    setDragOverSectionId(null);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
    
    // Remove the dragging class
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.remove('dragging');
    }
    
    setDraggedSectionId(null);
    setDragOverSectionId(null);
  };

  // Phase 3: Save Draft Implementation - Modified to return draft ID
  const saveDraft = async (): Promise<string | null> => {
    if (!profile?.id) {
      toast.error('User not authenticated');
      return null;
    }

    setIsSaving(true);
    
    try {
      // Compile sections back into full JD content
      const fullContent = sections
        .sort((a, b) => a.order - b.order)
        .map(section => `# ${section.title}\n\n${section.content}`)
        .join('\n\n');

      // Extract basic job information from sections
      const titleSection = sections.find(s => s.type === 'title');
      const title = titleSection?.content || 'Untitled Job';

      const draftData = {
        user_id: profile.id,
        title: title,
        description: fullContent,
        draft_status: 'draft',
        ai_generated: true,
        generation_metadata: {
          sections_count: sections.length,
          generated_at: new Date().toISOString(),
          section_order: sections.map(s => ({ id: s.id, type: s.type, order: s.order }))
        },
        last_edited_at: new Date().toISOString()
      };

      let result;
      if (currentDraftId) {
        // Update existing draft
        result = await supabase
          .from('job_drafts')
          .update(draftData)
          .eq('id', currentDraftId)
          .eq('user_id', profile.id)
          .select()
          .single();
      } else {
        // Create new draft
        result = await supabase
          .from('job_drafts')
          .insert(draftData)
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      const draftId = result.data.id;
      setCurrentDraftId(draftId);
      setIsDraft(true);
      toast.success('Draft saved successfully!');
      
      return draftId;
      
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft. Please try again.');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Phase 3: Publish Job Implementation - Fixed to use returned draft ID
  const publishJob = async () => {
    if (!profile?.id) {
      toast.error('User not authenticated');
      return;
    }

    setIsPublishing(true);
    
    try {
      // Get draft ID - either from current state or by saving first
      let draftId = currentDraftId;
      if (!draftId) {
        draftId = await saveDraft();
        if (!draftId) {
          throw new Error('Failed to save draft before publishing');
        }
      }

      // Compile sections back into full JD content
      const fullContent = sections
        .sort((a, b) => a.order - b.order)
        .map(section => `# ${section.title}\n\n${section.content}`)
        .join('\n\n');

      // Extract job information from sections for structured data
      const titleSection = sections.find(s => s.type === 'title');
      const title = titleSection?.content || 'Untitled Job';
      
      const orgSection = sections.find(s => s.type === 'organization');
      const organizationName = orgSection?.content.split('\n')[0] || '';

      const responsibilitiesSection = sections.find(s => s.type === 'responsibilities');
      const responsibilities = responsibilitiesSection?.content || '';

      const qualificationsSection = sections.find(s => s.type === 'qualifications');
      const qualifications = qualificationsSection?.content || '';

      // Create published job record
      const jobData = {
        user_id: profile.id,
        title: title,
        description: fullContent,
        organization_name: organizationName,
        responsibilities: responsibilities,
        qualifications: qualifications,
        status: 'published',
        source_draft_id: draftId,
        ai_generated: true,
        generation_metadata: {
          sections_count: sections.length,
          published_from_editor: true,
          published_at: new Date().toISOString(),
          section_order: sections.map(s => ({ id: s.id, type: s.type, order: s.order }))
        },
        published_at: new Date().toISOString()
      };

      const { data: publishedJob, error: publishError } = await supabase
        .from('jobs')
        .insert(jobData)
        .select()
        .single();

      if (publishError) {
        throw publishError;
      }

      // Update draft status to indicate it's been published
      await supabase
        .from('job_drafts')
        .update({ 
          draft_status: 'ready',
          last_edited_at: new Date().toISOString()
        })
        .eq('id', draftId);

      // Update user progress flag
      await updateFlag('has_published_job', true);

      setIsDraft(false);
      toast.success('Job published successfully! It\'s now live and accepting applications.');
      
      console.log('✅ Job published:', publishedJob);
      
    } catch (error) {
      console.error('Error publishing job:', error);
      toast.error('Failed to publish job. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyText = () => {
    // Compile sections back into full JD content
    const fullContent = sections
      .sort((a, b) => a.order - b.order)
      .map(section => `# ${section.title}\n\n${section.content}`)
      .join('\n\n');
    
    navigator.clipboard.writeText(fullContent);
    toast.success('Job description copied to clipboard');
  };

  const handleCopyLink = () => {
    // In a real implementation, this would copy a shareable link
    navigator.clipboard.writeText('https://aidjobs.com/jobs/share/123456');
    toast.success('Shareable link copied to clipboard');
  };

  const handleShareViaEmail = () => {
    // Extract job title for email subject
    const titleSection = sections.find(s => s.type === 'title');
    const title = titleSection?.content || 'Job Opportunity';
    
    // Create mailto link
    const subject = encodeURIComponent(`Job Opportunity: ${title}`);
    const body = encodeURIComponent('I found this job opportunity that might interest you.');
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleShareViaWhatsApp = () => {
    // In a real implementation, this would share via WhatsApp
    const text = encodeURIComponent('Check out this job opportunity!');
    window.open(`https://wa.me/?text=${text}`);
  };

  const handleShareViaLinkedIn = () => {
    // In a real implementation, this would share via LinkedIn
    window.open('https://www.linkedin.com/sharing/share-offsite/');
  };

  // Show placeholder when no JD is generated yet
  if (!generatedJD || step !== 'generated') {
    return (
      <div className="h-full flex flex-col" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md mx-auto p-8"
          >
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: '#FBE4D5' }}
            >
              <FileText className="w-8 h-8" style={{ color: '#D5765B' }} />
            </div>
            
            <h2 
              className="text-xl font-medium mb-3"
              style={{ color: '#3A3936' }}
            >
              Job Description Editor
            </h2>
            
            <p 
              className="text-sm font-light leading-relaxed mb-6"
              style={{ color: '#66615C' }}
            >
              {activeTask === 'post-job-generate-jd' 
                ? "I'm ready to help you create an amazing job description. Use the chat on the left to get started!"
                : "Select 'Post a Job / Generate JD' from the tools menu to begin creating your job description."
              }
            </p>

            {activeTask === 'post-job-generate-jd' && (
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  <div 
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: '#D5765B' }}
                  />
                  <span className="text-xs" style={{ color: '#66615C' }}>
                    {step === 'initial-choice' && 'Choose your input method'}
                    {step?.includes('collecting') && 'Provide job details'}
                    {step === 'generating' && 'Generating your job description...'}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <div className="border-b p-4" style={{ borderColor: '#D8D5D2' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 
              className="text-lg font-medium"
              style={{ color: '#3A3936' }}
            >
              Job Description Editor
            </h1>
            <div className="flex items-center space-x-2 mt-1">
              <Badge 
                variant={isDraft ? 'outline' : 'default'}
                className="text-xs"
                style={{ 
                  borderColor: isDraft ? '#D5765B' : '#10B981',
                  color: isDraft ? '#D5765B' : '#10B981'
                }}
              >
                {isDraft ? 'Draft' : 'Published'}
              </Badge>
              <span className="text-xs" style={{ color: '#66615C' }}>
                Last edited: {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
          
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center space-x-2">
              {/* Preview Icon */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPreviewModal(true)}
                    className="h-8 w-8 rounded-lg shadow-sm"
                    style={{ color: '#66615C' }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Preview JD
                </TooltipContent>
              </Tooltip>
              
              {/* Share Icon (Dropdown) */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg shadow-sm"
                        style={{ color: '#66615C' }}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Share JD
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleShareViaWhatsApp}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    <span>WhatsApp</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShareViaLinkedIn}>
                    <Linkedin className="w-4 h-4 mr-2" />
                    <span>LinkedIn</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyLink}>
                    <Link className="w-4 h-4 mr-2" />
                    <span>Copy Link</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShareViaEmail}>
                    <Mail className="w-4 h-4 mr-2" />
                    <span>Email</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyText}>
                    <Copy className="w-4 h-4 mr-2" />
                    <span>Copy Text</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Save Draft Icon */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => saveDraft()}
                    className="h-8 w-8 rounded-lg shadow-sm"
                    style={{ color: '#66615C' }}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Save Draft
                </TooltipContent>
              </Tooltip>
              
              {/* Publish Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={publishJob}
                    className="h-8 px-3 text-white rounded-lg shadow-sm"
                    style={{ backgroundColor: '#D5765B' }}
                    disabled={isPublishing}
                  >
                    {isPublishing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Publish
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Publish Job
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-4xl mx-auto">
          <motion.div
            key="edit"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {/* Edit Mode - Section-based editing with drag and drop */}
            {sections
              .sort((a, b) => a.order - b.order)
              .map((section, index) => {
                const SectionIcon = section.icon || FileText;
                
                return (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, section.id)}
                    onDragOver={(e) => handleDragOver(e, section.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, section.id)}
                    onDragEnd={handleDragEnd}
                    className={`transition-all duration-200 ${
                      dragOverSectionId === section.id ? 'transform scale-[1.02] shadow-md' : ''
                    } ${
                      draggedSectionId === section.id ? 'opacity-50' : 'opacity-100'
                    }`}
                  >
                    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="cursor-move p-1 rounded hover:bg-gray-100 transition-colors duration-200"
                              title="Drag to reorder"
                            >
                              <GripVertical className="w-4 h-4" style={{ color: '#66615C' }} />
                            </div>
                            <SectionIcon className="w-4 h-4" style={{ color: '#D5765B' }} />
                            <CardTitle className="text-base" style={{ color: '#3A3936' }}>
                              {section.isEditing ? (
                                <Input
                                  value={section.title}
                                  onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                                  className="h-6 text-base font-medium"
                                />
                              ) : (
                                section.title
                              )}
                            </CardTitle>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSectionLock(section.id)}
                              className="h-6 w-6 p-0"
                            >
                              {section.isLocked ? (
                                <Lock className="w-3 h-3" style={{ color: '#66615C' }} />
                              ) : (
                                <Unlock className="w-3 h-3" style={{ color: '#D5765B' }} />
                              )}
                            </Button>
                            
                            {!section.isLocked && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleSectionEdit(section.id)}
                                  className="h-6 px-2 text-xs"
                                >
                                  <Edit3 className="w-3 h-3 mr-1" />
                                  {section.isEditing ? 'Done' : 'Edit'}
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRefineWithAI(section.id, section.title)}
                                  className="h-6 px-2 text-xs"
                                  style={{ color: '#D5765B' }}
                                >
                                  <Wand2 className="w-3 h-3 mr-1" />
                                  Refine with AI
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        {section.isEditing ? (
                          <Textarea
                            value={section.content}
                            onChange={(e) => updateSectionContent(section.id, e.target.value)}
                            className="min-h-[120px] font-light leading-relaxed"
                            style={{ color: '#3A3936' }}
                          />
                        ) : (
                          <div 
                            className={`whitespace-pre-wrap font-light leading-relaxed p-3 rounded-lg ${
                              section.isLocked ? 'bg-gray-50' : 'bg-transparent'
                            }`}
                            style={{ color: section.isLocked ? '#66615C' : '#3A3936' }}
                          >
                            {section.content}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}

            {/* Add Section Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: sections.length * 0.05 + 0.2 }}
            >
              <Button
                variant="outline"
                onClick={addCustomSection}
                className="w-full h-12 border-dashed"
                style={{ borderColor: '#D5765B', color: '#D5765B' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Custom Section
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </ScrollArea>

      {/* Footer Stats */}
      <div className="border-t p-4" style={{ borderColor: '#D8D5D2' }}>
        <div className="flex items-center justify-between text-xs" style={{ color: '#66615C' }}>
          <div className="flex items-center space-x-4">
            <span>Sections: {sections.length}</span>
            <span>Words: ~{sections.reduce((acc, section) => acc + section.content.split(' ').length, 0)}</span>
            <span>Reading time: ~{Math.ceil(sections.reduce((acc, section) => acc + section.content.split(' ').length, 0) / 200)} min</span>
          </div>
          
          <div className="flex items-center space-x-2">
            {currentDraftId ? (
              <>
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span>Saved as draft</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 text-amber-500" />
                <span>Not saved yet</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-medium" style={{ color: '#3A3936' }}>
                Job Description Preview
              </DialogTitle>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant="outline"
                  className="text-xs"
                  style={{ borderColor: '#D5765B', color: '#D5765B' }}
                >
                  Final Preview
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreviewModal(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              {/* Modal Preview Content */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border p-6"
                style={{ borderColor: '#D8D5D2' }}
              >
                <div className="prose prose-sm max-w-none">
                  {sections
                    .sort((a, b) => a.order - b.order)
                    .map((section, index) => {
                      const SectionIcon = section.icon || FileText;
                      
                      return (
                        <motion.div 
                          key={section.id} 
                          className="mb-6"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <div className="flex items-center space-x-2 mb-3 pb-2 border-b" style={{ borderColor: '#F1EFEC' }}>
                            <SectionIcon className="w-4 h-4" style={{ color: '#D5765B' }} />
                            <h3 
                              className="text-lg font-medium"
                              style={{ color: '#3A3936' }}
                            >
                              {section.title}
                            </h3>
                          </div>
                          <div 
                            className="whitespace-pre-wrap font-light leading-relaxed"
                            style={{ color: '#66615C' }}
                          >
                            {section.content}
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
              </motion.div>

              {/* Modal Footer with Actions */}
              <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: '#D8D5D2' }}>
                <div className="flex items-center space-x-4 text-xs" style={{ color: '#66615C' }}>
                  <span>Sections: {sections.length}</span>
                  <span>Words: ~{sections.reduce((acc, section) => acc + section.content.split(' ').length, 0)}</span>
                  <span>Reading time: ~{Math.ceil(sections.reduce((acc, section) => acc + section.content.split(' ').length, 0) / 200)} min</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreviewModal(false)}
                    className="h-8"
                  >
                    Close Preview
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await saveDraft();
                      setShowPreviewModal(false);
                    }}
                    className="h-8"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Draft
                      </>
                    )}
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={() => {
                      publishJob();
                      setShowPreviewModal(false);
                    }}
                    className="h-8 text-white"
                    style={{ backgroundColor: '#D5765B' }}
                    disabled={isPublishing}
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Publish Job
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .dragging {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}