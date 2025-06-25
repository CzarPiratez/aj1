import React, { useState, useEffect, useRef } from 'react';
import { motion, Reorder } from 'framer-motion';
import { 
  Briefcase, 
  Edit3, 
  Save, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  Unlock, 
  Wand2, 
  Clock, 
  GripVertical,
  Eye,
  FileText,
  Printer,
  Download,
  Share2,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Target,
  Building,
  MapPin,
  Calendar,
  DollarSign,
  Heart,
  Languages,
  Users,
  Sparkles,
  Lightbulb,
  MessageSquare,
  Send,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { refineJDSection, adjustTone, detectBiasAndSuggestAlternatives } from '@/lib/ai';

interface PostJobEditorProps {
  generatedJD?: string;
  activeTask?: string;
  step?: string;
  profile?: any;
  draftId?: string;
}

interface JDSection {
  id: string;
  title: string;
  content: string;
  isLocked: boolean;
  isEditing: boolean;
  icon?: React.ComponentType<any>;
  versions?: { timestamp: Date; content: string }[];
}

interface JobDraft {
  id: string;
  user_id: string;
  title?: string;
  description?: string;
  organization_name?: string;
  sections?: any;
  metadata?: any;
  draft_status: string;
  ai_generated: boolean;
  generation_metadata: any;
  created_at: string;
  updated_at: string;
}

type ToneType = 'formal' | 'inclusive' | 'neutral' | 'locally-adapted';

export function PostJobEditor({ generatedJD, activeTask, step, profile, draftId }: PostJobEditorProps) {
  const [jobTitle, setJobTitle] = useState<string>('');
  const [sections, setSections] = useState<JDSection[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isAIRefining, setIsAIRefining] = useState<boolean>(false);
  const [aiRefinementInstructions, setAiRefinementInstructions] = useState<string>('');
  const [isRefinementModalOpen, setIsRefinementModalOpen] = useState<boolean>(false);
  const [currentSectionForRefinement, setCurrentSectionForRefinement] = useState<string | null>(null);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState<boolean>(false);
  const [currentSectionForHistory, setCurrentSectionForHistory] = useState<string | null>(null);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState<boolean>(false);
  const [currentSectionForSuggestions, setCurrentSectionForSuggestions] = useState<string | null>(null);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState<boolean>(false);
  const [isToneModalOpen, setIsToneModalOpen] = useState<boolean>(false);
  const [currentSectionForTone, setCurrentSectionForTone] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState<ToneType | null>(null);
  const [isChangingTone, setIsChangingTone] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDraft, setCurrentDraft] = useState<JobDraft | null>(null);
  
  // Refs for autosave
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>('');
  
  // Load draft data if draftId is provided
  useEffect(() => {
    if (draftId) {
      loadDraft(draftId);
    } else if (generatedJD) {
      // Parse the generated JD if provided
      parseGeneratedJD(generatedJD);
    } else {
      // Initialize with empty sections if no data is provided
      initializeEmptySections();
      setLoading(false);
    }
  }, [draftId, generatedJD]);

  // Load draft data from Supabase using new schema
  const loadDraft = async (id: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('job_drafts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setCurrentDraft(data);
        setJobTitle(data.title || '');
        
        // Load sections from the new schema
        if (data.sections && typeof data.sections === 'object') {
          const formattedSections = Object.entries(data.sections).map(([key, section]: [string, any]) => ({
            id: key,
            title: section.title || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            content: section.content || '',
            isLocked: section.locked || false,
            isEditing: false,
            versions: section.version_history ? 
              section.version_history.map((vh: any) => ({
                timestamp: new Date(vh.timestamp),
                content: vh.content
              })) : 
              [{ timestamp: new Date(), content: section.content || '' }]
          }));
          
          setSections(formattedSections);
        } else {
          // Fallback to legacy parsing if sections don't exist
          initializeEmptySections();
        }
      }
    } catch (err) {
      console.error('Error loading draft:', err);
      setError(err instanceof Error ? err.message : 'Failed to load job draft');
      toast.error('Failed to load job draft');
    } finally {
      setLoading(false);
    }
  };

  // Initialize empty sections structure
  const initializeEmptySections = () => {
    const defaultSections: JDSection[] = [
      {
        id: 'job-title',
        title: 'Job Title',
        content: '',
        isLocked: false,
        isEditing: false
      },
      {
        id: 'overview',
        title: 'Overview',
        content: '',
        isLocked: false,
        isEditing: false
      },
      {
        id: 'job-summary',
        title: 'Job Summary',
        content: '',
        isLocked: false,
        isEditing: false
      },
      {
        id: 'responsibilities',
        title: 'Key Responsibilities',
        content: '',
        isLocked: false,
        isEditing: false
      },
      {
        id: 'qualifications',
        title: 'Qualifications and Competencies',
        content: '',
        isLocked: false,
        isEditing: false
      },
      {
        id: 'experience',
        title: 'Experience and Languages',
        content: '',
        isLocked: false,
        isEditing: false
      },
      {
        id: 'contract',
        title: 'Contract Details',
        content: '',
        isLocked: false,
        isEditing: false
      },
      {
        id: 'how-to-apply',
        title: 'How to Apply',
        content: '',
        isLocked: false,
        isEditing: false
      },
      {
        id: 'organization',
        title: 'About the Organization',
        content: '',
        isLocked: false,
        isEditing: false
      }
    ];
    
    setSections(defaultSections);
  };

  // Parse the generated JD into sections using new schema
  const parseGeneratedJD = (jdContent: string) => {
    try {
      // Try to parse as JSON first (new format)
      const parsedJD = JSON.parse(jdContent);
      
      // Extract job title from overview or title field
      const extractedTitle = parsedJD.title || parsedJD.overview?.job_title || 'Untitled Job';
      setJobTitle(extractedTitle);
      
      // Initialize sections array
      const parsedSections: JDSection[] = [];
      
      // Add job title section
      parsedSections.push({
        id: 'job-title',
        title: 'Job Title',
        content: extractedTitle,
        isLocked: false,
        isEditing: false
      });
      
      // Process sections from the new schema
      if (parsedJD.sections && typeof parsedJD.sections === 'object') {
        Object.entries(parsedJD.sections).forEach(([key, section]: [string, any]) => {
          if (key !== 'job-title') {
            parsedSections.push({
              id: key,
              title: section.title || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              content: section.content || '',
              isLocked: false,
              isEditing: false
            });
          }
        });
      }
      
      // Set the sections
      setSections(parsedSections);
    } catch (error) {
      // If JSON parsing fails, initialize empty sections
      console.error('Error parsing JD as JSON, initializing empty sections:', error);
      initializeEmptySections();
    }
    
    setLoading(false);
  };

  // Handle section content change with autosave
  const handleSectionChange = (id: string, newContent: string) => {
    setSections(prevSections => 
      prevSections.map(section => 
        section.id === id 
          ? { 
              ...section, 
              content: newContent,
              versions: section.versions ? [
                ...section.versions,
                { timestamp: new Date(), content: newContent }
              ] : [{ timestamp: new Date(), content: newContent }]
            } 
          : section
      )
    );
    
    // Set up autosave
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    autoSaveTimerRef.current = setTimeout(async () => {
      await saveDraftToDatabase();
    }, 2000);
  };

  // Save draft to database using new schema
  const saveDraftToDatabase = async () => {
    if (!currentDraft || !profile?.id) return;
    
    try {
      // Convert sections to new schema format
      const sectionsData = sections.reduce((acc, section) => {
        if (section.id !== 'job-title') {
          acc[section.id] = {
            title: section.title,
            content: section.content,
            locked: section.isLocked,
            version_history: section.versions || []
          };
        }
        return acc;
      }, {} as any);

      const { error } = await supabase
        .from('job_drafts')
        .update({
          title: jobTitle,
          sections: sectionsData,
          metadata: {
            last_auto_save: new Date().toISOString(),
            section_count: sections.length - 1 // Exclude job-title
          },
          last_edited_at: new Date().toISOString()
        })
        .eq('id', currentDraft.id)
        .eq('user_id', profile.id);

      if (error) throw error;
      
      toast.success('Changes saved automatically', {
        duration: 2000,
      });
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save changes');
    }
  };

  // Toggle section lock state
  const toggleSectionLock = (id: string) => {
    setSections(prevSections => 
      prevSections.map(section => 
        section.id === id 
          ? { ...section, isLocked: !section.isLocked, isEditing: false } 
          : section
      )
    );
  };

  // Toggle section editing state
  const toggleSectionEditing = (id: string) => {
    setSections(prevSections => 
      prevSections.map(section => 
        section.id === id 
          ? { ...section, isEditing: !section.isEditing } 
          : section
      )
    );
    
    setActiveSection(id);
  };

  // AI refinement functions
  const openAIRefinementModal = (id: string) => {
    setCurrentSectionForRefinement(id);
    setAiRefinementInstructions('');
    setIsRefinementModalOpen(true);
  };

  const handleAIRefinement = async () => {
    if (!currentSectionForRefinement || !aiRefinementInstructions) {
      toast.error('Please provide instructions for the AI');
      return;
    }
    
    setIsAIRefining(true);
    
    try {
      const sectionToRefine = sections.find(s => s.id === currentSectionForRefinement);
      
      if (!sectionToRefine) {
        throw new Error('Section not found');
      }
      
      const refinedContent = await refineJDSection(
        sectionToRefine.title,
        sectionToRefine.content,
        aiRefinementInstructions
      );
      
      // Update the section with refined content
      setSections(prevSections => 
        prevSections.map(section => 
          section.id === currentSectionForRefinement 
            ? { 
                ...section, 
                content: refinedContent,
                versions: section.versions ? [
                  ...section.versions,
                  { 
                    timestamp: new Date(), 
                    content: refinedContent 
                  }
                ] : [{ timestamp: new Date(), content: refinedContent }]
              } 
            : section
        )
      );
      
      toast.success('Section refined successfully');
      setIsRefinementModalOpen(false);
    } catch (error) {
      console.error('Error refining section:', error);
      toast.error('Failed to refine section');
    } finally {
      setIsAIRefining(false);
    }
  };

  // Save the entire job description
  const saveJobDescription = async () => {
    try {
      await saveDraftToDatabase();
      toast.success('Job description saved successfully');
    } catch (error) {
      console.error('Error saving job description:', error);
      toast.error('Failed to save job description');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FBE4D5' }}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#D5765B' }} />
          </div>
          <p className="text-lg font-medium" style={{ color: '#3A3936' }}>Loading job description...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-red-100">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-lg font-medium mb-2" style={{ color: '#3A3936' }}>Error Loading Job Description</p>
          <p className="text-sm" style={{ color: '#66615C' }}>{error}</p>
          <Button 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
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
            <p 
              className="text-sm font-light"
              style={{ color: '#66615C' }}
            >
              Create and refine your job description with AI assistance
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewOpen(true)}
              className="h-9"
              style={{ borderColor: '#D8D5D2', color: '#66615C' }}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            
            <Button
              onClick={saveJobDescription}
              className="h-9 text-white"
              style={{ backgroundColor: '#D5765B' }}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 max-w-4xl mx-auto">
            {/* Job Title Input */}
            <div className="mb-6">
              <Input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Enter Job Title"
                className="text-2xl font-medium border-0 border-b px-0 rounded-none focus-visible:ring-0 pb-2"
                style={{ 
                  borderColor: '#D8D5D2',
                  color: '#3A3936'
                }}
              />
            </div>

            {/* Sections */}
            <Reorder.Group 
              axis="y" 
              values={sections} 
              onReorder={setSections}
              className="space-y-4"
            >
              {sections.map((section) => (
                section.id !== 'job-title' && (
                  <Reorder.Item
                    key={section.id}
                    value={section}
                    className="outline-none"
                  >
                    <Card 
                      className="border shadow-sm hover:shadow-md transition-all duration-200"
                      style={{ borderColor: '#D8D5D2' }}
                    >
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="cursor-move">
                              <GripVertical className="w-5 h-5" style={{ color: '#D8D5D2' }} />
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4" style={{ color: '#D5765B' }} />
                              <CardTitle className="text-base font-medium" style={{ color: '#3A3936' }}>
                                {section.title}
                              </CardTitle>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAIRefinementModal(section.id)}
                              className="h-7 w-7 p-0 rounded-full"
                              title="Improve with AI"
                              disabled={section.isLocked}
                              style={{ color: section.isLocked ? '#D8D5D2' : '#D5765B' }}
                            >
                              <Wand2 className="w-3.5 h-3.5" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSectionLock(section.id)}
                              className="h-7 w-7 p-0 rounded-full"
                              title={section.isLocked ? 'Unlock Section' : 'Lock Section'}
                              style={{ color: '#66615C' }}
                            >
                              {section.isLocked ? (
                                <Lock className="w-3.5 h-3.5" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5" />
                              )}
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSectionEditing(section.id)}
                              className="h-7 w-7 p-0 rounded-full"
                              title={section.isEditing ? 'Save Changes' : 'Edit Section'}
                              disabled={section.isLocked}
                              style={{ color: section.isLocked ? '#D8D5D2' : section.isEditing ? '#10B981' : '#66615C' }}
                            >
                              {section.isEditing ? (
                                <Save className="w-3.5 h-3.5" />
                              ) : (
                                <Edit3 className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="p-4 pt-2">
                        {section.isEditing ? (
                          <Textarea
                            value={section.content}
                            onChange={(e) => handleSectionChange(section.id, e.target.value)}
                            placeholder={`Enter ${section.title} content...`}
                            className="min-h-[150px] font-light text-sm"
                            style={{ color: '#3A3936', borderColor: '#D8D5D2' }}
                          />
                        ) : (
                          <div 
                            className="prose prose-sm max-w-none"
                            style={{ color: '#3A3936' }}
                          >
                            {section.content.split('\n').map((line, i) => (
                              <React.Fragment key={i}>
                                {line}
                                <br />
                              </React.Fragment>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Reorder.Item>
                )
              ))}
            </Reorder.Group>
          </div>
        </ScrollArea>
      </div>

      {/* AI Refinement Modal */}
      <Dialog open={isRefinementModalOpen} onOpenChange={setIsRefinementModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium" style={{ color: '#3A3936' }}>
              Improve with AI
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 my-2">
            <p className="text-sm" style={{ color: '#66615C' }}>
              Tell the AI how you'd like to improve this section. Be specific about tone, content, or structure changes.
            </p>
            
            <Textarea
              value={aiRefinementInstructions}
              onChange={(e) => setAiRefinementInstructions(e.target.value)}
              placeholder="e.g., Make the language more inclusive, add more details about technical requirements, make it more concise..."
              className="min-h-[100px]"
              style={{ borderColor: '#D8D5D2', color: '#3A3936' }}
            />
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRefinementModalOpen(false)}
              style={{ borderColor: '#D8D5D2', color: '#66615C' }}
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleAIRefinement}
              disabled={isAIRefining || !aiRefinementInstructions.trim()}
              className="text-white"
              style={{ backgroundColor: '#D5765B' }}
            >
              {isAIRefining ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Refining...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Refine with AI
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}