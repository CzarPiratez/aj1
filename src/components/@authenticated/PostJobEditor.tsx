import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  Briefcase, 
  Building, 
  MapPin, 
  Calendar, 
  Clock, 
  Send, 
  Save, 
  Download, 
  Share2, 
  Eye, 
  Edit3, 
  Trash2, 
  Lock, 
  Unlock, 
  Wand2, 
  History, 
  CheckCircle, 
  XCircle, 
  GripVertical,
  Globe,
  Target,
  Users,
  MessageSquare,
  FileText,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
  MoreHorizontal,
  Copy,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { refineJDSection, adjustTone, detectBiasAndSuggestAlternatives } from '@/lib/ai';
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
  versions: JDSectionVersion[];
}

interface JDSectionVersion {
  id: string;
  content: string;
  timestamp: Date;
  source: 'initial' | 'user' | 'ai';
  description?: string;
}

interface QualificationSubsection {
  id: string;
  title: string;
  content: string;
  isEditing: boolean;
}

export function PostJobEditor({ generatedJD, activeTask, step, profile }: PostJobEditorProps) {
  const [jobTitle, setJobTitle] = useState<string>('');
  const [organizationName, setOrganizationName] = useState<string>('');
  const [sections, setSections] = useState<JDSection[]>([]);
  const [sectionOrder, setSectionOrder] = useState<string[]>([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false);
  const [currentAISection, setCurrentAISection] = useState<string | null>(null);
  const [aiInstructions, setAIInstructions] = useState<string>('');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [currentHistorySection, setCurrentHistorySection] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, boolean>>({});
  const [autosaveTimers, setAutosaveTimers] = useState<Record<string, NodeJS.Timeout>>({});
  
  // Qualifications subsections state
  const [qualificationsSubsections, setQualificationsSubsections] = useState<QualificationSubsection[]>([
    {
      id: 'required-qualifications',
      title: 'Required Qualifications',
      content: '',
      isEditing: false
    },
    {
      id: 'preferred-qualifications',
      title: 'Preferred Qualifications',
      content: '',
      isEditing: false
    },
    {
      id: 'skills-competencies',
      title: 'Skills and Competencies',
      content: '',
      isEditing: false
    }
  ]);

  // Initialize sections from generatedJD or with default sections
  useEffect(() => {
    if (generatedJD) {
      parseGeneratedJD(generatedJD);
    } else {
      initializeDefaultSections();
    }
  }, [generatedJD]);

  // Parse the generated JD from markdown to sections
  const parseGeneratedJD = (markdown: string) => {
    // Extract job title
    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      setJobTitle(titleMatch[1]);
    }

    // Extract organization name
    const orgMatch = markdown.match(/##\s+About\s+(.+)$/m) || 
                    markdown.match(/##\s+About\s+the\s+Organization/m);
    if (orgMatch) {
      setOrganizationName(orgMatch[1] || 'the Organization');
    }

    // Initialize sections array
    const initialSections: JDSection[] = [];
    const initialOrder: string[] = [];

    // Define section patterns to extract
    const sectionPatterns = [
      { title: 'Overview', pattern: /##\s+(?:Role\s+)?Overview([\s\S]*?)(?=##|$)/i },
      { title: 'SDGs (AI-Detected)', pattern: /##\s+SDGs([\s\S]*?)(?=##|$)/i },
      { title: 'Sectors and Impact Areas', pattern: /##\s+Sectors([\s\S]*?)(?=##|$)/i },
      { title: 'DEI and Language Analysis', pattern: /##\s+DEI([\s\S]*?)(?=##|$)/i },
      { title: 'Job Summary', pattern: /##\s+(?:Job\s+)?Summary([\s\S]*?)(?=##|$)/i },
      { title: 'Key Responsibilities', pattern: /##\s+(?:Key\s+)?Responsibilities([\s\S]*?)(?=##|$)/i },
      { title: 'Required Qualifications', pattern: /##\s+Required\s+Qualifications([\s\S]*?)(?=##|$)/i },
      { title: 'Preferred Qualifications', pattern: /##\s+Preferred\s+Qualifications([\s\S]*?)(?=##|$)/i },
      { title: 'Skills and Competencies', pattern: /##\s+Skills\s+(?:and\s+)?Competencies([\s\S]*?)(?=##|$)/i },
      { title: 'Experience and Languages', pattern: /##\s+Experience\s+(?:and\s+)?Languages([\s\S]*?)(?=##|$)/i },
      { title: 'Contract Details', pattern: /##\s+Contract\s+Details([\s\S]*?)(?=##|$)/i },
      { title: 'How to Apply', pattern: /##\s+How\s+to\s+Apply([\s\S]*?)(?=##|$)/i },
      { title: 'About the Organization', pattern: /##\s+About\s+(?:the\s+)?Organization([\s\S]*?)(?=##|$)/i }
    ];

    // Extract content for each section
    sectionPatterns.forEach(({ title, pattern }) => {
      const match = markdown.match(pattern);
      if (match && match[1]) {
        const content = match[1].trim();
        const id = title.toLowerCase().replace(/\s+/g, '-');
        
        // Special handling for qualifications sections
        if (title === 'Required Qualifications') {
          setQualificationsSubsections(prev => 
            prev.map(subsection => 
              subsection.id === 'required-qualifications' 
                ? { ...subsection, content } 
                : subsection
            )
          );
        } else if (title === 'Preferred Qualifications') {
          setQualificationsSubsections(prev => 
            prev.map(subsection => 
              subsection.id === 'preferred-qualifications' 
                ? { ...subsection, content } 
                : subsection
            )
          );
        } else if (title === 'Skills and Competencies') {
          setQualificationsSubsections(prev => 
            prev.map(subsection => 
              subsection.id === 'skills-competencies' 
                ? { ...subsection, content } 
                : subsection
            )
          );
        } else {
          // For non-qualification sections, add them normally
          initialSections.push({
            id,
            title,
            content,
            isLocked: false,
            isEditing: false,
            versions: [
              {
                id: `${id}-v1`,
                content,
                timestamp: new Date(),
                source: 'initial',
                description: 'Initial version'
              }
            ]
          });
          initialOrder.push(id);
        }
      }
    });

    // Add the merged qualifications section
    const qualificationsContent = qualificationsSubsections
      .map(subsection => `### ${subsection.title}\n${subsection.content}`)
      .join('\n\n');
    
    initialSections.push({
      id: 'qualifications-and-competencies',
      title: 'Qualifications and Competencies',
      content: qualificationsContent,
      isLocked: false,
      isEditing: false,
      versions: [
        {
          id: 'qualifications-and-competencies-v1',
          content: qualificationsContent,
          timestamp: new Date(),
          source: 'initial',
          description: 'Initial version'
        }
      ]
    });
    
    // Add qualifications to the order at the appropriate position
    const keyResponsibilitiesIndex = initialOrder.findIndex(id => id === 'key-responsibilities');
    if (keyResponsibilitiesIndex !== -1) {
      initialOrder.splice(keyResponsibilitiesIndex + 1, 0, 'qualifications-and-competencies');
    } else {
      initialOrder.push('qualifications-and-competencies');
    }

    // Set the sections and order
    setSections(initialSections);
    setSectionOrder(initialOrder);
  };

  // Initialize default sections if no JD is provided
  const initializeDefaultSections = () => {
    const defaultSections: JDSection[] = [
      {
        id: 'overview',
        title: 'Overview',
        content: 'Provide a brief overview of the role and its importance to your organization.',
        isLocked: false,
        isEditing: false,
        versions: [
          {
            id: 'overview-v1',
            content: 'Provide a brief overview of the role and its importance to your organization.',
            timestamp: new Date(),
            source: 'initial',
            description: 'Initial version'
          }
        ]
      },
      {
        id: 'sdgs',
        title: 'SDGs (AI-Detected)',
        content: 'The AI will detect relevant Sustainable Development Goals (SDGs) based on the job description.',
        isLocked: false,
        isEditing: false,
        versions: [
          {
            id: 'sdgs-v1',
            content: 'The AI will detect relevant Sustainable Development Goals (SDGs) based on the job description.',
            timestamp: new Date(),
            source: 'initial',
            description: 'Initial version'
          }
        ]
      },
      {
        id: 'sectors-and-impact',
        title: 'Sectors and Impact Areas',
        content: 'Describe the sectors and impact areas relevant to this role.',
        isLocked: false,
        isEditing: false,
        versions: [
          {
            id: 'sectors-and-impact-v1',
            content: 'Describe the sectors and impact areas relevant to this role.',
            timestamp: new Date(),
            source: 'initial',
            description: 'Initial version'
          }
        ]
      },
      {
        id: 'dei-and-language',
        title: 'DEI and Language Analysis',
        content: 'The AI will analyze the job description for diversity, equity, and inclusion considerations.',
        isLocked: false,
        isEditing: false,
        versions: [
          {
            id: 'dei-and-language-v1',
            content: 'The AI will analyze the job description for diversity, equity, and inclusion considerations.',
            timestamp: new Date(),
            source: 'initial',
            description: 'Initial version'
          }
        ]
      },
      {
        id: 'job-summary',
        title: 'Job Summary',
        content: 'Provide a concise summary of the job, its purpose, and its place within the organization.',
        isLocked: false,
        isEditing: false,
        versions: [
          {
            id: 'job-summary-v1',
            content: 'Provide a concise summary of the job, its purpose, and its place within the organization.',
            timestamp: new Date(),
            source: 'initial',
            description: 'Initial version'
          }
        ]
      },
      {
        id: 'key-responsibilities',
        title: 'Key Responsibilities',
        content: 'List the main duties and responsibilities of the role.',
        isLocked: false,
        isEditing: false,
        versions: [
          {
            id: 'key-responsibilities-v1',
            content: 'List the main duties and responsibilities of the role.',
            timestamp: new Date(),
            source: 'initial',
            description: 'Initial version'
          }
        ]
      },
      {
        id: 'qualifications-and-competencies',
        title: 'Qualifications and Competencies',
        content: '### Required Qualifications\nList the essential qualifications needed for this role.\n\n### Preferred Qualifications\nList qualifications that are desirable but not mandatory.\n\n### Skills and Competencies\nList the key skills and competencies needed for success in this role.',
        isLocked: false,
        isEditing: false,
        versions: [
          {
            id: 'qualifications-and-competencies-v1',
            content: '### Required Qualifications\nList the essential qualifications needed for this role.\n\n### Preferred Qualifications\nList qualifications that are desirable but not mandatory.\n\n### Skills and Competencies\nList the key skills and competencies needed for success in this role.',
            timestamp: new Date(),
            source: 'initial',
            description: 'Initial version'
          }
        ]
      },
      {
        id: 'experience-and-languages',
        title: 'Experience and Languages',
        content: 'Describe the experience level and language requirements for this role.',
        isLocked: false,
        isEditing: false,
        versions: [
          {
            id: 'experience-and-languages-v1',
            content: 'Describe the experience level and language requirements for this role.',
            timestamp: new Date(),
            source: 'initial',
            description: 'Initial version'
          }
        ]
      },
      {
        id: 'contract-details',
        title: 'Contract Details',
        content: 'Provide details about the contract type, duration, salary range, and benefits.',
        isLocked: false,
        isEditing: false,
        versions: [
          {
            id: 'contract-details-v1',
            content: 'Provide details about the contract type, duration, salary range, and benefits.',
            timestamp: new Date(),
            source: 'initial',
            description: 'Initial version'
          }
        ]
      },
      {
        id: 'how-to-apply',
        title: 'How to Apply',
        content: 'Provide instructions on how to apply for this position.',
        isLocked: false,
        isEditing: false,
        versions: [
          {
            id: 'how-to-apply-v1',
            content: 'Provide instructions on how to apply for this position.',
            timestamp: new Date(),
            source: 'initial',
            description: 'Initial version'
          }
        ]
      },
      {
        id: 'about-the-organization',
        title: 'About the Organization',
        content: 'Provide information about your organization, its mission, and its values.',
        isLocked: false,
        isEditing: false,
        versions: [
          {
            id: 'about-the-organization-v1',
            content: 'Provide information about your organization, its mission, and its values.',
            timestamp: new Date(),
            source: 'initial',
            description: 'Initial version'
          }
        ]
      }
    ];

    // Initialize qualifications subsections with default content
    setQualificationsSubsections([
      {
        id: 'required-qualifications',
        title: 'Required Qualifications',
        content: 'List the essential qualifications needed for this role.',
        isEditing: false
      },
      {
        id: 'preferred-qualifications',
        title: 'Preferred Qualifications',
        content: 'List qualifications that are desirable but not mandatory.',
        isEditing: false
      },
      {
        id: 'skills-competencies',
        title: 'Skills and Competencies',
        content: 'List the key skills and competencies needed for success in this role.',
        isEditing: false
      }
    ]);

    // Set default sections and order
    setSections(defaultSections);
    setSectionOrder(defaultSections.map(section => section.id));
  };

  // Handle section editing
  const toggleEditSection = (sectionId: string) => {
    setSections(prevSections => 
      prevSections.map(section => 
        section.id === sectionId 
          ? { 
              ...section, 
              isEditing: !section.isEditing,
              // If we're turning off editing, add a new version
              versions: !section.isEditing && unsavedChanges[sectionId] 
                ? [
                    ...section.versions,
                    {
                      id: `${section.id}-v${section.versions.length + 1}`,
                      content: section.content,
                      timestamp: new Date(),
                      source: 'user',
                      description: 'User edit'
                    }
                  ]
                : section.versions
            } 
          : section
      )
    );

    // Clear unsaved changes flag for this section
    if (unsavedChanges[sectionId]) {
      setUnsavedChanges(prev => ({
        ...prev,
        [sectionId]: false
      }));
    }

    // Clear autosave timer for this section
    if (autosaveTimers[sectionId]) {
      clearTimeout(autosaveTimers[sectionId]);
      setAutosaveTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[sectionId];
        return newTimers;
      });
    }
  };

  // Handle section content change
  const handleSectionContentChange = (sectionId: string, content: string) => {
    // Update section content
    setSections(prevSections => 
      prevSections.map(section => 
        section.id === sectionId 
          ? { ...section, content } 
          : section
      )
    );

    // Mark section as having unsaved changes
    setUnsavedChanges(prev => ({
      ...prev,
      [sectionId]: true
    }));

    // Clear existing timer for this section
    if (autosaveTimers[sectionId]) {
      clearTimeout(autosaveTimers[sectionId]);
    }

    // Set new autosave timer
    const timer = setTimeout(() => {
      // Add a new version when autosaving
      setSections(prevSections => 
        prevSections.map(section => 
          section.id === sectionId 
            ? { 
                ...section,
                versions: [
                  ...section.versions,
                  {
                    id: `${section.id}-v${section.versions.length + 1}`,
                    content,
                    timestamp: new Date(),
                    source: 'user',
                    description: 'Autosaved edit'
                  }
                ]
              } 
            : section
        )
      );

      // Clear unsaved changes flag
      setUnsavedChanges(prev => ({
        ...prev,
        [sectionId]: false
      }));

      // Show autosave toast
      toast.success('Changes autosaved');
    }, 5000); // 5 seconds autosave delay

    // Store the timer
    setAutosaveTimers(prev => ({
      ...prev,
      [sectionId]: timer
    }));
  };

  // Handle subsection editing
  const toggleEditSubsection = (subsectionId: string) => {
    setQualificationsSubsections(prev => 
      prev.map(subsection => 
        subsection.id === subsectionId 
          ? { ...subsection, isEditing: !subsection.isEditing } 
          : subsection
      )
    );

    // Update the main qualifications section with the combined content
    updateQualificationsMainSection();
  };

  // Handle subsection content change
  const handleSubsectionContentChange = (subsectionId: string, content: string) => {
    setQualificationsSubsections(prev => 
      prev.map(subsection => 
        subsection.id === subsectionId 
          ? { ...subsection, content } 
          : subsection
      )
    );

    // Update the main qualifications section with the combined content
    updateQualificationsMainSection();
  };

  // Update the main qualifications section with combined subsection content
  const updateQualificationsMainSection = () => {
    const combinedContent = qualificationsSubsections
      .map(subsection => `### ${subsection.title}\n${subsection.content}`)
      .join('\n\n');

    setSections(prevSections => 
      prevSections.map(section => 
        section.id === 'qualifications-and-competencies' 
          ? { 
              ...section, 
              content: combinedContent,
              // Add a new version if there are changes
              versions: [
                ...section.versions,
                {
                  id: `qualifications-and-competencies-v${section.versions.length + 1}`,
                  content: combinedContent,
                  timestamp: new Date(),
                  source: 'user',
                  description: 'Updated subsections'
                }
              ]
            } 
          : section
      )
    );

    // Mark as having unsaved changes
    setUnsavedChanges(prev => ({
      ...prev,
      'qualifications-and-competencies': true
    }));
  };

  // Toggle section lock
  const toggleLockSection = (sectionId: string) => {
    setSections(prevSections => 
      prevSections.map(section => 
        section.id === sectionId 
          ? { ...section, isLocked: !section.isLocked, isEditing: false } 
          : section
      )
    );
  };

  // Open AI improvement modal for a section
  const openAIModal = (sectionId: string) => {
    setCurrentAISection(sectionId);
    setAIInstructions('');
    setIsAIModalOpen(true);
  };

  // Handle AI improvement submission
  const handleAIImprovement = async () => {
    if (!currentAISection) return;

    setIsProcessing(true);

    try {
      // Find the current section
      const section = sections.find(s => s.id === currentAISection);
      if (!section) throw new Error('Section not found');

      // Get AI improvement
      const improvedContent = await refineJDSection(
        section.title,
        section.content,
        aiInstructions || `Improve this ${section.title} section to make it more engaging, clear, and effective.`
      );

      // Update section with improved content
      setSections(prevSections => 
        prevSections.map(s => 
          s.id === currentAISection 
            ? { 
                ...s, 
                content: improvedContent,
                versions: [
                  ...s.versions,
                  {
                    id: `${s.id}-v${s.versions.length + 1}`,
                    content: improvedContent,
                    timestamp: new Date(),
                    source: 'ai',
                    description: `AI improvement: ${aiInstructions || 'General enhancement'}`
                  }
                ]
              } 
            : s
        )
      );

      // Special handling for qualifications section
      if (currentAISection === 'qualifications-and-competencies') {
        // Parse the improved content to update subsections
        const requiredMatch = improvedContent.match(/###\s*Required\s+Qualifications([\s\S]*?)(?=###|$)/i);
        const preferredMatch = improvedContent.match(/###\s*Preferred\s+Qualifications([\s\S]*?)(?=###|$)/i);
        const skillsMatch = improvedContent.match(/###\s*Skills\s+and\s+Competencies([\s\S]*?)(?=###|$)/i);

        setQualificationsSubsections(prev => 
          prev.map(subsection => {
            if (subsection.id === 'required-qualifications' && requiredMatch) {
              return { ...subsection, content: requiredMatch[1].trim() };
            } else if (subsection.id === 'preferred-qualifications' && preferredMatch) {
              return { ...subsection, content: preferredMatch[1].trim() };
            } else if (subsection.id === 'skills-competencies' && skillsMatch) {
              return { ...subsection, content: skillsMatch[1].trim() };
            }
            return subsection;
          })
        );
      }

      toast.success('Section improved with AI');
      setIsAIModalOpen(false);
    } catch (error) {
      console.error('Error improving section with AI:', error);
      toast.error('Failed to improve section with AI');
    } finally {
      setIsProcessing(false);
    }
  };

  // Open version history modal for a section
  const openHistoryModal = (sectionId: string) => {
    setCurrentHistorySection(sectionId);
    setIsHistoryModalOpen(true);
  };

  // Restore a previous version
  const restoreVersion = (versionId: string) => {
    if (!currentHistorySection) return;

    // Find the section and version
    const section = sections.find(s => s.id === currentHistorySection);
    if (!section) return;

    const version = section.versions.find(v => v.id === versionId);
    if (!version) return;

    // Update section content with the version content
    setSections(prevSections => 
      prevSections.map(s => 
        s.id === currentHistorySection 
          ? { 
              ...s, 
              content: version.content,
              versions: [
                ...s.versions,
                {
                  id: `${s.id}-v${s.versions.length + 1}`,
                  content: version.content,
                  timestamp: new Date(),
                  source: 'user',
                  description: `Restored from version: ${version.description || version.id}`
                }
              ]
            } 
          : s
      )
    );

    // Special handling for qualifications section
    if (currentHistorySection === 'qualifications-and-competencies') {
      // Parse the restored content to update subsections
      const requiredMatch = version.content.match(/###\s*Required\s+Qualifications([\s\S]*?)(?=###|$)/i);
      const preferredMatch = version.content.match(/###\s*Preferred\s+Qualifications([\s\S]*?)(?=###|$)/i);
      const skillsMatch = version.content.match(/###\s*Skills\s+and\s+Competencies([\s\S]*?)(?=###|$)/i);

      setQualificationsSubsections(prev => 
        prev.map(subsection => {
          if (subsection.id === 'required-qualifications' && requiredMatch) {
            return { ...subsection, content: requiredMatch[1].trim() };
          } else if (subsection.id === 'preferred-qualifications' && preferredMatch) {
            return { ...subsection, content: preferredMatch[1].trim() };
          } else if (subsection.id === 'skills-competencies' && skillsMatch) {
            return { ...subsection, content: skillsMatch[1].trim() };
          }
          return subsection;
        })
      );
    }

    toast.success('Version restored');
    setIsHistoryModalOpen(false);
  };

  // Save the job draft
  const saveJobDraft = async () => {
    if (!profile?.id) {
      toast.error('You must be logged in to save a draft');
      return;
    }

    setIsSaving(true);

    try {
      // Prepare the draft data
      const draftData = {
        user_id: profile.id,
        title: jobTitle,
        organization_name: organizationName,
        description: generateFullJD(),
        draft_status: 'draft',
        section_order: JSON.stringify(sectionOrder),
        sections_data: JSON.stringify(sections),
        qualifications_subsections: JSON.stringify(qualificationsSubsections),
        ai_generated: true,
        last_edited_at: new Date().toISOString()
      };

      // Save to Supabase
      const { data, error } = await supabase
        .from('job_drafts')
        .insert(draftData)
        .select()
        .single();

      if (error) throw error;

      toast.success('Draft saved successfully');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate the full JD as markdown
  const generateFullJD = (): string => {
    let fullJD = `# ${jobTitle}\n\n`;

    // Add each section in the correct order
    sectionOrder.forEach(sectionId => {
      const section = sections.find(s => s.id === sectionId);
      if (section) {
        fullJD += `## ${section.title}\n${section.content}\n\n`;
      }
    });

    return fullJD;
  };

  // Handle preview
  const handlePreview = () => {
    setIsPreviewModalOpen(true);
  };

  // Handle share
  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  // Handle publish
  const handlePublish = async () => {
    if (!profile?.id) {
      toast.error('You must be logged in to publish a job');
      return;
    }

    setIsSaving(true);

    try {
      // First save as a draft
      const { data: draftData, error: draftError } = await supabase
        .from('job_drafts')
        .insert({
          user_id: profile.id,
          title: jobTitle,
          organization_name: organizationName,
          description: generateFullJD(),
          draft_status: 'ready',
          section_order: JSON.stringify(sectionOrder),
          sections_data: JSON.stringify(sections),
          qualifications_subsections: JSON.stringify(qualificationsSubsections),
          ai_generated: true,
          last_edited_at: new Date().toISOString()
        })
        .select()
        .single();

      if (draftError) throw draftError;

      // Then publish as a job
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .insert({
          user_id: profile.id,
          title: jobTitle,
          organization_name: organizationName,
          description: generateFullJD(),
          status: 'published',
          source_draft_id: draftData.id,
          ai_generated: true,
          published_at: new Date().toISOString()
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Update user progress flag
      await supabase
        .from('user_progress_flags')
        .update({ has_published_job: true })
        .eq('user_id', profile.id);

      toast.success('Job published successfully');
    } catch (error) {
      console.error('Error publishing job:', error);
      toast.error('Failed to publish job');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: '#FFFFFF' }}>
        {/* Header with title and actions */}
        <div className="border-b p-4 flex items-center justify-between" style={{ borderColor: '#D8D5D2' }}>
          <div>
            <h1 className="text-xl font-medium" style={{ color: '#3A3936' }}>
              Job Description Editor
            </h1>
            <p className="text-sm font-light" style={{ color: '#66615C' }}>
              Create and edit your job description
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                  className="h-9"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </TooltipTrigger>
              <TooltipContent>Preview JD</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="h-9"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </TooltipTrigger>
              <TooltipContent>Share JD</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveJobDraft}
                  className="h-9"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Draft
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save Draft</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={handlePublish}
                  className="h-9 text-white"
                  style={{ backgroundColor: '#D5765B' }}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Publish
                </Button>
              </TooltipTrigger>
              <TooltipContent>Publish Job</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Main content area with scrolling */}
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-4xl mx-auto">
            {/* Job Title */}
            <div className="mb-6">
              <Label htmlFor="job-title" className="text-sm font-medium mb-2 block" style={{ color: '#3A3936' }}>
                Job Title
              </Label>
              <Input
                id="job-title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Enter job title"
                className="text-lg font-medium"
              />
            </div>

            {/* Organization Name */}
            <div className="mb-6">
              <Label htmlFor="organization-name" className="text-sm font-medium mb-2 block" style={{ color: '#3A3936' }}>
                Organization Name
              </Label>
              <Input
                id="organization-name"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Enter organization name"
              />
            </div>

            <Separator className="my-6" />

            {/* Reorderable Sections */}
            <Reorder.Group 
              axis="y" 
              values={sectionOrder} 
              onReorder={setSectionOrder}
              className="space-y-6"
            >
              {sectionOrder.map((sectionId) => {
                const section = sections.find(s => s.id === sectionId);
                if (!section) return null;

                // Special handling for qualifications section
                if (section.id === 'qualifications-and-competencies') {
                  return (
                    <Reorder.Item 
                      key={section.id} 
                      value={section.id}
                      className={`border rounded-lg shadow-sm transition-all duration-200 ${section.isLocked ? 'bg-gray-50' : 'hover:shadow-md'}`}
                      style={{ borderColor: '#D8D5D2' }}
                      disabled={section.isLocked}
                    >
                      <div className="p-4">
                        {/* Section Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <div className="cursor-move mr-2 text-gray-400 hover:text-gray-600 transition-colors duration-200">
                              <GripVertical className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-medium" style={{ color: '#3A3936' }}>
                              {section.title}
                            </h3>
                            {unsavedChanges[section.id] && (
                              <Badge variant="outline" className="ml-2 text-xs" style={{ borderColor: '#D5765B', color: '#D5765B' }}>
                                Unsaved
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openAIModal(section.id)}
                                  disabled={section.isLocked}
                                  className="h-8 w-8 p-0"
                                >
                                  <Wand2 className="w-4 h-4" style={{ color: '#D5765B' }} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Improve with AI</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openHistoryModal(section.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <div className="relative">
                                    <History className="w-4 h-4" />
                                    <span className="absolute -top-1 -right-1 bg-gray-200 text-gray-700 rounded-full text-[10px] w-3 h-3 flex items-center justify-center">
                                      {section.versions.length}
                                    </span>
                                  </div>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Version History</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleLockSection(section.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  {section.isLocked ? (
                                    <Lock className="w-4 h-4" />
                                  ) : (
                                    <Unlock className="w-4 h-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{section.isLocked ? 'Unlock Section' : 'Lock Section'}</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        {/* Qualifications Subsections */}
                        <div className="space-y-4">
                          {qualificationsSubsections.map((subsection) => (
                            <div 
                              key={subsection.id}
                              className="border rounded-md p-3"
                              style={{ borderColor: '#F1EFEC' }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium" style={{ color: '#3A3936' }}>
                                  {subsection.title}
                                </h4>
                                
                                <div className="flex items-center space-x-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleEditSubsection(subsection.id)}
                                        disabled={section.isLocked}
                                        className="h-7 w-7 p-0"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{subsection.isEditing ? 'Save' : 'Edit'}</TooltipContent>
                                  </Tooltip>
                                  
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openAIModal(subsection.id)}
                                        disabled={section.isLocked}
                                        className="h-7 w-7 p-0"
                                      >
                                        <Wand2 className="w-3 h-3" style={{ color: '#D5765B' }} />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Improve with AI</TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                              
                              {subsection.isEditing ? (
                                <Textarea
                                  value={subsection.content}
                                  onChange={(e) => handleSubsectionContentChange(subsection.id, e.target.value)}
                                  placeholder={`Enter ${subsection.title.toLowerCase()}`}
                                  className="min-h-[100px] text-sm"
                                  disabled={section.isLocked}
                                />
                              ) : (
                                <div 
                                  className="prose prose-sm max-w-none"
                                  style={{ color: '#3A3936' }}
                                >
                                  {subsection.content.split('\n').map((line, i) => (
                                    <p key={i} className="mb-1 text-sm">
                                      {line}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </Reorder.Item>
                  );
                }

                // Regular section rendering
                return (
                  <Reorder.Item 
                    key={section.id} 
                    value={section.id}
                    className={`border rounded-lg shadow-sm transition-all duration-200 ${section.isLocked ? 'bg-gray-50' : 'hover:shadow-md'}`}
                    style={{ borderColor: '#D8D5D2' }}
                    disabled={section.isLocked}
                  >
                    <div className="p-4">
                      {/* Section Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="cursor-move mr-2 text-gray-400 hover:text-gray-600 transition-colors duration-200">
                            <GripVertical className="w-5 h-5" />
                          </div>
                          <h3 className="text-lg font-medium" style={{ color: '#3A3936' }}>
                            {section.title}
                          </h3>
                          {unsavedChanges[section.id] && (
                            <Badge variant="outline" className="ml-2 text-xs" style={{ borderColor: '#D5765B', color: '#D5765B' }}>
                              Unsaved
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleEditSection(section.id)}
                                disabled={section.isLocked}
                                className="h-8 w-8 p-0"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{section.isEditing ? 'Save' : 'Edit'}</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openAIModal(section.id)}
                                disabled={section.isLocked}
                                className="h-8 w-8 p-0"
                              >
                                <Wand2 className="w-4 h-4" style={{ color: '#D5765B' }} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Improve with AI</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openHistoryModal(section.id)}
                                className="h-8 w-8 p-0"
                              >
                                <div className="relative">
                                  <History className="w-4 h-4" />
                                  <span className="absolute -top-1 -right-1 bg-gray-200 text-gray-700 rounded-full text-[10px] w-3 h-3 flex items-center justify-center">
                                    {section.versions.length}
                                  </span>
                                </div>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Version History</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleLockSection(section.id)}
                                className="h-8 w-8 p-0"
                              >
                                {section.isLocked ? (
                                  <Lock className="w-4 h-4" />
                                ) : (
                                  <Unlock className="w-4 h-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{section.isLocked ? 'Unlock Section' : 'Lock Section'}</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      {/* Section Content */}
                      {section.isEditing ? (
                        <Textarea
                          value={section.content}
                          onChange={(e) => handleSectionContentChange(section.id, e.target.value)}
                          placeholder={`Enter ${section.title.toLowerCase()}`}
                          className="min-h-[150px]"
                          disabled={section.isLocked}
                        />
                      ) : (
                        <div 
                          className="prose max-w-none"
                          style={{ color: '#3A3936' }}
                        >
                          {section.content.split('\n').map((line, i) => (
                            <p key={i} className="mb-2">
                              {line}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          </div>
        </ScrollArea>

        {/* Preview Modal */}
        <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Job Description Preview</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">{jobTitle}</h1>
                <div className="flex items-center space-x-4 mb-6">
                  {organizationName && (
                    <div className="flex items-center">
                      <Building className="w-4 h-4 mr-1" />
                      <span>{organizationName}</span>
                    </div>
                  )}
                </div>
                
                {sectionOrder.map(sectionId => {
                  const section = sections.find(s => s.id === sectionId);
                  if (!section) return null;
                  
                  return (
                    <div key={section.id} className="mb-6">
                      <h2 className="text-xl font-semibold mb-2">{section.title}</h2>
                      <div className="prose max-w-none">
                        {section.content.split('\n').map((line, i) => (
                          <p key={i} className="mb-2">
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button onClick={() => setIsPreviewModalOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Share Modal */}
        <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share Job Description</DialogTitle>
              <DialogDescription>
                Choose how you want to share this job description
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <Button variant="outline" className="flex flex-col items-center justify-center h-20 space-y-2">
                <MessageSquare className="w-5 h-5" />
                <span className="text-xs">WhatsApp</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center justify-center h-20 space-y-2">
                <Briefcase className="w-5 h-5" />
                <span className="text-xs">LinkedIn</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center justify-center h-20 space-y-2">
                <Copy className="w-5 h-5" />
                <span className="text-xs">Copy Link</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center justify-center h-20 space-y-2">
                <Mail className="w-5 h-5" />
                <span className="text-xs">Email</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center justify-center h-20 space-y-2 col-span-2">
                <FileText className="w-5 h-5" />
                <span className="text-xs">Copy Text</span>
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsShareModalOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AI Improvement Modal */}
        <Dialog open={isAIModalOpen} onOpenChange={setIsAIModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Improve with AI</DialogTitle>
              <DialogDescription>
                Provide specific instructions for how you'd like to improve this section
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="ai-instructions" className="text-sm font-medium mb-2 block">
                Instructions (optional)
              </Label>
              <Textarea
                id="ai-instructions"
                value={aiInstructions}
                onChange={(e) => setAIInstructions(e.target.value)}
                placeholder="E.g., Make it more concise, add more details about technical skills, use more inclusive language..."
                className="min-h-[100px]"
              />
              
              <div className="mt-4 bg-gray-50 p-3 rounded-md">
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2" style={{ color: '#D5765B' }} />
                  AI Improvement Focus
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="justify-start text-xs h-8"
                    onClick={() => setAIInstructions('Make this section more concise and impactful')}
                  >
                    Conciseness
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="justify-start text-xs h-8"
                    onClick={() => setAIInstructions('Use more inclusive language in this section')}
                  >
                    Inclusivity
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="justify-start text-xs h-8"
                    onClick={() => setAIInstructions('Add more specific details and examples')}
                  >
                    Specificity
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="justify-start text-xs h-8"
                    onClick={() => setAIInstructions('Make this section more engaging and motivating')}
                  >
                    Engagement
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsAIModalOpen(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAIImprovement}
                disabled={isProcessing}
                className="text-white"
                style={{ backgroundColor: '#D5765B' }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Improve
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Version History Modal */}
        <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Version History</DialogTitle>
              <DialogDescription>
                View and restore previous versions of this section
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="py-4 space-y-4">
                {currentHistorySection && (
                  <>
                    {sections
                      .find(s => s.id === currentHistorySection)
                      ?.versions
                      .slice()
                      .reverse()
                      .map((version, index, array) => (
                        <div 
                          key={version.id}
                          className="border rounded-md p-3"
                          style={{ borderColor: index === 0 ? '#D5765B' : '#D8D5D2' }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="flex items-center">
                                <Badge 
                                  variant={version.source === 'ai' ? 'default' : 'outline'}
                                  className="text-xs mr-2"
                                  style={version.source === 'ai' ? {} : { borderColor: '#D8D5D2', color: '#66615C' }}
                                >
                                  {version.source === 'initial' ? 'Initial' : 
                                   version.source === 'ai' ? 'AI Enhanced' : 'User Edit'}
                                </Badge>
                                <span className="text-xs" style={{ color: '#66615C' }}>
                                  {version.timestamp.toLocaleString()}
                                </span>
                              </div>
                              {version.description && (
                                <p className="text-xs mt-1" style={{ color: '#3A3936' }}>
                                  {version.description}
                                </p>
                              )}
                            </div>
                            
                            {index !== 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => restoreVersion(version.id)}
                                className="h-7 text-xs"
                              >
                                Restore
                              </Button>
                            )}
                          </div>
                          
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm max-h-40 overflow-y-auto">
                            {version.content.split('\n').map((line, i) => (
                              <p key={i} className="mb-1">
                                {line}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))
                    }
                  </>
                )}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button onClick={() => setIsHistoryModalOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// Utility function to format dates
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}