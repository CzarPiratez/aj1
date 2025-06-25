import React, { useState, useEffect, useRef } from 'react';
import { motion, Reorder } from 'framer-motion';
import { 
  Save, 
  Download, 
  Share2, 
  Eye, 
  Send,
  ChevronDown,
  Lock,
  Unlock,
  Wand2,
  Clock,
  Lightbulb,
  GripVertical,
  Edit3,
  X,
  Plus,
  MapPin,
  Calendar,
  DollarSign,
  Building,
  Users,
  Globe,
  Target,
  Heart,
  Leaf,
  Shield,
  Briefcase,
  CheckCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
  MessageSquare,
  Linkedin,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface JobDraft {
  id: string;
  title?: string;
  organization_name?: string;
  sections: any;
  metadata: any;
  section_order: string[];
  location?: string;
  contract_type?: string;
  salary_range?: string;
  application_end_date?: string;
  how_to_apply?: string;
  ai_generated: boolean;
  generation_metadata: any;
  last_edited_at: string;
  created_at: string;
  updated_at: string;
}

interface JobDescriptionEditorProps {
  draftId: string;
  profile?: any;
  onClose?: () => void;
}

interface Section {
  id: string;
  title: string;
  content: string;
  isLocked: boolean;
  isEditing: boolean;
}

export function JobDescriptionEditor({ draftId, profile, onClose }: JobDescriptionEditorProps) {
  const [jobDraft, setJobDraft] = useState<JobDraft | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingOverview, setEditingOverview] = useState<string | null>(null);
  
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (draftId) {
      loadJobDraft();
    }
  }, [draftId]);

  const loadJobDraft = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('job_drafts')
        .select('*')
        .eq('id', draftId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setJobDraft(data);
        
        // Parse sections with enhanced default content
        if (data.sections && typeof data.sections === 'object') {
          const sectionData = Object.entries(data.sections).map(([key, value]: [string, any]) => ({
            id: key,
            title: value.title || getSectionTitle(key),
            content: value.content || getDefaultSectionContent(key),
            isLocked: value.locked || false,
            isEditing: false
          }));
          setSections(sectionData);
        } else {
          // Initialize with default sections if none exist
          setSections(getDefaultSections());
        }
      }
    } catch (error) {
      console.error('Error loading job draft:', error);
      toast.error('Failed to load job description');
    } finally {
      setLoading(false);
    }
  };

  const getSectionTitle = (key: string): string => {
    const titleMap: { [key: string]: string } = {
      job_summary: 'Job Summary',
      responsibilities: 'Key Responsibilities',
      qualifications: 'Qualifications',
      skills_competencies: 'Skills & Competencies',
      experience_language: 'Experience & Language',
      contract_details: 'Contract Details',
      how_to_apply: 'How to Apply',
      about_organization: 'About the Organization'
    };
    return titleMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getDefaultSectionContent = (key: string): string => {
    const contentMap: { [key: string]: string } = {
      job_summary: 'We are seeking a dynamic Program Manager to lead our climate action initiatives across East Africa. This role involves coordinating with local communities, government partners, and international stakeholders to implement sustainable climate solutions.',
      responsibilities: '• Develop and implement climate adaptation programs\n• Coordinate with local communities and stakeholders\n• Monitor and evaluate program effectiveness\n• Prepare reports for donors and partners\n• Lead capacity building workshops',
      qualifications: '• Master\'s degree in Environmental Science, Development Studies, or related field\n• 3-5 years of experience in program management\n• Strong understanding of climate change issues\n• Excellent communication and leadership skills\n• Fluency in English and Swahili preferred',
      skills_competencies: 'The candidate should demonstrate strong technical proficiency in M&E frameworks, project reporting, and Excel-based budgeting. Experience with participatory research methods, stakeholder engagement, and cross-cultural communication is essential. Strong analytical skills and the ability to work independently in challenging environments are required.',
      experience_language: 'A minimum of 5 years of experience in the humanitarian sector, with prior exposure to post-conflict regions in East Africa. Fluency in English and French is essential, with working knowledge of local languages preferred. Previous experience managing multi-cultural teams and working with government partners is highly valued.',
      contract_details: 'The position is full-time, initially for 12 months, with the possibility of extension. The candidate will report to the Regional Director and is expected to start by July 2025. The role offers competitive compensation commensurate with experience, comprehensive health benefits, and professional development opportunities.',
      how_to_apply: 'Interested applicants should apply by 15 July 2025 using the provided application portal. Please submit a detailed CV, cover letter, and three professional references. For questions about this position, contact hr@globalclimate.org. Only shortlisted candidates will be contacted.',
      about_organization: 'Global Climate Initiative works across Asia and Sub-Saharan Africa on climate resilience, livelihoods, and food security. Founded in 2010, we have implemented over 200 projects reaching 2 million beneficiaries. Our mission is to build sustainable communities that can adapt to and mitigate climate change while promoting economic development and social equity.'
    };
    return contentMap[key] || '';
  };

  const getDefaultSections = (): Section[] => {
    const defaultSectionOrder = [
      'job_summary',
      'responsibilities', 
      'qualifications',
      'skills_competencies',
      'experience_language',
      'contract_details',
      'how_to_apply',
      'about_organization'
    ];

    return defaultSectionOrder.map(key => ({
      id: key,
      title: getSectionTitle(key),
      content: getDefaultSectionContent(key),
      isLocked: false,
      isEditing: false
    }));
  };

  const handleSave = async () => {
    if (!jobDraft) return;
    
    setSaving(true);
    try {
      // Prepare sections data
      const sectionsData = sections.reduce((acc, section) => {
        acc[section.id] = {
          title: section.title,
          content: section.content,
          locked: section.isLocked
        };
        return acc;
      }, {} as any);
      
      const { error } = await supabase
        .from('job_drafts')
        .update({
          sections: sectionsData,
          section_order: sections.map(s => s.id),
          last_edited_at: new Date().toISOString()
        })
        .eq('id', draftId);
      
      if (error) throw error;
      
      toast.success('Job description saved successfully');
    } catch (error) {
      console.error('Error saving job draft:', error);
      toast.error('Failed to save job description');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoSave = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    autoSaveTimerRef.current = setTimeout(() => {
      handleSave();
    }, 2000);
  };

  const handleSectionChange = (sectionId: string, newContent: string) => {
    setSections(prev => 
      prev.map(section => 
        section.id === sectionId 
          ? { ...section, content: newContent }
          : section
      )
    );
    handleAutoSave();
  };

  const toggleSectionLock = (sectionId: string) => {
    setSections(prev => 
      prev.map(section => 
        section.id === sectionId 
          ? { ...section, isLocked: !section.isLocked, isEditing: false }
          : section
      )
    );
    handleAutoSave();
  };

  const toggleSectionEditing = (sectionId: string) => {
    setSections(prev => 
      prev.map(section => 
        section.id === sectionId 
          ? { ...section, isEditing: !section.isEditing }
          : section
      )
    );
  };

  const handleDownload = (format: 'pdf' | 'word') => {
    toast.info(`Downloading as ${format.toUpperCase()}...`);
    // Implementation for download functionality
  };

  const handleShare = (platform: string) => {
    toast.info(`Sharing to ${platform}...`);
    // Implementation for sharing functionality
  };

  const handlePublish = async () => {
    if (!jobDraft) return;
    
    try {
      // Create published job from draft
      const { error } = await supabase
        .from('jobs')
        .insert({
          user_id: profile?.id,
          title: jobDraft.title,
          description: sections.find(s => s.id === 'job_summary')?.content || '',
          organization_name: jobDraft.organization_name,
          location: jobDraft.location,
          contract_type: jobDraft.contract_type,
          salary_range: jobDraft.salary_range,
          how_to_apply: jobDraft.how_to_apply,
          application_end_date: jobDraft.application_end_date,
          sections: jobDraft.sections,
          section_order: sections.map(s => s.id),
          source_draft_id: draftId,
          ai_generated: jobDraft.ai_generated,
          generation_metadata: jobDraft.generation_metadata,
          status: 'published'
        });
      
      if (error) throw error;
      
      toast.success('Job published successfully!');
      
      // Update progress flag
      if (profile?.id) {
        await supabase
          .from('user_progress_flags')
          .update({ has_published_job: true })
          .eq('user_id', profile.id);
      }
      
      onClose?.();
    } catch (error) {
      console.error('Error publishing job:', error);
      toast.error('Failed to publish job');
    }
  };

  const addMetadataTag = (category: string, tag: string) => {
    if (!jobDraft) return;
    
    const currentTags = jobDraft.metadata?.[category] || [];
    if (!currentTags.includes(tag)) {
      const updatedMetadata = {
        ...jobDraft.metadata,
        [category]: [...currentTags, tag]
      };
      
      setJobDraft(prev => prev ? { ...prev, metadata: updatedMetadata } : null);
      handleAutoSave();
    }
  };

  const removeMetadataTag = (category: string, tag: string) => {
    if (!jobDraft) return;
    
    const currentTags = jobDraft.metadata?.[category] || [];
    const updatedMetadata = {
      ...jobDraft.metadata,
      [category]: currentTags.filter((t: string) => t !== tag)
    };
    
    setJobDraft(prev => prev ? { ...prev, metadata: updatedMetadata } : null);
    handleAutoSave();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FBE4D5' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Wand2 className="w-8 h-8" style={{ color: '#D5765B' }} />
            </motion.div>
          </div>
          <p className="text-lg font-medium" style={{ color: '#3A3936' }}>Loading job description...</p>
        </div>
      </div>
    );
  }

  if (!jobDraft) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4" style={{ color: '#D5765B' }} />
          <p className="text-lg font-medium" style={{ color: '#3A3936' }}>Job description not found</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-full flex flex-col" style={{ backgroundColor: '#FFFFFF' }}>
        {/* Sticky Top Action Bar */}
        <div className="sticky top-0 z-50 border-b px-6 py-3" style={{ backgroundColor: '#FFFFFF', borderColor: '#D8D5D2' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-medium" style={{ color: '#3A3936' }}>
                Job Description Editor
              </h1>
              {saving && (
                <div className="flex items-center space-x-2 text-sm" style={{ color: '#66615C' }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Save className="w-4 h-4" />
                  </motion.div>
                  <span>Saving...</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                    className="h-8 w-8 p-0"
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save draft</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Download className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Download</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDownload('pdf')}>
                    Download as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload('word')}>
                    Download as Word
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Share JD</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleShare('LinkedIn')}>
                    <Linkedin className="w-4 h-4 mr-2" />
                    LinkedIn
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('WhatsApp')}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('Email')}>
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleShare('Copy Link')}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPreviewOpen(true)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Preview JD</TooltipContent>
              </Tooltip>

              <Button
                onClick={handlePublish}
                size="sm"
                className="h-8 px-4 text-white"
                style={{ backgroundColor: '#D5765B' }}
              >
                <Send className="w-4 h-4 mr-2" />
                Publish
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <ScrollArea className="flex-1">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Job Title + Organization */}
            <div className="space-y-2">
              <h1 
                className="text-3xl font-bold"
                style={{ color: '#3A3936' }}
              >
                {jobDraft.title || 'Program Manager - Climate Action'}
              </h1>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p 
                    className="text-lg cursor-help"
                    style={{ color: '#66615C' }}
                  >
                    {jobDraft.organization_name || 'Global Climate Initiative'}
                  </p>
                </TooltipTrigger>
                <TooltipContent>Organization that is hiring</TooltipContent>
              </Tooltip>
            </div>

            {/* Job Overview Panel */}
            <Card className="border shadow-sm" style={{ borderColor: '#D8D5D2' }}>
              <CardContent className="p-6">
                <h3 className="text-lg font-medium mb-4" style={{ color: '#3A3936' }}>
                  Job Overview
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <OverviewField
                    icon={MapPin}
                    label="Location"
                    value={jobDraft.location || 'Remote / Nairobi, Kenya'}
                    onEdit={(value) => console.log('Edit location:', value)}
                    hint="Click to edit location"
                  />
                  <OverviewField
                    icon={Briefcase}
                    label="Contract Type"
                    value={jobDraft.contract_type || 'Full-time'}
                    onEdit={(value) => console.log('Edit contract type:', value)}
                    hint="Click to edit contract type"
                  />
                  <OverviewField
                    icon={Calendar}
                    label="Application Deadline"
                    value={jobDraft.application_end_date || '15 July 2025'}
                    onEdit={(value) => console.log('Edit deadline:', value)}
                    hint="Click to edit deadline"
                  />
                  <OverviewField
                    icon={DollarSign}
                    label="Salary Range"
                    value={jobDraft.salary_range || '$45,000 - $65,000'}
                    onEdit={(value) => console.log('Edit salary:', value)}
                    hint="AI-suggested salary range"
                  />
                </div>
              </CardContent>
            </Card>

            {/* AI Metadata Tags */}
            <Card className="border shadow-sm" style={{ borderColor: '#D8D5D2' }}>
              <CardContent className="p-6">
                <h3 className="text-lg font-medium mb-4" style={{ color: '#3A3936' }}>
                  Impact & Classification
                </h3>
                <div className="space-y-4">
                  <MetadataTagGroup
                    title="SDGs"
                    icon={Target}
                    tags={jobDraft.metadata?.sdgs || ['Climate Action', 'Sustainable Communities']}
                    onAdd={(tag) => addMetadataTag('sdgs', tag)}
                    onRemove={(tag) => removeMetadataTag('sdgs', tag)}
                    suggestions={['No Poverty', 'Quality Education', 'Gender Equality', 'Climate Action']}
                  />
                  <MetadataTagGroup
                    title="Sectors"
                    icon={Building}
                    tags={jobDraft.metadata?.sectors || ['Environment', 'Development']}
                    onAdd={(tag) => addMetadataTag('sectors', tag)}
                    onRemove={(tag) => removeMetadataTag('sectors', tag)}
                    suggestions={['Health', 'Education', 'Environment', 'Human Rights']}
                  />
                  <MetadataTagGroup
                    title="Impact Areas"
                    icon={Heart}
                    tags={jobDraft.metadata?.impact_areas || ['Community Development']}
                    onAdd={(tag) => addMetadataTag('impact_areas', tag)}
                    onRemove={(tag) => removeMetadataTag('impact_areas', tag)}
                    suggestions={['Community Development', 'Capacity Building', 'Advocacy']}
                  />
                </div>
              </CardContent>
            </Card>

            {/* DEI & Language Score Block */}
            <Card className="border shadow-sm" style={{ borderColor: '#D8D5D2' }}>
              <CardContent className="p-6">
                <h3 className="text-lg font-medium mb-4" style={{ color: '#3A3936' }}>
                  Language & Inclusivity Analysis
                </h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <ScoreCard
                    title="DEI Score"
                    score={jobDraft.metadata?.dei_score || 85}
                    color="#10B981"
                  />
                  <ScoreCard
                    title="Clarity Score"
                    score={jobDraft.metadata?.clarity_score || 92}
                    color="#3B82F6"
                  />
                  <ScoreCard
                    title="Reading Level"
                    score="Grade 12"
                    color="#8B5CF6"
                  />
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium" style={{ color: '#3A3936' }}>
                    AI Suggestions
                  </h4>
                  {(jobDraft.metadata?.ai_suggestions || [
                    { text: 'Consider changing "dynamic" to "collaborative" for more inclusive language' }
                  ]).map((suggestion: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#F9F7F4' }}>
                      <p className="text-sm" style={{ color: '#3A3936' }}>
                        {suggestion.text}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                      >
                        Apply with AI
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* JD Sections */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium" style={{ color: '#3A3936' }}>
                Job Description Sections
              </h3>
              
              <Reorder.Group 
                axis="y" 
                values={sections} 
                onReorder={setSections}
                className="space-y-4"
              >
                {sections.map((section) => (
                  <Reorder.Item
                    key={section.id}
                    value={section}
                    className="outline-none"
                  >
                    <SectionBlock
                      section={section}
                      onContentChange={(content) => handleSectionChange(section.id, content)}
                      onToggleLock={() => toggleSectionLock(section.id)}
                      onToggleEdit={() => toggleSectionEditing(section.id)}
                    />
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </div>
          </div>
        </ScrollArea>

        {/* Preview Modal */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Job Description Preview</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[80vh]">
              <div className="p-6 space-y-6">
                <div>
                  <h1 className="text-2xl font-bold mb-2">{jobDraft.title}</h1>
                  <p className="text-lg" style={{ color: '#66615C' }}>{jobDraft.organization_name}</p>
                </div>
                
                {sections.map((section) => (
                  <div key={section.id}>
                    <h2 className="text-lg font-medium mb-2">{section.title}</h2>
                    <div className="prose prose-sm max-w-none">
                      {section.content.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// Helper Components

interface OverviewFieldProps {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  onEdit: (value: string) => void;
  hint: string;
}

function OverviewField({ icon: Icon, label, value, onEdit, hint }: OverviewFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onEdit(editValue);
    setIsEditing(false);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className="flex items-center space-x-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsEditing(true)}
        >
          <Icon className="w-4 h-4 flex-shrink-0" style={{ color: '#D5765B' }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium" style={{ color: '#66615C' }}>{label}</p>
            {isEditing ? (
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                className="h-6 text-sm mt-1"
                autoFocus
              />
            ) : (
              <p className="text-sm font-medium truncate" style={{ color: '#3A3936' }}>
                {value}
              </p>
            )}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  );
}

interface MetadataTagGroupProps {
  title: string;
  icon: React.ComponentType<any>;
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  suggestions: string[];
}

function MetadataTagGroup({ title, icon: Icon, tags, onAdd, onRemove, suggestions }: MetadataTagGroupProps) {
  return (
    <div>
      <div className="flex items-center space-x-2 mb-2">
        <Icon className="w-4 h-4" style={{ color: '#D5765B' }} />
        <h4 className="text-sm font-medium" style={{ color: '#3A3936' }}>{title}</h4>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="text-xs px-2 py-1 cursor-pointer hover:bg-red-50"
            onClick={() => onRemove(tag)}
          >
            {tag}
            <X className="w-3 h-3 ml-1" />
          </Badge>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 text-xs">
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {suggestions.map((suggestion) => (
              <DropdownMenuItem
                key={suggestion}
                onClick={() => onAdd(suggestion)}
                disabled={tags.includes(suggestion)}
              >
                {suggestion}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

interface ScoreCardProps {
  title: string;
  score: number | string;
  color: string;
}

function ScoreCard({ title, score, color }: ScoreCardProps) {
  return (
    <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#F9F7F4' }}>
      <div className="text-2xl font-bold mb-1" style={{ color }}>
        {typeof score === 'number' ? `${score}%` : score}
      </div>
      <div className="text-xs" style={{ color: '#66615C' }}>{title}</div>
    </div>
  );
}

interface SectionBlockProps {
  section: Section;
  onContentChange: (content: string) => void;
  onToggleLock: () => void;
  onToggleEdit: () => void;
}

function SectionBlock({ section, onContentChange, onToggleLock, onToggleEdit }: SectionBlockProps) {
  return (
    <Card className="border shadow-sm hover:shadow-md transition-all duration-200 group" style={{ borderColor: '#D8D5D2' }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <GripVertical className="w-4 h-4 cursor-move" style={{ color: '#D8D5D2' }} />
            <h4 className="text-base font-medium" style={{ color: '#3A3936' }}>
              {section.title}
            </h4>
          </div>
          
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleLock}
                  className="h-7 w-7 p-0"
                >
                  {section.isLocked ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{section.isLocked ? 'Unlock' : 'Lock'}</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={section.isLocked}
                  className="h-7 w-7 p-0"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>AI Rewrite</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={section.isLocked}
                  className="h-7 w-7 p-0"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Change Tone</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                >
                  <Clock className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Version History</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={section.isLocked}
                  className="h-7 w-7 p-0"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Suggestions</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleEdit}
                  disabled={section.isLocked}
                  className="h-7 w-7 p-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {section.isEditing ? (
          <Textarea
            value={section.content}
            onChange={(e) => onContentChange(e.target.value)}
            className="min-h-[120px] text-sm"
            placeholder={`Enter ${section.title} content...`}
          />
        ) : (
          <div className="prose prose-sm max-w-none">
            {section.content.split('\n').map((line, i) => (
              <p key={i} className="text-sm leading-relaxed mb-2" style={{ color: '#3A3936' }}>
                {line}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}