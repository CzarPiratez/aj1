import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
import { useJobDraft } from '@/hooks/useJobDraft';
import { toast } from 'sonner';

interface JDEditorProps {
  draftId: string;
  userId: string;
  onPublished?: (jobId: string) => void;
}

interface JDSection {
  id: string;
  title: string;
  content: string;
  locked: boolean;
  isEditing?: boolean;
  version_history: { timestamp: string; content: string }[];
}

export function JDEditor({ draftId, userId, onPublished }: JDEditorProps) {
  const { draft, loading, error, updateDraft, publishDraft, publishing } = useJobDraft({ 
    draftId, 
    userId 
  });
  
  const [jobTitle, setJobTitle] = useState<string>('');
  const [sections, setSections] = useState<JDSection[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  
  // Initialize state from draft data
  useEffect(() => {
    if (draft) {
      setJobTitle(draft.title || '');
      
      if (draft.sections && Array.isArray(draft.sections)) {
        setSections(draft.sections.map((section: any) => ({
          ...section,
          isEditing: false
        })));
      }
    }
  }, [draft]);

  // Handle section content change
  const handleSectionChange = (id: string, newContent: string) => {
    setSections(prevSections => 
      prevSections.map(section => 
        section.id === id 
          ? { 
              ...section, 
              content: newContent,
              version_history: [
                ...section.version_history,
                { timestamp: new Date().toISOString(), content: newContent }
              ]
            } 
          : section
      )
    );
  };

  // Toggle section lock state
  const toggleSectionLock = (id: string) => {
    setSections(prevSections => 
      prevSections.map(section => 
        section.id === id 
          ? { ...section, locked: !section.locked, isEditing: false } 
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

  // Save all changes to the draft
  const saveChanges = async () => {
    try {
      await updateDraft({
        title: jobTitle,
        sections: sections.map(({ isEditing, ...section }) => section),
        draft_status: 'ready'
      });
      
      toast.success('Changes saved successfully');
    } catch (error) {
      toast.error('Failed to save changes');
    }
  };

  // Handle publishing the job
  const handlePublish = async () => {
    setIsPublishing(true);
    
    try {
      const job = await publishDraft();
      
      if (job && onPublished) {
        onPublished(job.id);
      }
      
      toast.success('Job published successfully');
    } catch (error) {
      toast.error('Failed to publish job');
    } finally {
      setIsPublishing(false);
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
              Review and refine your AI-generated job description
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
              onClick={saveChanges}
              className="h-9 text-white"
              style={{ backgroundColor: '#D5765B' }}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className="h-9 text-white"
              style={{ backgroundColor: '#10B981' }}
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
            <div className="space-y-4">
              {sections.map((section) => (
                <Card 
                  key={section.id}
                  className="border shadow-sm hover:shadow-md transition-all duration-200"
                  style={{ borderColor: '#D8D5D2' }}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="cursor-move">
                          <GripVertical className="w-5 h-5" style={{ color: '#D8D5D2' }} />
                        </div>
                        
                        <CardTitle className="text-base font-medium" style={{ color: '#3A3936' }}>
                          {section.title}
                        </CardTitle>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSectionLock(section.id)}
                          className="h-7 w-7 p-0 rounded-full"
                          title={section.locked ? 'Unlock Section' : 'Lock Section'}
                          style={{ color: '#66615C' }}
                        >
                          {section.locked ? (
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
                          disabled={section.locked}
                          style={{ color: section.locked ? '#D8D5D2' : section.isEditing ? '#10B981' : '#66615C' }}
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
              ))}
            </div>
            
            {/* Metadata Display */}
            {draft?.metadata && (
              <div className="mt-8 border-t pt-6" style={{ borderColor: '#D8D5D2' }}>
                <h3 className="text-lg font-medium mb-4" style={{ color: '#3A3936' }}>
                  Job Metadata & Analysis
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* SDGs */}
                  {draft.metadata.sdgs && draft.metadata.sdgs.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center">
                          <Target className="w-4 h-4 mr-2" style={{ color: '#D5765B' }} />
                          Sustainable Development Goals
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {draft.metadata.sdgs.map((sdg: string) => (
                            <Badge 
                              key={sdg}
                              variant="outline"
                              className="text-xs"
                              style={{ borderColor: '#D5765B', color: '#D5765B' }}
                            >
                              {sdg}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Sectors */}
                  {draft.metadata.sectors && draft.metadata.sectors.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center">
                          <Building className="w-4 h-4 mr-2" style={{ color: '#D5765B' }} />
                          Sectors
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {draft.metadata.sectors.map((sector: string) => (
                            <Badge 
                              key={sector}
                              variant="outline"
                              className="text-xs"
                              style={{ borderColor: '#66615C', color: '#66615C' }}
                            >
                              {sector}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* DEI Analysis */}
                  {draft.metadata.dei_score && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center">
                          <Users className="w-4 h-4 mr-2" style={{ color: '#D5765B' }} />
                          DEI Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: '#66615C' }}>DEI Score</span>
                          <Badge 
                            variant="outline"
                            className="text-xs"
                            style={{ 
                              borderColor: draft.metadata.dei_score > 80 ? '#10B981' : '#F59E0B',
                              color: draft.metadata.dei_score > 80 ? '#10B981' : '#F59E0B'
                            }}
                          >
                            {draft.metadata.dei_score}/100
                          </Badge>
                        </div>
                        
                        {draft.metadata.gender_bias_notes && draft.metadata.gender_bias_notes.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-xs font-medium" style={{ color: '#66615C' }}>Suggestions:</span>
                            <ul className="text-xs space-y-1 pl-4 list-disc" style={{ color: '#66615C' }}>
                              {draft.metadata.gender_bias_notes.map((note: string, index: number) => (
                                <li key={index}>{note}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Clarity Analysis */}
                  {draft.metadata.clarity_score && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center">
                          <Lightbulb className="w-4 h-4 mr-2" style={{ color: '#D5765B' }} />
                          Clarity Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: '#66615C' }}>Clarity Score</span>
                          <Badge 
                            variant="outline"
                            className="text-xs"
                            style={{ 
                              borderColor: draft.metadata.clarity_score > 80 ? '#10B981' : '#F59E0B',
                              color: draft.metadata.clarity_score > 80 ? '#10B981' : '#F59E0B'
                            }}
                          >
                            {draft.metadata.clarity_score}/100
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: '#66615C' }}>Reading Level</span>
                          <span className="text-xs font-medium" style={{ color: '#3A3936' }}>
                            {draft.metadata.reading_level}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: '#66615C' }}>Tone</span>
                          <Badge 
                            variant="outline"
                            className="text-xs"
                            style={{ borderColor: '#D5765B', color: '#D5765B' }}
                          >
                            {draft.metadata.tone}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}