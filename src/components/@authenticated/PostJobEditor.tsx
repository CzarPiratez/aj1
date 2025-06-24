import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
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
  Sparkles
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
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { refineJDSection, adjustTone, detectBiasAndSuggestAlternatives } from '@/lib/ai';
import { JDPreviewModal } from './jobs/JDPreviewModal';

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
  isDraft: boolean;
  icon: React.ComponentType<any>;
  versions: { timestamp: Date; content: string }[];
}

export function PostJobEditor({ generatedJD, activeTask, step, profile }: PostJobEditorProps) {
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
  
  // Refs for autosave
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>('');
  
  // Parse the generated JD on initial load
  useEffect(() => {
    if (generatedJD) {
      parseGeneratedJD(generatedJD);
    } else {
      // Initialize with empty sections if no JD is provided
      initializeEmptySections();
    }
  }, [generatedJD]);

  // Initialize empty sections structure
  const initializeEmptySections = () => {
    const defaultSections: JDSection[] = [
      {
        id: 'job-title',
        title: 'Job Title',
        content: '',
        isLocked: false,
        isEditing: false,
        isDraft: true,
        icon: Briefcase,
        versions: [{ timestamp: new Date(), content: '' }]
      },
      {
        id: 'overview',
        title: 'Overview Panel',
        content: '',
        isLocked: false,
        isEditing: false,
        isDraft: true,
        icon: FileText,
        versions: [{ timestamp: new Date(), content: '' }]
      },
      {
        id: 'sdgs',
        title: 'SDGs (AI-Detected)',
        content: '',
        isLocked: false,
        isEditing: false,
        isDraft: true,
        icon: Target,
        versions: [{ timestamp: new Date(), content: '' }]
      },
      {
        id: 'sectors',
        title: 'Sectors and Impact Areas',
        content: '',
        isLocked: false,
        isEditing: false,
        isDraft: true,
        icon: Sparkles,
        versions: [{ timestamp: new Date(), content: '' }]
      },
      {
        id: 'dei-language',
        title: 'DEI and Language Analysis',
        content: '',
        isLocked: false,
        isEditing: false,
        isDraft: true,
        icon: Languages,
        versions: [{ timestamp: new Date(), content: '' }]
      },
      {
        id: 'job-summary',
        title: 'Job Summary',
        content: '',
        isLocked: false,
        isEditing: false,
        isDraft: true,
        icon: FileText,
        versions: [{ timestamp: new Date(), content: '' }]
      },
      {
        id: 'responsibilities',
        title: 'Key Responsibilities',
        content: '',
        isLocked: false,
        isEditing: false,
        isDraft: true,
        icon: CheckCircle,
        versions: [{ timestamp: new Date(), content: '' }]
      },
      {
        id: 'qualifications',
        title: 'Qualifications and Competencies',
        content: `## Required Qualifications
- 

## Preferred Qualifications
- 

## Skills and Competencies
### Technical Skills
- 

### Managerial Skills
- 

### Communication Skills
- 

### Soft Skills
- `,
        isLocked: false,
        isEditing: false,
        isDraft: true,
        icon: CheckCircle,
        versions: [{ timestamp: new Date(), content: '' }]
      },
      {
        id: 'experience',
        title: 'Experience and Languages',
        content: '',
        isLocked: false,
        isEditing: false,
        isDraft: true,
        icon: Clock,
        versions: [{ timestamp: new Date(), content: '' }]
      },
      {
        id: 'contract',
        title: 'Contract Details',
        content: '',
        isLocked: false,
        isEditing: false,
        isDraft: true,
        icon: FileText,
        versions: [{ timestamp: new Date(), content: '' }]
      },
      {
        id: 'how-to-apply',
        title: 'How to Apply',
        content: '',
        isLocked: false,
        isEditing: false,
        isDraft: true,
        icon: FileText,
        versions: [{ timestamp: new Date(), content: '' }]
      },
      {
        id: 'organization',
        title: 'About the Organization',
        content: '',
        isLocked: false,
        isEditing: false,
        isDraft: true,
        icon: Building,
        versions: [{ timestamp: new Date(), content: '' }]
      }
    ];
    
    setSections(defaultSections);
  };

  // Parse the generated JD into sections
  const parseGeneratedJD = (jdContent: string) => {
    // Extract job title (usually the first heading)
    const titleMatch = jdContent.match(/^#\s+(.+)$/m);
    const extractedTitle = titleMatch ? titleMatch[1].trim() : 'Untitled Job';
    setJobTitle(extractedTitle);
    
    // Initialize sections with default structure
    const parsedSections: JDSection[] = [
      {
        id: 'job-title',
        title: 'Job Title',
        content: extractedTitle,
        isLocked: false,
        isEditing: false,
        isDraft: false,
        icon: Briefcase,
        versions: [{ timestamp: new Date(), content: extractedTitle }]
      }
    ];
    
    // Extract overview (usually the first paragraph after the title)
    const overviewMatch = jdContent.match(/^#\s+.+\n\n(.+(?:\n(?!##).+)*)/m);
    if (overviewMatch) {
      parsedSections.push({
        id: 'overview',
        title: 'Overview Panel',
        content: overviewMatch[1].trim(),
        isLocked: false,
        isEditing: false,
        isDraft: false,
        icon: FileText,
        versions: [{ timestamp: new Date(), content: overviewMatch[1].trim() }]
      });
    } else {
      parsedSections.push({
        id: 'overview',
        title: 'Overview Panel',
        content: '',
        isLocked: false,
        isEditing: false,
        isDraft: true,
        icon: FileText,
        versions: [{ timestamp: new Date(), content: '' }]
      });
    }
    
    // Add SDGs section (initially empty, will be AI-detected)
    parsedSections.push({
      id: 'sdgs',
      title: 'SDGs (AI-Detected)',
      content: 'AI is analyzing the job description to detect relevant Sustainable Development Goals...',
      isLocked: false,
      isEditing: false,
      isDraft: true,
      icon: Target,
      versions: [{ timestamp: new Date(), content: '' }]
    });
    
    // Add sectors section (initially empty)
    parsedSections.push({
      id: 'sectors',
      title: 'Sectors and Impact Areas',
      content: '',
      isLocked: false,
      isEditing: false,
      isDraft: true,
      icon: Sparkles,
      versions: [{ timestamp: new Date(), content: '' }]
    });
    
    // Add DEI section (initially empty)
    parsedSections.push({
      id: 'dei-language',
      title: 'DEI and Language Analysis',
      content: 'AI is analyzing the job description for inclusive language...',
      isLocked: false,
      isEditing: false,
      isDraft: true,
      icon: Languages,
      versions: [{ timestamp: new Date(), content: '' }]
    });
    
    // Extract other sections based on headings
    const sectionMatches = jdContent.matchAll(/^##\s+(.+)\n\n([\s\S]+?)(?=\n##\s+|$)/gm);
    
    for (const match of sectionMatches) {
      const sectionTitle = match[1].trim();
      const sectionContent = match[2].trim();
      
      // Map section titles to our predefined structure
      let sectionId = '';
      let icon = FileText;
      
      if (/job\s+summary|role\s+overview|position\s+summary/i.test(sectionTitle)) {
        sectionId = 'job-summary';
        icon = FileText;
      } else if (/responsibilities|duties|key\s+functions/i.test(sectionTitle)) {
        sectionId = 'responsibilities';
        icon = CheckCircle;
      } else if (/qualifications|requirements|competencies/i.test(sectionTitle)) {
        sectionId = 'qualifications';
        icon = CheckCircle;
      } else if (/experience|education|languages/i.test(sectionTitle)) {
        sectionId = 'experience';
        icon = Clock;
      } else if (/contract|salary|compensation|benefits|details/i.test(sectionTitle)) {
        sectionId = 'contract';
        icon = FileText;
      } else if (/how\s+to\s+apply|application\s+process/i.test(sectionTitle)) {
        sectionId = 'how-to-apply';
        icon = FileText;
      } else if (/about|organization|company|who\s+we\s+are/i.test(sectionTitle)) {
        sectionId = 'organization';
        icon = Building;
      } else {
        // For unrecognized sections, create a custom ID
        sectionId = `section-${parsedSections.length}`;
      }
      
      // Check if this section ID already exists (avoid duplicates)
      const existingIndex = parsedSections.findIndex(s => s.id === sectionId);
      
      if (existingIndex >= 0) {
        // Update existing section
        parsedSections[existingIndex].content = sectionContent;
        parsedSections[existingIndex].versions.push({ 
          timestamp: new Date(), 
          content: sectionContent 
        });
        parsedSections[existingIndex].isDraft = false;
      } else {
        // Add new section
        parsedSections.push({
          id: sectionId,
          title: sectionTitle,
          content: sectionContent,
          isLocked: false,
          isEditing: false,
          isDraft: false,
          icon,
          versions: [{ timestamp: new Date(), content: sectionContent }]
        });
      }
    }
    
    // Ensure all required sections exist
    const requiredSections = [
      { id: 'job-summary', title: 'Job Summary', icon: FileText },
      { id: 'responsibilities', title: 'Key Responsibilities', icon: CheckCircle },
      { id: 'qualifications', title: 'Qualifications and Competencies', icon: CheckCircle, 
        defaultContent: `## Required Qualifications
- 

## Preferred Qualifications
- 

## Skills and Competencies
### Technical Skills
- 

### Managerial Skills
- 

### Communication Skills
- 

### Soft Skills
- ` },
      { id: 'experience', title: 'Experience and Languages', icon: Clock },
      { id: 'contract', title: 'Contract Details', icon: FileText },
      { id: 'how-to-apply', title: 'How to Apply', icon: FileText },
      { id: 'organization', title: 'About the Organization', icon: Building }
    ];
    
    for (const section of requiredSections) {
      if (!parsedSections.some(s => s.id === section.id)) {
        parsedSections.push({
          id: section.id,
          title: section.title,
          content: section.defaultContent || '',
          isLocked: false,
          isEditing: false,
          isDraft: true,
          icon: section.icon,
          versions: [{ timestamp: new Date(), content: section.defaultContent || '' }]
        });
      }
    }
    
    setSections(parsedSections);
  };

  // Handle section content change
  const handleSectionChange = (id: string, newContent: string) => {
    setSections(prevSections => 
      prevSections.map(section => 
        section.id === id 
          ? { 
              ...section, 
              content: newContent,
              versions: [
                ...section.versions,
                { timestamp: new Date(), content: newContent }
              ]
            } 
          : section
      )
    );
    
    // Set up autosave
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    autoSaveTimerRef.current = setTimeout(() => {
      // Here you would save to database
      toast.success('Changes saved automatically', {
        duration: 2000,
      });
      lastSavedContentRef.current = JSON.stringify(sections);
    }, 2000);
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

  // Open AI refinement modal for a section
  const openAIRefinementModal = (id: string) => {
    setCurrentSectionForRefinement(id);
    setAiRefinementInstructions('');
    setIsRefinementModalOpen(true);
  };

  // Handle AI refinement submission
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
                versions: [
                  ...section.versions,
                  { 
                    timestamp: new Date(), 
                    content: refinedContent 
                  }
                ],
                isDraft: false
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

  // Open version history modal for a section
  const openVersionHistoryModal = (id: string) => {
    setCurrentSectionForHistory(id);
    setIsVersionHistoryOpen(true);
  };

  // Restore a previous version of a section
  const restoreVersion = (index: number) => {
    if (!currentSectionForHistory) return;
    
    const sectionToUpdate = sections.find(s => s.id === currentSectionForHistory);
    
    if (!sectionToUpdate || index >= sectionToUpdate.versions.length) {
      return;
    }
    
    const versionToRestore = sectionToUpdate.versions[index];
    
    setSections(prevSections => 
      prevSections.map(section => 
        section.id === currentSectionForHistory 
          ? { 
              ...section, 
              content: versionToRestore.content,
              versions: [
                ...section.versions,
                { 
                  timestamp: new Date(), 
                  content: versionToRestore.content 
                }
              ]
            } 
          : section
      )
    );
    
    toast.success('Previous version restored');
    setIsVersionHistoryOpen(false);
  };

  // Save the entire job description
  const saveJobDescription = async () => {
    try {
      // Here you would save to database
      toast.success('Job description saved successfully');
    } catch (error) {
      console.error('Error saving job description:', error);
      toast.error('Failed to save job description');
    }
  };

  // Generate the full job description text
  const generateFullJobDescription = (): string => {
    let fullJD = `# ${jobTitle}\n\n`;
    
    // Add each section in order
    sections.forEach(section => {
      if (section.id !== 'job-title' && section.content.trim()) {
        fullJD += `## ${section.title}\n\n${section.content}\n\n`;
      }
    });
    
    return fullJD;
  };

  // Handle print action
  const handlePrint = () => {
    window.print();
  };

  // Handle download action
  const handleDownload = () => {
    // Create a blob and download
    const blob = new Blob([generateFullJobDescription()], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${jobTitle.replace(/\s+/g, '-').toLowerCase()}-job-description.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Prepare sections for preview modal
  const getPreviewSections = () => {
    return sections
      .filter(section => section.id !== 'job-title')
      .map(section => ({
        id: section.id,
        title: section.title,
        content: section.content,
        isDraft: section.isDraft
      }));
  };

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
                              <section.icon className="w-4 h-4" style={{ color: '#D5765B' }} />
                              <CardTitle className="text-base font-medium" style={{ color: '#3A3936' }}>
                                {section.title}
                              </CardTitle>
                            </div>
                            
                            {section.isDraft && (
                              <Badge 
                                variant="outline" 
                                className="text-xs px-2 py-0 h-5"
                                style={{ borderColor: '#F59E0B', color: '#F59E0B' }}
                              >
                                Not Final
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openVersionHistoryModal(section.id)}
                              className="h-7 w-7 p-0 rounded-full"
                              title="Version History"
                              style={{ color: '#66615C' }}
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </Button>
                            
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

      {/* Version History Modal */}
      <Dialog open={isVersionHistoryOpen} onOpenChange={setIsVersionHistoryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium" style={{ color: '#3A3936' }}>
              Version History
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 my-2">
            <p className="text-sm" style={{ color: '#66615C' }}>
              Select a previous version to restore
            </p>
            
            <ScrollArea className="h-[300px] border rounded-md p-2" style={{ borderColor: '#D8D5D2' }}>
              {currentSectionForHistory && sections.find(s => s.id === currentSectionForHistory)?.versions.map((version, index, array) => (
                <div 
                  key={index}
                  className="mb-4 pb-4 border-b last:border-0"
                  style={{ borderColor: '#F1EFEC' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5" style={{ color: '#66615C' }} />
                      <span className="text-xs" style={{ color: '#66615C' }}>
                        {version.timestamp.toLocaleString()}
                      </span>
                    </div>
                    
                    {index < array.length - 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => restoreVersion(index)}
                        className="h-7 text-xs"
                        style={{ borderColor: '#D8D5D2', color: '#66615C' }}
                      >
                        <RotateCcw className="w-3 h-3 mr-2" />
                        Restore
                      </Button>
                    )}
                  </div>
                  
                  <div 
                    className="text-sm p-2 rounded"
                    style={{ backgroundColor: '#F9F7F4', color: '#3A3936' }}
                  >
                    {version.content.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        <br />
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsVersionHistoryOpen(false)}
              style={{ borderColor: '#D8D5D2', color: '#66615C' }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <JDPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        jobTitle={jobTitle}
        sections={getPreviewSections()}
        onDownload={handleDownload}
        onPrint={handlePrint}
      />
    </div>
  );
}