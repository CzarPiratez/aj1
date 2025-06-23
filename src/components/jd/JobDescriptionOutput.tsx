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
  X,
  DollarSign,
  Share2,
  ExternalLink,
  MessageSquare,
  Linkedin,
  Facebook,
  Twitter,
  Plus,
  Minus,
  RefreshCw
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getSDGInfo } from '@/lib/jobDescriptionParser';
import { refineContent } from '@/lib/ai';

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
  salaryRange?: string;
  howToApply?: string;
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

const AVAILABLE_SDGS = [
  'SDG 1', 'SDG 2', 'SDG 3', 'SDG 4', 'SDG 5', 'SDG 6', 'SDG 7', 'SDG 8',
  'SDG 9', 'SDG 10', 'SDG 11', 'SDG 12', 'SDG 13', 'SDG 14', 'SDG 15', 'SDG 16', 'SDG 17'
];

const AVAILABLE_SECTORS = [
  'Health', 'Education', 'Environment', 'Human Rights', 'Humanitarian',
  'Development', 'Gender', 'Livelihoods', 'Water & Sanitation', 'Food Security',
  'Child Protection', 'Governance', 'Emergency Response', 'Advocacy'
];

const CONTRACT_TYPES = [
  'Full-Time', 'Part-Time', 'Contract', 'Consultant', 'Volunteer', 'Temporary', 'Permanent', 'Fixed-Term'
];

export function JobDescriptionOutput({ 
  jobData, 
  onSave, 
  onPublish, 
  isPublishing = false 
}: JobDescriptionOutputProps) {
  const [data, setData] = useState<JobDescriptionData>(jobData);
  const [showPreview, setShowPreview] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isRefiningDEI, setIsRefiningDEI] = useState(false);
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
    
    try {
      const section = data.sections.find(s => s.id === sectionId);
      if (!section) return;

      const refinedContent = await refineContent(
        section.content,
        'job-description',
        `Improve this ${section.title} section for clarity, inclusivity, and nonprofit sector best practices.`
      );

      handleSectionEdit(sectionId, refinedContent);
      toast.success('Section refined successfully!');
    } catch (error) {
      console.error('Error refining section:', error);
      toast.error('Failed to refine section. Please try again.');
    } finally {
      setIsRefining(null);
    }
  };

  const handleRefineDEI = async ()=> {
    setIsRefiningDEI(true);
    
    try {
      // Combine all sections for DEI refinement
      const allContent = data.sections.map(s => `${s.title}:\n${s.content}`).join('\n\n');
      
      const refinedContent = await refineContent(
        allContent,
        'job-description',
        'Improve this job description for diversity, equity, and inclusion. Make language more inclusive, remove bias, and ensure accessibility.'
      );

      // Parse the refined content back into sections
      const refinedSections = refinedContent.split(/\n\n(?=[A-Za-z\s]+:)/);
      const updatedSections = [...data.sections];
      
      for (const refinedSection of refinedSections) {
        const titleMatch = refinedSection.match(/^([A-Za-z\s]+):/);
        if (titleMatch) {
          const title = titleMatch[1].trim();
          const content = refinedSection.replace(/^[A-Za-z\s]+:/, '').trim();
          
          // Find matching section by title
          const sectionIndex = updatedSections.findIndex(s => 
            s.title.toLowerCase() === title.toLowerCase()
          );
          
          if (sectionIndex !== -1) {
            updatedSections[sectionIndex].content = content;
          }
        }
      }
      
      // Update data with refined sections
      setData(prev => ({
        ...prev,
        sections: updatedSections,
        deiScore: Math.min(100, prev.deiScore + 15) // Improve DEI score
      }));
      
      toast.success('DEI language improved successfully!');
    } catch (error) {
      console.error('Error refining DEI language:', error);
      toast.error('Failed to improve DEI language. Please try again.');
    } finally {
      setIsRefiningDEI(false);
    }
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

  const downloadAsPDF = () => {
    // Mock PDF download - in a real implementation, you would use a library like jsPDF
    toast.info('PDF download feature coming soon!');
  };

  const downloadAsDocx = () => {
    // Mock DOCX download - in a real implementation, you would use a library for DOCX generation
    toast.info('DOCX download feature coming soon!');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Job Opportunity: ${data.title}`);
    const body = encodeURIComponent(`Check out this job opportunity: ${data.title}\n\n${data.summary}\n\nApply by: ${data.applicationDeadline || 'See job posting for details'}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(`Job Opportunity: ${data.title}\n\n${data.summary}\n\nApply by: ${data.applicationDeadline || 'See job posting for details'}`);
    window.open(`https://wa.me/?text=${text}`);
  };

  const shareViaLinkedIn = () => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(data.title);
    const summary = encodeURIComponent(data.summary);
    window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}&summary=${summary}`);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981'; // Green
    if (score >= 60) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  const handleAddSDG = (sdg: string) => {
    if (!data.sdgs.includes(sdg)) {
      setData(prev => ({
        ...prev,
        sdgs: [...prev.sdgs, sdg]
      }));
    }
  };

  const handleRemoveSDG = (sdg: string) => {
    setData(prev => ({
      ...prev,
      sdgs: prev.sdgs.filter(s => s !== sdg)
    }));
  };

  const handleAddSector = (sector: string) => {
    if (!data.sector.includes(sector)) {
      setData(prev => ({
        ...prev,
        sector: [...prev.sector, sector]
      }));
    }
  };

  const handleRemoveSector = (sector: string) => {
    setData(prev => ({
      ...prev,
      sector: prev.sector.filter(s => s !== sector)
    }));
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
                  variant="outline"
                  size="sm"
                  onClick={() => setShowShareDialog(true)}
                  className="h-8 w-8 p-0 rounded-lg border hover:shadow-sm transition-all duration-200"
                  style={{ borderColor: '#D8D5D2', color: '#3A3936' }}
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Share JD</TooltipContent>
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
          <div className="p-6 space-y-6 max-w-4xl mx-auto">
            {/* Job Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-left"
            >
              <Input
                value={data.title}
                onChange={(e) => setData(prev => ({ ...prev, title: e.target.value }))}
                className="text-2xl font-medium border-0 bg-transparent p-0 focus:ring-0 focus-visible:ring-0"
                style={{ color: '#3A3936' }}
                placeholder="Job Title"
              />
            </motion.div>

            {/* Key Information Block */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-white rounded-xl shadow-sm p-4 border-0"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center text-xs font-medium" style={{ color: '#66615C' }}>
                    <MapPin className="w-3 h-3 mr-1" />
                    Location
                  </div>
                  <Input
                    value={data.location}
                    onChange={(e) => setData(prev => ({ ...prev, location: e.target.value }))}
                    className="h-8 text-sm border-0 bg-transparent p-0 focus:ring-0 focus-visible:ring-0"
                    style={{ color: '#3A3936' }}
                    placeholder="Location"
                  />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center text-xs font-medium" style={{ color: '#66615C' }}>
                    <Clock className="w-3 h-3 mr-1" />
                    Contract Type
                  </div>
                  <Select
                    value={data.contractType}
                    onValueChange={(value) => setData(prev => ({ ...prev, contractType: value }))}
                  >
                    <SelectTrigger className="h-8 text-sm border-0 bg-transparent p-0 focus:ring-0 focus-visible:ring-0">
                      <SelectValue placeholder="Select contract type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRACT_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center text-xs font-medium" style={{ color: '#66615C' }}>
                    <Building className="w-3 h-3 mr-1" />
                    Organization
                  </div>
                  <Input
                    value={data.organization}
                    onChange={(e) => setData(prev => ({ ...prev, organization: e.target.value }))}
                    className="h-8 text-sm border-0 bg-transparent p-0 focus:ring-0 focus-visible:ring-0"
                    style={{ color: '#3A3936' }}
                    placeholder="Organization"
                  />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center text-xs font-medium" style={{ color: '#66615C' }}>
                    <Calendar className="w-3 h-3 mr-1" />
                    Application Deadline
                  </div>
                  <Input
                    value={data.applicationDeadline || ''}
                    onChange={(e) => setData(prev => ({ ...prev, applicationDeadline: e.target.value }))}
                    className="h-8 text-sm border-0 bg-transparent p-0 focus:ring-0 focus-visible:ring-0"
                    style={{ color: '#3A3936' }}
                    placeholder="e.g., June 30, 2025"
                  />
                </div>
              </div>
              
              {/* Salary Range (Optional) */}
              {(data.salaryRange || true) && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: '#F1EFEC' }}>
                  <div className="flex items-center text-xs font-medium mb-1" style={{ color: '#66615C' }}>
                    <DollarSign className="w-3 h-3 mr-1" />
                    Salary Range (Optional)
                  </div>
                  <Input
                    value={data.salaryRange || ''}
                    onChange={(e) => setData(prev => ({ ...prev, salaryRange: e.target.value }))}
                    className="h-8 text-sm border-0 bg-transparent p-0 focus:ring-0 focus-visible:ring-0"
                    style={{ color: '#3A3936' }}
                    placeholder="e.g., $50,000 - $65,000 per year"
                  />
                </div>
              )}
            </motion.div>

            {/* Job Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="text-left"
            >
              <h3 className="text-sm font-medium mb-2" style={{ color: '#3A3936' }}>
                Job Summary
              </h3>
              <Textarea
                value={data.summary}
                onChange={(e) => setData(prev => ({ ...prev, summary: e.target.value }))}
                className="min-h-[100px] border rounded-lg font-light leading-relaxed text-sm"
                style={{ 
                  color: '#3A3936',
                  borderColor: '#D8D5D2',
                  backgroundColor: '#FFFFFF'
                }}
                placeholder="Job summary and mission alignment..."
              />
            </motion.div>

            {/* SDG & Sector Alignment */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="grid md:grid-cols-2 gap-6"
            >
              {/* SDGs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium" style={{ color: '#3A3936' }}>
                    SDG Alignment
                  </h3>
                  <Select
                    onValueChange={handleAddSDG}
                  >
                    <SelectTrigger className="w-[180px] h-7 text-xs">
                      <SelectValue placeholder="Add SDG" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_SDGS
                        .filter(sdg => !data.sdgs.includes(sdg))
                        .map(sdg => {
                          const info = getSDGInfo(sdg);
                          return (
                            <SelectItem key={sdg} value={sdg}>
                              {sdg}: {info?.name || sdg}
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.sdgs.map((sdg, index) => {
                    const sdgInfo = getSDGInfo(sdg);
                    return (
                      <Tooltip key={index}>
                        <TooltipTrigger asChild>
                          <div className="group relative">
                            <Badge
                              variant="outline"
                              className="px-3 py-1 text-xs pr-7"
                              style={{ borderColor: '#10B981', color: '#10B981' }}
                            >
                              {sdg}
                              <button
                                onClick={() => handleRemoveSDG(sdg)}
                                className="absolute right-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-medium">{sdgInfo?.name || sdg}</p>
                            <p className="text-xs">{sdgInfo?.description || 'Sustainable Development Goal'}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>

              {/* Sectors */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium" style={{ color: '#3A3936' }}>
                    Sector & Impact Area
                  </h3>
                  <Select
                    onValueChange={handleAddSector}
                  >
                    <SelectTrigger className="w-[180px] h-7 text-xs">
                      <SelectValue placeholder="Add Sector" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_SECTORS
                        .filter(sector => !data.sector.includes(sector))
                        .map(sector => (
                          <SelectItem key={sector} value={sector}>
                            {sector}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.sector.map((sector, index) => (
                    <div key={index} className="group relative">
                      <Badge
                        variant="outline"
                        className="px-3 py-1 text-xs pr-7"
                        style={{ borderColor: '#D5765B', color: '#D5765B' }}
                      >
                        {sector}
                        <button
                          onClick={() => handleRemoveSector(sector)}
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    </div>
                  ))}
                </div>
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
                  <CardTitle className="text-sm font-medium flex items-center justify-between" style={{ color: '#3A3936' }}>
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2" style={{ color: '#10B981' }} />
                      Quality Assessment
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefineDEI}
                      disabled={isRefiningDEI}
                      className="h-7 text-xs"
                      style={{ 
                        borderColor: '#D5765B',
                        color: '#D5765B'
                      }}
                    >
                      {isRefiningDEI ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 mr-2" style={{ borderColor: '#D5765B' }}></div>
                          Improving...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3 h-3 mr-2" />
                          Improve DEI Language
                        </>
                      )}
                    </Button>
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

            {/* How to Apply Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.6 }}
            >
              <Card className="border-0 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium" style={{ color: '#3A3936' }}>
                    How to Apply
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Textarea
                    value={data.howToApply || ''}
                    onChange={(e) => setData(prev => ({ ...prev, howToApply: e.target.value }))}
                    className="min-h-[100px] border font-light text-sm resize-none"
                    style={{ 
                      backgroundColor: '#FFFFFF',
                      borderColor: '#D8D5D2',
                      color: '#3A3936'
                    }}
                    placeholder="Provide clear instructions on how to apply for this position..."
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </ScrollArea>

        {/* Preview Modal */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
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
                  <Select
                    onValueChange={(value) => {
                      if (value === 'txt') downloadAsText();
                      if (value === 'pdf') downloadAsPDF();
                      if (value === 'docx') downloadAsDocx();
                    }}
                  >
                    <SelectTrigger className="h-8 px-3 w-[130px]">
                      <Download className="w-3 h-3 mr-2" />
                      Download
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="txt">Text (.txt)</SelectItem>
                      <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                      <SelectItem value="docx">Word (.docx)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6 p-6" style={{ backgroundColor: '#FFFFFF' }}>
                <div className="text-left">
                  <h1 className="text-2xl font-medium mb-4" style={{ color: '#3A3936' }}>
                    {data.title}
                  </h1>
                  
                  {/* Key Information */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 rounded-lg" style={{ backgroundColor: '#F9F7F4' }}>
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
                    <div className="flex items-center space-x-2">
                      <Building className="w-4 h-4" style={{ color: '#66615C' }} />
                      <span className="text-sm" style={{ color: '#3A3936' }}>
                        {data.organization}
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
                    {data.salaryRange && (
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4" style={{ color: '#66615C' }} />
                        <span className="text-sm" style={{ color: '#3A3936' }}>
                          {data.salaryRange}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* SDGs and Sectors */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {data.sdgs.map((sdg, index) => {
                      const sdgInfo = getSDGInfo(sdg);
                      return (
                        <Badge
                          key={`sdg-${index}`}
                          variant="outline"
                          className="px-3 py-1 text-xs"
                          style={{ borderColor: '#10B981', color: '#10B981' }}
                        >
                          {sdg} - {sdgInfo?.name || ''}
                        </Badge>
                      );
                    })}
                    {data.sector.map((sector, index) => (
                      <Badge
                        key={`sector-${index}`}
                        variant="outline"
                        className="px-3 py-1 text-xs"
                        style={{ borderColor: '#D5765B', color: '#D5765B' }}
                      >
                        {sector}
                      </Badge>
                    ))}
                  </div>
                  
                  <p className="font-light leading-relaxed mb-6" style={{ color: '#3A3936' }}>
                    {data.summary}
                  </p>
                </div>
                
                {data.sections.map((section) => (
                  <div key={section.id} className="text-left">
                    <h2 className="text-lg font-medium mb-3" style={{ color: '#3A3936' }}>
                      {section.title}
                    </h2>
                    <div className="font-light leading-relaxed whitespace-pre-wrap" style={{ color: '#3A3936' }}>
                      {section.content}
                    </div>
                  </div>
                ))}
                
                {data.howToApply && (
                  <div className="text-left">
                    <h2 className="text-lg font-medium mb-3" style={{ color: '#3A3936' }}>
                      How to Apply
                    </h2>
                    <div className="font-light leading-relaxed whitespace-pre-wrap" style={{ color: '#3A3936' }}>
                      {data.howToApply}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Share Dialog */}
        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Share Job Description</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={shareViaEmail}
                  className="h-16 flex flex-col items-center justify-center space-y-2"
                >
                  <Mail className="w-5 h-5" style={{ color: '#D5765B' }} />
                  <span className="text-xs">Email</span>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={shareViaWhatsApp}
                  className="h-16 flex flex-col items-center justify-center space-y-2"
                >
                  <MessageSquare className="w-5 h-5" style={{ color: '#25D366' }} />
                  <span className="text-xs">WhatsApp</span>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={shareViaLinkedIn}
                  className="h-16 flex flex-col items-center justify-center space-y-2"
                >
                  <Linkedin className="w-5 h-5" style={{ color: '#0077B5' }} />
                  <span className="text-xs">LinkedIn</span>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={copyToClipboard}
                  className="h-16 flex flex-col items-center justify-center space-y-2"
                >
                  <Copy className="w-5 h-5" style={{ color: '#3A3936' }} />
                  <span className="text-xs">Copy Text</span>
                </Button>
              </div>
              
              <div className="pt-4 border-t" style={{ borderColor: '#F1EFEC' }}>
                <p className="text-xs text-center" style={{ color: '#66615C' }}>
                  Share this job description with your network to find the perfect candidate!
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}