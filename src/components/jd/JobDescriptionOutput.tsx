import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  Eye, 
  Upload, 
  Edit3, 
  Lock, 
  Unlock, 
  Wand2, 
  Globe, 
  MapPin, 
  Calendar, 
  Users, 
  Target, 
  CheckCircle,
  AlertTriangle,
  Info,
  Star,
  Clock,
  Building,
  Mail,
  FileText,
  Download,
  Copy,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export interface JobSection {
  id: string;
  title: string;
  content: string;
  isLocked: boolean;
  isEditing: boolean;
}

export interface JobDescriptionData {
  id?: string;
  title: string;
  summary: string;
  sector: string[];
  sdgs: string[];
  sections: JobSection[];
  organization: string;
  location: string;
  contractType: string;
  applicationDeadline?: string;
  clarityScore: number;
  readingLevel: string;
  deiScore: number;
  jargonWarnings: string[];
}

interface JobDescriptionOutputProps {
  jobData: JobDescriptionData;
  onSave: (data: JobDescriptionData) => void;
  onPublish: (data: JobDescriptionData) => void;
  isPublishing?: boolean;
}

const SDG_NAMES: Record<string, string> = {
  'SDG 1': 'No Poverty',
  'SDG 2': 'Zero Hunger',
  'SDG 3': 'Good Health and Well-being',
  'SDG 4': 'Quality Education',
  'SDG 5': 'Gender Equality',
  'SDG 6': 'Clean Water and Sanitation',
  'SDG 7': 'Affordable and Clean Energy',
  'SDG 8': 'Decent Work and Economic Growth',
  'SDG 9': 'Industry, Innovation and Infrastructure',
  'SDG 10': 'Reduced Inequalities',
  'SDG 11': 'Sustainable Cities and Communities',
  'SDG 12': 'Responsible Consumption and Production',
  'SDG 13': 'Climate Action',
  'SDG 14': 'Life Below Water',
  'SDG 15': 'Life on Land',
  'SDG 16': 'Peace, Justice and Strong Institutions',
  'SDG 17': 'Partnerships for the Goals'
};

export function JobDescriptionOutput({ 
  jobData, 
  onSave, 
  onPublish, 
  isPublishing = false 
}: JobDescriptionOutputProps) {
  const [data, setData] = useState<JobDescriptionData>(jobData);
  const [showPreview, setShowPreview] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isRefining, setIsRefining] = useState<string | null>(null);

  const handleSectionEdit = (sectionId: string, newContent: string) => {
    setData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, content: newContent }
          : section
      )
    }));
  };

  const toggleSectionEdit = (sectionId: string) => {
    setData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, isEditing: !section.isEditing }
          : section
      )
    }));
  };

  const toggleSectionLock = (sectionId: string) => {
    setData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, isLocked: !section.isLocked, isEditing: false }
          : section
      )
    }));
  };

  const handleRefineSection = async (sectionId: string) => {
    setIsRefining(sectionId);
    
    // Simulate AI refinement
    setTimeout(() => {
      const section = data.sections.find(s => s.id === sectionId);
      if (section) {
        const refinedContent = section.content + '\n\n[AI-refined for clarity and inclusivity]';
        handleSectionEdit(sectionId, refinedContent);
      }
      setIsRefining(null);
      toast.success('Section refined successfully!');
    }, 2000);
  };

  const handleSave = () => {
    onSave(data);
    toast.success('Job description saved as draft');
  };

  const handlePublish = () => {
    onPublish(data);
  };

  const copyToClipboard = () => {
    const fullText = `${data.title}\n\n${data.summary}\n\n${data.sections.map(s => `${s.title}\n${s.content}`).join('\n\n')}`;
    navigator.clipboard.writeText(fullText);
    toast.success('Job description copied to clipboard');
  };

  const downloadAsText = () => {
    const fullText = `${data.title}\n\n${data.summary}\n\n${data.sections.map(s => `${s.title}\n${s.content}`).join('\n\n')}`;
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981'; // Green
    if (score >= 60) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-full flex flex-col" style={{ backgroundColor: '#F9F7F4' }}>
        {/* Header with Action Icons */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#D8D5D2' }}>
          <div>
            <h2 className="text-lg font-medium" style={{ color: '#3A3936' }}>
              Job Description
            </h2>
            <p className="text-sm font-light" style={{ color: '#66615C' }}>
              AI-generated • Ready for review and publishing
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  className="h-8 w-8 p-0 rounded-lg border hover:shadow-sm transition-all duration-200"
                  style={{ borderColor: '#D8D5D2', color: '#3A3936' }}
                >
                  <Save className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Save Draft</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(true)}
                  className="h-8 w-8 p-0 rounded-lg border hover:shadow-sm transition-all duration-200"
                  style={{ borderColor: '#D8D5D2', color: '#3A3936' }}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Preview JD</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="h-8 px-4 rounded-lg font-light text-white hover:opacity-90 transition-all duration-200 text-xs"
                  style={{ backgroundColor: '#D5765B' }}
                >
                  {isPublishing ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3 h-3 mr-2" />
                      Publish
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Publish Job</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Main Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Job Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Input
                value={data.title}
                onChange={(e) => setData(prev => ({ ...prev, title: e.target.value }))}
                className="text-xl font-medium border-0 bg-transparent p-0 focus:ring-0 focus-visible:ring-0"
                style={{ color: '#3A3936' }}
                placeholder="Job Title"
              />
            </motion.div>

            {/* Job Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Textarea
                value={data.summary}
                onChange={(e) => setData(prev => ({ ...prev, summary: e.target.value }))}
                className="min-h-[100px] border-0 bg-transparent p-0 resize-none focus:ring-0 focus-visible:ring-0 font-light leading-relaxed"
                style={{ color: '#3A3936' }}
                placeholder="Job summary and mission alignment..."
              />
            </motion.div>

            {/* Sector & Impact Area */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-medium" style={{ color: '#3A3936' }}>
                Sector & Impact Area
              </h3>
              <div className="flex flex-wrap gap-2">
                {data.sector.map((sector, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="px-3 py-1 text-xs"
                    style={{ borderColor: '#D5765B', color: '#D5765B' }}
                  >
                    {sector}
                  </Badge>
                ))}
              </div>
            </motion.div>

            {/* SDG Tags */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-medium" style={{ color: '#3A3936' }}>
                Sustainable Development Goals
              </h3>
              <div className="flex flex-wrap gap-2">
                {data.sdgs.map((sdg, index) => (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="px-3 py-1 text-xs cursor-help"
                        style={{ borderColor: '#10B981', color: '#10B981' }}
                      >
                        {sdg}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {SDG_NAMES[sdg] || sdg}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </motion.div>

            {/* DEI & Clarity Review */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <Card className="border-0 shadow-sm" style={{ backgroundColor: '#F1EFEC' }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center" style={{ color: '#3A3936' }}>
                    <CheckCircle className="w-4 h-4 mr-2" style={{ color: '#10B981' }} />
                    Quality Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div 
                        className="text-lg font-medium mb-1"
                        style={{ color: getScoreColor(data.clarityScore) }}
                      >
                        {data.clarityScore}%
                      </div>
                      <p className="text-xs" style={{ color: '#66615C' }}>
                        Clarity Score
                      </p>
                    </div>
                    <div className="text-center">
                      <div 
                        className="text-lg font-medium mb-1"
                        style={{ color: '#3A3936' }}
                      >
                        {data.readingLevel}
                      </div>
                      <p className="text-xs" style={{ color: '#66615C' }}>
                        Reading Level
                      </p>
                    </div>
                    <div className="text-center">
                      <div 
                        className="text-lg font-medium mb-1"
                        style={{ color: getScoreColor(data.deiScore) }}
                      >
                        {data.deiScore}%
                      </div>
                      <p className="text-xs" style={{ color: '#66615C' }}>
                        DEI Score
                      </p>
                    </div>
                  </div>
                  
                  {data.jargonWarnings.length > 0 && (
                    <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: '#FEF3CD' }}>
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5" style={{ color: '#F59E0B' }} />
                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#92400E' }}>
                            Jargon Warnings
                          </p>
                          <ul className="text-xs space-y-1" style={{ color: '#92400E' }}>
                            {data.jargonWarnings.map((warning, index) => (
                              <li key={index}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Job Sections */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              className="space-y-4"
            >
              <h3 className="text-sm font-medium" style={{ color: '#3A3936' }}>
                Job Description Sections
              </h3>
              
              {data.sections.map((section, index) => (
                <Card 
                  key={section.id}
                  className="border-0 shadow-sm hover:shadow-md transition-all duration-200"
                  style={{ backgroundColor: '#FFFFFF' }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium" style={{ color: '#3A3936' }}>
                        {section.title}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRefineSection(section.id)}
                              disabled={section.isLocked || isRefining === section.id}
                              className="h-6 w-6 p-0 rounded-md hover:shadow-sm transition-all duration-200"
                              style={{ color: '#66615C' }}
                            >
                              {isRefining === section.id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2" style={{ borderColor: '#D5765B' }}></div>
                              ) : (
                                <Wand2 className="w-3 h-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Refine with AI</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSectionEdit(section.id)}
                              disabled={section.isLocked}
                              className="h-6 w-6 p-0 rounded-md hover:shadow-sm transition-all duration-200"
                              style={{ color: '#66615C' }}
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Edit Section</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSectionLock(section.id)}
                              className="h-6 w-6 p-0 rounded-md hover:shadow-sm transition-all duration-200"
                              style={{ color: section.isLocked ? '#D5765B' : '#66615C' }}
                            >
                              {section.isLocked ? (
                                <Lock className="w-3 h-3" />
                              ) : (
                                <Unlock className="w-3 h-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {section.isLocked ? 'Unlock Section' : 'Lock Section'}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {section.isEditing ? (
                      <Textarea
                        value={section.content}
                        onChange={(e) => handleSectionEdit(section.id, e.target.value)}
                        className="min-h-[120px] border font-light text-sm resize-none"
                        style={{ 
                          backgroundColor: '#FFFFFF',
                          borderColor: '#D8D5D2',
                          color: '#3A3936'
                        }}
                      />
                    ) : (
                      <div 
                        className="font-light text-sm leading-relaxed whitespace-pre-wrap"
                        style={{ color: '#3A3936' }}
                      >
                        {section.content}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </motion.div>

            {/* Contract Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.6 }}
            >
              <Card className="border-0 shadow-sm" style={{ backgroundColor: '#F1EFEC' }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium" style={{ color: '#3A3936' }}>
                    Contract Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4" style={{ color: '#66615C' }} />
                      <span className="text-sm" style={{ color: '#3A3936' }}>
                        {data.location}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" style={{ color: '#66615C' }} />
                      <span className="text-sm" style={{ color: '#3A3936' }}>
                        {data.contractType}
                      </span>
                    </div>
                    {data.applicationDeadline && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" style={{ color: '#66615C' }} />
                        <span className="text-sm" style={{ color: '#3A3936' }}>
                          Apply by {data.applicationDeadline}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <Building className="w-4 h-4" style={{ color: '#66615C' }} />
                      <span className="text-sm" style={{ color: '#3A3936' }}>
                        {data.organization}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </ScrollArea>

        {/* Preview Modal */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Job Description Preview</span>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    className="h-8 px-3"
                  >
                    <Copy className="w-3 h-3 mr-2" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadAsText}
                    className="h-8 px-3"
                  >
                    <Download className="w-3 h-3 mr-2" />
                    Download
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 p-6" style={{ backgroundColor: '#F9F7F4' }}>
                <div>
                  <h1 className="text-2xl font-medium mb-4" style={{ color: '#3A3936' }}>
                    {data.title}
                  </h1>
                  <p className="font-light leading-relaxed" style={{ color: '#3A3936' }}>
                    {data.summary}
                  </p>
                </div>
                
                {data.sections.map((section) => (
                  <div key={section.id}>
                    <h2 className="text-lg font-medium mb-3" style={{ color: '#3A3936' }}>
                      {section.title}
                    </h2>
                    <div className="font-light leading-relaxed whitespace-pre-wrap" style={{ color: '#3A3936' }}>
                      {section.content}
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