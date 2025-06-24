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
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PostJobEditorProps {
  generatedJD?: string;
  activeTask?: string;
  step?: string;
}

interface JDSection {
  id: string;
  title: string;
  content: string;
  isLocked: boolean;
  isEditing: boolean;
}

export function PostJobEditor({ generatedJD, activeTask, step }: PostJobEditorProps) {
  const [sections, setSections] = useState<JDSection[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isDraft, setIsDraft] = useState(true);

  // Initialize sections when JD is generated
  useEffect(() => {
    if (generatedJD && step === 'generated') {
      // Parse the generated JD into sections
      const parsedSections = parseJDIntoSections(generatedJD);
      setSections(parsedSections);
    }
  }, [generatedJD, step]);

  const parseJDIntoSections = (jdContent: string): JDSection[] => {
    // Simple parsing logic - in real implementation, this would be more sophisticated
    const lines = jdContent.split('\n');
    const sections: JDSection[] = [];
    let currentSection: Partial<JDSection> = {};
    let currentContent: string[] = [];

    lines.forEach((line, index) => {
      if (line.startsWith('#')) {
        // Save previous section
        if (currentSection.title) {
          sections.push({
            id: `section-${sections.length}`,
            title: currentSection.title,
            content: currentContent.join('\n').trim(),
            isLocked: true,
            isEditing: false
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
        isEditing: false
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

  const saveDraft = async () => {
    // In real implementation, this would save to the database
    console.log('Saving draft...');
    setIsDraft(true);
  };

  const publishJob = async () => {
    // In real implementation, this would publish the job
    console.log('Publishing job...');
    setIsDraft(false);
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
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="h-8"
            >
              <Eye className="w-4 h-4 mr-2" />
              {isPreviewMode ? 'Edit' : 'Preview'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={saveDraft}
              className="h-8"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            
            <Button
              size="sm"
              onClick={publishJob}
              className="h-8 text-white"
              style={{ backgroundColor: '#D5765B' }}
            >
              <Send className="w-4 h-4 mr-2" />
              Publish Job
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {isPreviewMode ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Preview Mode */}
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="prose prose-sm max-w-none">
                      {sections.map((section) => (
                        <div key={section.id} className="mb-6">
                          <h3 
                            className="text-lg font-medium mb-3"
                            style={{ color: '#3A3936' }}
                          >
                            {section.title}
                          </h3>
                          <div 
                            className="whitespace-pre-wrap font-light leading-relaxed"
                            style={{ color: '#66615C' }}
                          >
                            {section.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="edit"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {/* Edit Mode - Section-based editing */}
                {sections.map((section, index) => (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base" style={{ color: '#3A3936' }}>
                            {section.title}
                          </CardTitle>
                          
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
                    className="w-full h-12 border-dashed"
                    style={{ borderColor: '#D5765B', color: '#D5765B' }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Add Custom Section
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
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
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>Auto-saved</span>
          </div>
        </div>
      </div>
    </div>
  );
}