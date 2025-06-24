import React from 'react';
import { 
  Printer, 
  Download, 
  Share2, 
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';

interface JDSection {
  id: string;
  title: string;
  content: string;
  isDraft: boolean;
}

interface JDPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobTitle: string;
  sections: JDSection[];
  onDownload: () => void;
  onPrint: () => void;
}

export function JDPreviewModal({ 
  isOpen, 
  onClose, 
  jobTitle, 
  sections,
  onDownload,
  onPrint
}: JDPreviewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] w-[90vw]">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium" style={{ color: '#3A3936' }}>
            Job Description Preview
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-120px)] mt-4 pr-4">
          <div className="space-y-6 print:space-y-4">
            {/* Job Title */}
            <div className="text-center mb-8 print:mb-6">
              <h1 className="text-3xl font-bold print:text-2xl" style={{ color: '#3A3936' }}>
                {jobTitle}
              </h1>
            </div>
            
            {/* Sections in order */}
            {sections.filter(section => section.content.trim()).map((section, index, filteredSections) => (
              <div key={section.id} className="print:break-inside-avoid">
                <div className="flex items-center space-x-2 mb-2">
                  <h2 className="text-xl font-semibold print:text-lg" style={{ color: '#3A3936' }}>
                    {section.title}
                  </h2>
                  
                  {section.isDraft && (
                    <Badge 
                      variant="outline" 
                      className="text-xs px-2 py-0 h-5 print:hidden"
                      style={{ borderColor: '#F59E0B', color: '#F59E0B' }}
                    >
                      Not Final
                    </Badge>
                  )}
                </div>
                
                <div 
                  className="prose prose-sm max-w-none print:text-sm"
                  style={{ color: '#3A3936' }}
                >
                  {section.content.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      <br />
                    </React.Fragment>
                  ))}
                </div>
                
                {index < filteredSections.length - 1 && (
                  <Separator className="mt-4 print:mt-3" style={{ backgroundColor: '#F1EFEC' }} />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <DialogFooter className="flex justify-between items-center mt-4 print:hidden">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrint}
              className="h-8 text-xs"
              style={{ borderColor: '#D8D5D2', color: '#66615C' }}
            >
              <Printer className="w-3.5 h-3.5 mr-2" />
              Print
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              className="h-8 text-xs"
              style={{ borderColor: '#D8D5D2', color: '#66615C' }}
            >
              <Download className="w-3.5 h-3.5 mr-2" />
              Download
            </Button>
          </div>
          
          <Button
            onClick={onClose}
            className="h-8 text-white"
            style={{ backgroundColor: '#D5765B' }}
          >
            Close Preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}