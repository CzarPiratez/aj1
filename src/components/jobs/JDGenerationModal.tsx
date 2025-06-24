import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Wand2, X } from 'lucide-react';
import { JDGenerationForm } from './JDGenerationForm';
import { JDEditor } from './JDEditor';

interface JDGenerationModalProps {
  userId: string;
  trigger?: React.ReactNode;
  onComplete?: (draftId: string) => void;
}

export function JDGenerationModal({ userId, trigger, onComplete }: JDGenerationModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [generatedDraftId, setGeneratedDraftId] = useState<string | null>(null);
  const [publishedJobId, setPublishedJobId] = useState<string | null>(null);

  const handleGenerated = (draftId: string) => {
    setGeneratedDraftId(draftId);
  };

  const handlePublished = (jobId: string) => {
    setPublishedJobId(jobId);
    if (onComplete) {
      onComplete(jobId);
    }
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    // Reset state after dialog is closed
    setTimeout(() => {
      setGeneratedDraftId(null);
      setPublishedJobId(null);
    }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="text-white" style={{ backgroundColor: '#D5765B' }}>
            <Wand2 className="w-4 h-4 mr-2" />
            Generate Job Description
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] w-[90vw]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-medium" style={{ color: '#3A3936' }}>
              {generatedDraftId ? 'Edit Job Description' : 'Generate Job Description'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="overflow-hidden flex-1 min-h-[60vh]">
          {generatedDraftId ? (
            <JDEditor 
              draftId={generatedDraftId} 
              userId={userId} 
              onPublished={handlePublished}
            />
          ) : (
            <JDGenerationForm 
              userId={userId} 
              onGenerated={handleGenerated}
            />
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}