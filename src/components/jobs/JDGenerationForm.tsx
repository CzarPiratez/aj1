import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Link as LinkIcon, 
  Upload, 
  Wand2, 
  AlertCircle,
  Loader2,
  CheckCircle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useJobDraft } from '@/hooks/useJobDraft';
import { toast } from 'sonner';

interface JDGenerationFormProps {
  userId: string;
  onGenerated: (draftId: string) => void;
}

export function JDGenerationForm({ userId, onGenerated }: JDGenerationFormProps) {
  const [activeTab, setActiveTab] = useState<string>('brief');
  const [brief, setBrief] = useState<string>('');
  const [orgLink, setOrgLink] = useState<string>('');
  const [uploadedJD, setUploadedJD] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const { generateJD, generating, error } = useJobDraft({ userId });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setValidationError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      setValidationError('Please upload a PDF, Word document, or text file.');
      return;
    }
    
    // Read file content
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setUploadedJD(event.target.result.toString());
        setUploadedFileName(file.name);
        setValidationError(null);
      }
    };
    reader.onerror = () => {
      setValidationError('Failed to read file. Please try again.');
    };
    reader.readAsText(file);
  };

  const validateInputs = (): boolean => {
    if (activeTab === 'brief') {
      if (!brief.trim()) {
        setValidationError('Please enter a job brief.');
        return false;
      }
    } else if (activeTab === 'link') {
      if (!brief.trim()) {
        setValidationError('Please enter a job brief.');
        return false;
      }
      if (!orgLink.trim()) {
        setValidationError('Please enter an organization website URL.');
        return false;
      }
      // Basic URL validation
      try {
        new URL(orgLink.startsWith('http') ? orgLink : `https://${orgLink}`);
      } catch (e) {
        setValidationError('Please enter a valid URL.');
        return false;
      }
    } else if (activeTab === 'upload') {
      if (!uploadedJD) {
        setValidationError('Please upload a job description file.');
        return false;
      }
    }
    
    setValidationError(null);
    return true;
  };

  const handleGenerate = async () => {
    if (!validateInputs()) return;
    
    try {
      const input: { brief?: string; orgLink?: string; uploadedJD?: string } = {};
      
      if (activeTab === 'brief' || activeTab === 'link') {
        input.brief = brief;
      }
      
      if (activeTab === 'link') {
        input.orgLink = orgLink;
      }
      
      if (activeTab === 'upload') {
        input.uploadedJD = uploadedJD;
      }
      
      const result = await generateJD(input);
      
      if (result.success && result.draftId) {
        onGenerated(result.draftId);
      }
    } catch (err) {
      toast.error('Failed to generate job description');
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-medium flex items-center">
          <Wand2 className="w-5 h-5 mr-2" style={{ color: '#D5765B' }} />
          Generate Job Description
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="brief" className="text-sm">
              <FileText className="w-4 h-4 mr-2" />
              Brief Only
            </TabsTrigger>
            <TabsTrigger value="link" className="text-sm">
              <LinkIcon className="w-4 h-4 mr-2" />
              Brief + Link
            </TabsTrigger>
            <TabsTrigger value="upload" className="text-sm">
              <Upload className="w-4 h-4 mr-2" />
              Upload JD
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="brief" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Job Brief
              </label>
              <Textarea
                placeholder="Enter details about the role, organization, responsibilities, and qualifications..."
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                className="min-h-[200px]"
              />
              <p className="text-xs text-gray-500">
                Provide as much detail as possible for the best results. Include role title, organization name, key responsibilities, and required qualifications.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="link" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Job Brief
              </label>
              <Textarea
                placeholder="Enter details about the role, responsibilities, and qualifications..."
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                className="min-h-[150px]"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Organization Website URL
              </label>
              <Input
                placeholder="https://organization.org"
                value={orgLink}
                onChange={(e) => setOrgLink(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                We'll analyze the website to understand the organization's mission and values.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Upload Existing Job Description
              </label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="jd-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                />
                {uploadedFileName ? (
                  <div className="flex items-center justify-center space-x-2">
                    <FileText className="w-5 h-5 text-green-600" />
                    <span className="text-sm">{uploadedFileName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setUploadedJD('');
                        setUploadedFileName('');
                      }}
                      className="h-8 w-8 p-0 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm mb-2">Drag and drop a file or click to browse</p>
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('jd-upload')?.click()}
                    >
                      Select File
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      Supported formats: PDF, Word, Text
                    </p>
                  </>
                )}
              </div>
            </div>
          </TabsContent>
          
          {validationError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{validationError}</p>
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="text-white"
              style={{ backgroundColor: '#D5765B' }}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Job Description
                </>
              )}
            </Button>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}