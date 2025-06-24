import React, { useState, useEffect } from 'react';
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
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
}

export function PostJobEditor({ generatedJD, activeTask, step, profile }: PostJobEditorProps) {
  const [sections, setSections] = useState<JDSection[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isDraft, setIsDraft] = useState(true);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

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
    const lines = jdContent.split('\n');
    const sections: JDSection[] = [];
    let currentSection: Partial<JDSection> = {};
    let currentContent: string[] = [];

    lines.forEach((line) => {
      if (line.startsWith('#')) {
        // Save previous section
        if (currentSection.title) {
          sections.push({
            id: `section-${sections.length}`,
            title: currentSection.title,
            content: currentContent.join('\n').trim(),
            isLocked: true,
            isEditing: false,
            order: sections.length
          });
        }
        
        // Start new section
        currentSection = {
          title: line.replace(/^#+\s*/, '')
        };
        currentContent = [];
      } else if (line.trim()) {
        currentContent.push(line);
      }
    });

    // Add final section
    if (currentSection.title) {
      sections.push({
        id: `section-${sections.length}`,
        title: currentSection.title,
        content: currentContent.join('\n').trim(),
        isLocked: true,
        isEditing: false,
        order: sections.length
      });
    }

    return sections;
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
      order: sections.length
    };
    setSections(prev => [...prev, newSection]);
  };

  const reorderSections = (dragIndex: number, hoverIndex: number) => {
    const draggedSection = sections[dragIndex];
    const newSections = [...sections];
    newSections.splice(dragIndex, 1);
    newSections.splice(hoverIndex, 0, draggedSection);
    
    // Update order values
    const reorderedSections = newSections.map((section, index) => ({
      ...section,
      order: index
    }));
    
    setSections(reorderedSections);
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
      const titleSection = sections.find(s => s.title.toLowerCase().includes('title') || s.order === 0);
      const title = titleSection?.content.split('\n')[0] || 'Untitled Job';

      const draftData = {
        user_id: profile.id,
        title: title,
        description: fullContent,
        draft_status: 'draft',
        ai_generated: true,
        generation_metadata: {
          sections_count: sections.length,
          generated_at: new Date().toISOString()
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
      const titleSection = sections.find(s => s.title.toLowerCase().includes('title') || s.order === 0);
      const title = titleSection?.content.split('\n')[0] || 'Untitled Job';
      
      const orgSection = sections.find(s => s.title.toLowerCase().includes('about') || s.title.toLowerCase().includes('organization'));
      const organizationName = orgSection?.content.split('\n')[0] || '';

      const responsibilitiesSection = sections.find(s => s.title.toLowerCase().includes('responsibilities') || s.title.toLowerCase().includes('duties'));
      const responsibilities = responsibilitiesSection?.content || '';

      const qualificationsSection = sections.find(s => s.title.toLowerCase().includes('qualifications') || s.title.toLowerCase().includes('requirements'));
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
          published_at: new Date().toISOString()
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
    const titleSection = sections.find(s => s.title.toLowerCase().includes('title') || s.order === 0);
    const title = titleSection?.content.split('\n')[0] || 'Job Opportunity';
    
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
              .map((section, index) => (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  draggable
                  onDragStart={() => setDraggedSection(section.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedSection && draggedSection !== section.id) {
                      const dragIndex = sections.findIndex(s => s.id === draggedSection);
                      const hoverIndex = sections.findIndex(s => s.id === section.id);
                      reorderSections(dragIndex, hoverIndex);
                    }
                    setDraggedSection(null);
                  }}
                  className="cursor-move"
                >
                  <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <GripVertical className="w-4 h-4" style={{ color: '#66615C' }} />
                          <CardTitle className="text-base" style={{ color: '#3A3936' }}>
                            {section.isEditing ? (
                              <Input
                                value={section.title}
                                onChange={(e) => updateSectionContent(section.id, section.content)}
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
              ))}

            {/* Add Section Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: sections.length * 0.1 + 0.2 }}
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
                    .map((section, index) => (
                      <motion.div 
                        key={section.id} 
                        className="mb-6"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <h3 
                          className="text-lg font-medium mb-3 border-b pb-2"
                          style={{ 
                            color: '#3A3936',
                            borderColor: '#F1EFEC'
                          }}
                        >
                          {section.title}
                        </h3>
                        <div 
                          className="whitespace-pre-wrap font-light leading-relaxed"
                          style={{ color: '#66615C' }}
                        >
                          {section.content}
                        </div>
                      </motion.div>
                    ))}
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
    </div>
  );
}