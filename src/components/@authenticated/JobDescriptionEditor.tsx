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
  Mail,
  User,
  Languages,
  FileText,
  Clock3
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

interface SkillGroup {
  id: string;
  title: string;
  skills: string[];
}

interface ExperienceData {
  total_years: string;
  regional_experience: string;
  sectoral_experience: string;
  language_fluency: string[];
}

interface ContractData {
  duration: string;
  working_arrangements: string;
  start_date: string;
  reporting_line: string;
}

interface HowToApplyData {
  deadline: string;
  application_method: string;
  contact_person: string;
}

interface OrganizationData {
  mission: string;
  sectors: string[];
  regions: string[];
  website_url: string;
}

export function JobDescriptionEditor({ draftId, profile, onClose }: JobDescriptionEditorProps) {
  const [jobDraft, setJobDraft] = useState<JobDraft | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [skillGroups, setSkillGroups] = useState<SkillGroup[]>([]);
  const [experienceData, setExperienceData] = useState<ExperienceData>({
    total_years: '',
    regional_experience: '',
    sectoral_experience: '',
    language_fluency: []
  });
  const [contractData, setContractData] = useState<ContractData>({
    duration: '',
    working_arrangements: '',
    start_date: '',
    reporting_line: ''
  });
  const [howToApplyData, setHowToApplyData] = useState<HowToApplyData>({
    deadline: '',
    application_method: '',
    contact_person: ''
  });
  const [organizationData, setOrganizationData] = useState<OrganizationData>({
    mission: '',
    sectors: [],
    regions: [],
    website_url: ''
  });
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
        
        // Parse sections
        if (data.sections && typeof data.sections === 'object') {
          const sectionData = Object.entries(data.sections).map(([key, value]: [string, any]) => ({
            id: key,
            title: value.title || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            content: value.content || '',
            isLocked: value.locked || false,
            isEditing: false
          }));
          setSections(sectionData);
        }
        
        // Parse skills from metadata
        if (data.metadata?.skills) {
          const skillGroupData = Object.entries(data.metadata.skills).map(([key, value]: [string, any]) => ({
            id: key,
            title: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            skills: Array.isArray(value) ? value : []
          }));
          setSkillGroups(skillGroupData);
        } else {
          // Initialize default skill groups
          setSkillGroups([
            { id: 'technical_skills', title: 'Technical Skills', skills: [] },
            { id: 'managerial_skills', title: 'Managerial Skills', skills: [] },
            { id: 'behavioral_skills', title: 'Behavioral Skills', skills: [] },
            { id: 'soft_skills', title: 'Soft Skills', skills: [] },
            { id: 'communication_skills', title: 'Communication Skills', skills: [] },
            { id: 'other_skills', title: 'Other Skills', skills: [] }
          ]);
        }

        // Parse experience data
        if (data.metadata?.experience) {
          setExperienceData(data.metadata.experience);
        }

        // Parse contract data
        if (data.metadata?.contract_details) {
          setContractData(data.metadata.contract_details);
        }

        // Parse how to apply data
        if (data.metadata?.how_to_apply) {
          setHowToApplyData(data.metadata.how_to_apply);
        }

        // Parse organization data
        if (data.metadata?.organization) {
          setOrganizationData(data.metadata.organization);
        }
      }
    } catch (error) {
      console.error('Error loading job draft:', error);
      toast.error('Failed to load job description');
    } finally {
      setLoading(false);
    }
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
      
      // Prepare skills data
      const skillsData = skillGroups.reduce((acc, group) => {
        acc[group.id] = group.skills;
        return acc;
      }, {} as any);
      
      const { error } = await supabase
        .from('job_drafts')
        .update({
          sections: sectionsData,
          metadata: {
            ...jobDraft.metadata,
            skills: skillsData,
            experience: experienceData,
            contract_details: contractData,
            how_to_apply: howToApplyData,
            organization: organizationData
          },
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

  const generateOrganizationWithAI = async () => {
    toast.info('Generating organization information with AI...');
    // Implementation for AI generation
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
                {jobDraft.title || 'Untitled Job'}
              </h1>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p 
                    className="text-lg cursor-help"
                    style={{ color: '#66615C' }}
                  >
                    {jobDraft.organization_name || 'Organization Name'}
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
                    value={jobDraft.location || 'Not specified'}
                    onEdit={(value) => console.log('Edit location:', value)}
                    hint="Click to edit location"
                  />
                  <OverviewField
                    icon={Briefcase}
                    label="Contract Type"
                    value={jobDraft.contract_type || 'Not specified'}
                    onEdit={(value) => console.log('Edit contract type:', value)}
                    hint="Click to edit contract type"
                  />
                  <OverviewField
                    icon={Calendar}
                    label="Application Deadline"
                    value={jobDraft.application_end_date || 'Not specified'}
                    onEdit={(value) => console.log('Edit deadline:', value)}
                    hint="Click to edit deadline"
                  />
                  <OverviewField
                    icon={DollarSign}
                    label="Salary Range"
                    value={jobDraft.salary_range || 'Not specified'}
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
                    tags={jobDraft.metadata?.sdgs || []}
                    onAdd={(tag) => addMetadataTag('sdgs', tag)}
                    onRemove={(tag) => removeMetadataTag('sdgs', tag)}
                    suggestions={['No Poverty', 'Quality Education', 'Gender Equality', 'Climate Action']}
                  />
                  <MetadataTagGroup
                    title="Sectors"
                    icon={Building}
                    tags={jobDraft.metadata?.sectors || []}
                    onAdd={(tag) => addMetadataTag('sectors', tag)}
                    onRemove={(tag) => removeMetadataTag('sectors', tag)}
                    suggestions={['Health', 'Education', 'Environment', 'Human Rights']}
                  />
                  <MetadataTagGroup
                    title="Impact Areas"
                    icon={Heart}
                    tags={jobDraft.metadata?.impact_areas || []}
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
                
                {jobDraft.metadata?.ai_suggestions && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium" style={{ color: '#3A3936' }}>
                      AI Suggestions
                    </h4>
                    {jobDraft.metadata.ai_suggestions.map((suggestion: any, index: number) => (
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
                )}
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

            {/* Skills & Competencies */}
            <Card className="border shadow-sm" style={{ borderColor: '#D8D5D2' }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium" style={{ color: '#3A3936' }}>
                    Skills & Competencies
                  </h3>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <SectionToolbar />
                  </div>
                </div>
                <div className="space-y-4">
                  {skillGroups.map((group) => (
                    <SkillGroupBlock
                      key={group.id}
                      group={group}
                      onSkillsChange={(skills) => {
                        setSkillGroups(prev => 
                          prev.map(g => 
                            g.id === group.id ? { ...g, skills } : g
                          )
                        );
                        handleAutoSave();
                      }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Experience & Language */}
            <Card className="border shadow-sm group" style={{ borderColor: '#D8D5D2' }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium" style={{ color: '#3A3936' }}>
                    Experience & Language
                  </h3>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <SectionToolbar />
                  </div>
                </div>
                <ExperienceLanguageBlock
                  data={experienceData}
                  onChange={(data) => {
                    setExperienceData(data);
                    handleAutoSave();
                  }}
                />
              </CardContent>
            </Card>

            {/* Contract Details */}
            <Card className="border shadow-sm group" style={{ borderColor: '#D8D5D2' }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium" style={{ color: '#3A3936' }}>
                    Contract Details
                  </h3>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <SectionToolbar />
                  </div>
                </div>
                <ContractDetailsBlock
                  data={contractData}
                  onChange={(data) => {
                    setContractData(data);
                    handleAutoSave();
                  }}
                />
              </CardContent>
            </Card>

            {/* How to Apply */}
            <Card className="border shadow-sm group" style={{ borderColor: '#D8D5D2' }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium" style={{ color: '#3A3936' }}>
                    How to Apply
                  </h3>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <SectionToolbar />
                  </div>
                </div>
                <HowToApplyBlock
                  data={howToApplyData}
                  onChange={(data) => {
                    setHowToApplyData(data);
                    handleAutoSave();
                  }}
                />
              </CardContent>
            </Card>

            {/* About the Organization */}
            <Card className="border shadow-sm group" style={{ borderColor: '#D8D5D2' }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium" style={{ color: '#3A3936' }}>
                    About the Organization
                  </h3>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <SectionToolbar />
                  </div>
                </div>
                <OrganizationBlock
                  data={organizationData}
                  onChange={(data) => {
                    setOrganizationData(data);
                    handleAutoSave();
                  }}
                  onGenerateWithAI={generateOrganizationWithAI}
                />
              </CardContent>
            </Card>
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

function SectionToolbar() {
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Lock className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Lock/Unlock</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Wand2 className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>AI Rewrite</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <MessageSquare className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Change Tone</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Clock className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Version History</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Lightbulb className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Suggestions</TooltipContent>
      </Tooltip>
    </>
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
                  disable={section.isLocked}
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
              <p key={i} className="text-sm leading-relaxed" style={{ color: '#3A3936' }}>
                {line}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SkillGroupBlockProps {
  group: SkillGroup;
  onSkillsChange: (skills: string[]) => void;
}

function SkillGroupBlock({ group, onSkillsChange }: SkillGroupBlockProps) {
  const [newSkill, setNewSkill] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const addSkill = () => {
    if (newSkill.trim() && !group.skills.includes(newSkill.trim())) {
      onSkillsChange([...group.skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    onSkillsChange(group.skills.filter(s => s !== skill));
  };

  return (
    <div>
      <h4 className="text-sm font-medium mb-2" style={{ color: '#3A3936' }}>
        {group.title}
      </h4>
      <div className="space-y-2">
        {group.skills.length > 0 ? (
          group.skills.map((skill, index) => (
            <div key={index} className="flex items-center justify-between p-2 rounded border" style={{ borderColor: '#D8D5D2' }}>
              <span className="text-sm" style={{ color: '#3A3936' }}>• {skill}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeSkill(skill)}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))
        ) : (
          <div 
            className="p-3 rounded-lg border border-dashed text-center cursor-pointer hover:bg-gray-50"
            style={{ borderColor: '#D8D5D2', color: '#66615C' }}
            onClick={() => setIsEditing(true)}
          >
            <p className="text-sm">Add skills to this group</p>
          </div>
        )}
        {isEditing || group.skills.length > 0 ? (
          <div className="flex items-center space-x-2">
            <Input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSkill()}
              placeholder="Add new skill..."
              className="h-8 text-sm"
            />
            <Button
              onClick={addSkill}
              size="sm"
              className="h-8 px-3 text-white"
              style={{ backgroundColor: '#D5765B' }}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface ExperienceLanguageBlockProps {
  data: ExperienceData;
  onChange: (data: ExperienceData) => void;
}

function ExperienceLanguageBlock({ data, onChange }: ExperienceLanguageBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(data);
  const [newLanguage, setNewLanguage] = useState('');

  const handleSave = () => {
    onChange(editData);
    setIsEditing(false);
  };

  const addLanguage = () => {
    if (newLanguage.trim() && !editData.language_fluency.includes(newLanguage.trim())) {
      setEditData({
        ...editData,
        language_fluency: [...editData.language_fluency, newLanguage.trim()]
      });
      setNewLanguage('');
    }
  };

  const removeLanguage = (language: string) => {
    setEditData({
      ...editData,
      language_fluency: editData.language_fluency.filter(l => l !== language)
    });
  };

  return (
    <div>
      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#3A3936' }}>
              Total Years of Experience
            </label>
            <Input
              value={editData.total_years}
              onChange={(e) => setEditData({ ...editData, total_years: e.target.value })}
              className="h-8 text-sm"
              placeholder="e.g., 3-5 years"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#3A3936' }}>
              Regional Experience
            </label>
            <Input
              value={editData.regional_experience}
              onChange={(e) => setEditData({ ...editData, regional_experience: e.target.value })}
              className="h-8 text-sm"
              placeholder="e.g., East Africa, Southeast Asia"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#3A3936' }}>
              Sectoral Experience
            </label>
            <Input
              value={editData.sectoral_experience}
              onChange={(e) => setEditData({ ...editData, sectoral_experience: e.target.value })}
              className="h-8 text-sm"
              placeholder="e.g., Health, Education"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#3A3936' }}>
              Language Fluency
            </label>
            <div className="space-y-2">
              {editData.language_fluency.map((language, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded border" style={{ borderColor: '#D8D5D2' }}>
                  <span className="text-sm" style={{ color: '#3A3936' }}>{language}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLanguage(language)}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center space-x-2">
                <Input
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addLanguage()}
                  placeholder="Add language (e.g., English - Fluent)"
                  className="h-8 text-sm"
                />
                <Button
                  onClick={addLanguage}
                  size="sm"
                  className="h-8 px-3 text-white"
                  style={{ backgroundColor: '#D5765B' }}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
              className="h-8 text-xs text-white"
              style={{ backgroundColor: '#D5765B' }}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <User className="w-4 h-4 mt-0.5" style={{ color: '#D5765B' }} />
              <div>
                <p className="text-xs font-medium" style={{ color: '#66615C' }}>Total Experience</p>
                <p className="text-sm" style={{ color: '#3A3936' }}>
                  {data.total_years || 'Not specified'}
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Globe className="w-4 h-4 mt-0.5" style={{ color: '#D5765B' }} />
              <div>
                <p className="text-xs font-medium" style={{ color: '#66615C' }}>Regional Experience</p>
                <p className="text-sm" style={{ color: '#3A3936' }}>
                  {data.regional_experience || 'Not specified'}
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Briefcase className="w-4 h-4 mt-0.5" style={{ color: '#D5765B' }} />
              <div>
                <p className="text-xs font-medium" style={{ color: '#66615C' }}>Sectoral Experience</p>
                <p className="text-sm" style={{ color: '#3A3936' }}>
                  {data.sectoral_experience || 'Not specified'}
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Languages className="w-4 h-4 mt-0.5" style={{ color: '#D5765B' }} />
              <div>
                <p className="text-xs font-medium" style={{ color: '#66615C' }}>Language Fluency</p>
                <div>
                  {data.language_fluency && data.language_fluency.length > 0 ? (
                    data.language_fluency.map((language, index) => (
                      <p key={index} className="text-sm" style={{ color: '#3A3936' }}>
                        • {language}
                      </p>
                    ))
                  ) : (
                    <p className="text-sm" style={{ color: '#3A3936' }}>Not specified</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-8 text-xs"
          >
            <Edit3 className="w-3 h-3 mr-2" />
            Edit Experience & Language
          </Button>
        </div>
      )}
    </div>
  );
}

interface ContractDetailsBlockProps {
  data: ContractData;
  onChange: (data: ContractData) => void;
}

function ContractDetailsBlock({ data, onChange }: ContractDetailsBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(data);

  const handleSave = () => {
    onChange(editData);
    setIsEditing(false);
  };

  return (
    <div>
      {isEditing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: '#3A3936' }}>
                Duration
              </label>
              <Input
                value={editData.duration}
                onChange={(e) => setEditData({ ...editData, duration: e.target.value })}
                className="h-8 text-sm"
                placeholder="e.g., 12 months"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: '#3A3936' }}>
                Working Arrangements
              </label>
              <Input
                value={editData.working_arrangements}
                onChange={(e) => setEditData({ ...editData, working_arrangements: e.target.value })}
                className="h-8 text-sm"
                placeholder="e.g., Remote, Hybrid, In-person"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: '#3A3936' }}>
                Start Date
              </label>
              <Input
                value={editData.start_date}
                onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                className="h-8 text-sm"
                placeholder="e.g., January 2026"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: '#3A3936' }}>
                Reporting Line
              </label>
              <Input
                value={editData.reporting_line}
                onChange={(e) => setEditData({ ...editData, reporting_line: e.target.value })}
                className="h-8 text-sm"
                placeholder="e.g., Reports to Country Director"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
              className="h-8 text-xs text-white"
              style={{ backgroundColor: '#D5765B' }}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <Clock3 className="w-4 h-4 mt-0.5" style={{ color: '#D5765B' }} />
              <div>
                <p className="text-xs font-medium" style={{ color: '#66615C' }}>Duration</p>
                <p className="text-sm" style={{ color: '#3A3936' }}>
                  {data.duration || 'Not specified'}
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Building className="w-4 h-4 mt-0.5" style={{ color: '#D5765B' }} />
              <div>
                <p className="text-xs font-medium" style={{ color: '#66615C' }}>Working Arrangements</p>
                <p className="text-sm" style={{ color: '#3A3936' }}>
                  {data.working_arrangements || 'Not specified'}
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Calendar className="w-4 h-4 mt-0.5" style={{ color: '#D5765B' }} />
              <div>
                <p className="text-xs font-medium" style={{ color: '#66615C' }}>Start Date</p>
                <p className="text-sm" style={{ color: '#3A3936' }}>
                  {data.start_date || 'Not specified'}
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Users className="w-4 h-4 mt-0.5" style={{ color: '#D5765B' }} />
              <div>
                <p className="text-xs font-medium" style={{ color: '#66615C' }}>Reporting Line</p>
                <p className="text-sm" style={{ color: '#3A3936' }}>
                  {data.reporting_line || 'Not specified'}
                </p>
              </div>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-8 text-xs"
          >
            <Edit3 className="w-3 h-3 mr-2" />
            Edit Contract Details
          </Button>
        </div>
      )}
    </div>
  );
}

interface HowToApplyBlockProps {
  data: HowToApplyData;
  onChange: (data: HowToApplyData) => void;
}

function HowToApplyBlock({ data, onChange }: HowToApplyBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(data);

  const handleSave = () => {
    onChange(editData);
    setIsEditing(false);
  };

  return (
    <div>
      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#3A3936' }}>
              Application Deadline
            </label>
            <Input
              value={editData.deadline}
              onChange={(e) => setEditData({ ...editData, deadline: e.target.value })}
              className="h-8 text-sm"
              placeholder="e.g., January 31, 2026"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#3A3936' }}>
              Application Method
            </label>
            <Textarea
              value={editData.application_method}
              onChange={(e) => setEditData({ ...editData, application_method: e.target.value })}
              className="min-h-[80px] text-sm"
              placeholder="e.g., Please submit your CV and cover letter to..."
            />
          </div>
          
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#3A3936' }}>
              Contact Person (Optional)
            </label>
            <Input
              value={editData.contact_person}
              onChange={(e) => setEditData({ ...editData, contact_person: e.target.value })}
              className="h-8 text-sm"
              placeholder="e.g., Jane Smith, Recruitment Manager"
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
              className="h-8 text-xs text-white"
              style={{ backgroundColor: '#D5765B' }}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <Calendar className="w-4 h-4 mt-0.5" style={{ color: '#D5765B' }} />
            <div>
              <p className="text-xs font-medium" style={{ color: '#66615C' }}>Application Deadline</p>
              <p className="text-sm" style={{ color: '#3A3936' }}>
                {data.deadline || 'Not specified'}
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <FileText className="w-4 h-4 mt-0.5" style={{ color: '#D5765B' }} />
            <div>
              <p className="text-xs font-medium" style={{ color: '#66615C' }}>Application Method</p>
              <p className="text-sm" style={{ color: '#3A3936' }}>
                {data.application_method || 'Not specified'}
              </p>
            </div>
          </div>
          
          {data.contact_person && (
            <div className="flex items-start space-x-3">
              <User className="w-4 h-4 mt-0.5" style={{ color: '#D5765B' }} />
              <div>
                <p className="text-xs font-medium" style={{ color: '#66615C' }}>Contact Person</p>
                <p className="text-sm" style={{ color: '#3A3936' }}>
                  {data.contact_person}
                </p>
              </div>
            </div>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-8 text-xs"
          >
            <Edit3 className="w-3 h-3 mr-2" />
            Edit Application Instructions
          </Button>
        </div>
      )}
    </div>
  );
}

interface OrganizationBlockProps {
  data: OrganizationData;
  onChange: (data: OrganizationData) => void;
  onGenerateWithAI: () => void;
}

function OrganizationBlock({ data, onChange, onGenerateWithAI }: OrganizationBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(data);
  const [newSector, setNewSector] = useState('');
  const [newRegion, setNewRegion] = useState('');

  const handleSave = () => {
    onChange(editData);
    setIsEditing(false);
  };

  const addSector = () => {
    if (newSector.trim() && !editData.sectors.includes(newSector.trim())) {
      setEditData({
        ...editData,
        sectors: [...editData.sectors, newSector.trim()]
      });
      setNewSector('');
    }
  };

  const removeSector = (sector: string) => {
    setEditData({
      ...editData,
      sectors: editData.sectors.filter(s => s !== sector)
    });
  };

  const addRegion = () => {
    if (newRegion.trim() && !editData.regions.includes(newRegion.trim())) {
      setEditData({
        ...editData,
        regions: [...editData.regions, newRegion.trim()]
      });
      setNewRegion('');
    }
  };

  const removeRegion = (region: string) => {
    setEditData({
      ...editData,
      regions: editData.regions.filter(r => r !== region)
    });
  };

  const hasMissionContent = data.mission && data.mission.trim().length > 0;
  const hasSectors = data.sectors && data.sectors.length > 0;
  const hasRegions = data.regions && data.regions.length > 0;
  const hasWebsite = data.website_url && data.website_url.trim().length > 0;
  const hasAnyContent = hasMissionContent || hasSectors || hasRegions || hasWebsite;

  return (
    <div>
      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#3A3936' }}>
              Organization Mission
            </label>
            <Textarea
              value={editData.mission}
              onChange={(e) => setEditData({ ...editData, mission: e.target.value })}
              className="min-h-[100px] text-sm"
              placeholder="Describe the organization's mission and purpose..."
            />
          </div>
          
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#3A3936' }}>
              Sectors
            </label>
            <div className="space-y-2">
              {editData.sectors.map((sector, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded border" style={{ borderColor: '#D8D5D2' }}>
                  <span className="text-sm" style={{ color: '#3A3936' }}>{sector}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSector(sector)}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center space-x-2">
                <Input
                  value={newSector}
                  onChange={(e) => setNewSector(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSector()}
                  placeholder="Add sector (e.g., Health, Education)"
                  className="h-8 text-sm"
                />
                <Button
                  onClick={addSector}
                  size="sm"
                  className="h-8 px-3 text-white"
                  style={{ backgroundColor: '#D5765B' }}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#3A3936' }}>
              Regions of Operation
            </label>
            <div className="space-y-2">
              {editData.regions.map((region, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded border" style={{ borderColor: '#D8D5D2' }}>
                  <span className="text-sm" style={{ color: '#3A3936' }}>{region}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRegion(region)}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center space-x-2">
                <Input
                  value={newRegion}
                  onChange={(e) => setNewRegion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addRegion()}
                  placeholder="Add region (e.g., East Africa, Southeast Asia)"
                  className="h-8 text-sm"
                />
                <Button
                  onClick={addRegion}
                  size="sm"
                  className="h-8 px-3 text-white"
                  style={{ backgroundColor: '#D5765B' }}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#3A3936' }}>
              Organization Website
            </label>
            <Input
              value={editData.website_url}
              onChange={(e) => setEditData({ ...editData, website_url: e.target.value })}
              className="h-8 text-sm"
              placeholder="e.g., https://organization.org"
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
              className="h-8 text-xs text-white"
              style={{ backgroundColor: '#D5765B' }}
            >
              Save
            </Button>
          </div>
        </div>
      ) : hasAnyContent ? (
        <div className="space-y-4">
          {hasMissionContent && (
            <div>
              <h4 className="text-sm font-medium mb-2" style={{ color: '#3A3936' }}>Mission</h4>
              <p className="text-sm" style={{ color: '#3A3936' }}>{data.mission}</p>
            </div>
          )}
          
          {hasSectors && (
            <div>
              <h4 className="text-sm font-medium mb-2" style={{ color: '#3A3936' }}>Sectors</h4>
              <div className="flex flex-wrap gap-2">
                {data.sectors.map((sector, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {sector}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {hasRegions && (
            <div>
              <h4 className="text-sm font-medium mb-2" style={{ color: '#3A3936' }}>Regions of Operation</h4>
              <div className="flex flex-wrap gap-2">
                {data.regions.map((region, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {region}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {hasWebsite && (
            <div>
              <h4 className="text-sm font-medium mb-2" style={{ color: '#3A3936' }}>Website</h4>
              <a 
                href={data.website_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm flex items-center hover:underline"
                style={{ color: '#D5765B' }}
              >
                {data.website_url}
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          )}
          
          <div className="flex space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 text-xs"
            >
              <Edit3 className="w-3 h-3 mr-2" />
              Edit Organization Info
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerateWithAI}
              className="h-8 text-xs"
            >
              <Wand2 className="w-3 h-3 mr-2" />
              Enhance with AI
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center p-6 border border-dashed rounded-lg" style={{ borderColor: '#D8D5D2' }}>
          <Building className="w-8 h-8 mx-auto mb-3" style={{ color: '#D5765B', opacity: 0.5 }} />
          <h4 className="text-sm font-medium mb-2" style={{ color: '#3A3936' }}>
            Organization Information Missing
          </h4>
          <p className="text-sm mb-4" style={{ color: '#66615C' }}>
            Add information about the organization to help candidates understand your mission and impact.
          </p>
          <div className="flex flex-col space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerateWithAI}
              className="h-8 text-xs"
            >
              <Wand2 className="w-3 h-3 mr-2" />
              Generate with AI
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 text-xs"
            >
              <Edit3 className="w-3 h-3 mr-2" />
              Add Manually
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}