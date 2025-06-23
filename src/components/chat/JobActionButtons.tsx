import React from 'react';
import { motion } from 'framer-motion';
import { Edit, Eye, Send, Sparkles, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface JobActionButtonsProps {
  onEdit: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  isPublishing?: boolean;
}

export function JobActionButtons({ 
  onEdit, 
  onPreview, 
  onPublish, 
  onDownload,
  onShare,
  isPublishing = false 
}: JobActionButtonsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-4"
    >
      <Card 
        className="border-0 shadow-sm"
        style={{ backgroundColor: '#F1EFEC' }}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4" style={{ color: '#D5765B' }} />
              <h4 
                className="text-sm font-medium"
                style={{ color: '#3A3936' }}
              >
                Job Description Ready
              </h4>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="h-8 px-3 rounded-lg font-light text-xs border hover:shadow-sm transition-all duration-200"
              style={{ 
                borderColor: '#D8D5D2',
                color: '#3A3936',
                backgroundColor: '#FFFFFF'
              }}
            >
              <Edit className="w-3 h-3 mr-2" />
              Edit
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onPreview}
              className="h-8 px-3 rounded-lg font-light text-xs border hover:shadow-sm transition-all duration-200"
              style={{ 
                borderColor: '#D8D5D2',
                color: '#3A3936',
                backgroundColor: '#FFFFFF'
              }}
            >
              <Eye className="w-3 h-3 mr-2" />
              Preview
            </Button>
            
            {onDownload && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 rounded-lg font-light text-xs border hover:shadow-sm transition-all duration-200"
                    style={{ 
                      borderColor: '#D8D5D2',
                      color: '#3A3936',
                      backgroundColor: '#FFFFFF'
                    }}
                  >
                    <Download className="w-3 h-3 mr-2" />
                    Download
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={onDownload}>
                    Text (.txt)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDownload}>
                    PDF (.pdf)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDownload}>
                    Word (.docx)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {onShare && (
              <Button
                variant="outline"
                size="sm"
                onClick={onShare}
                className="h-8 px-3 rounded-lg font-light text-xs border hover:shadow-sm transition-all duration-200"
                style={{ 
                  borderColor: '#D8D5D2',
                  color: '#3A3936',
                  backgroundColor: '#FFFFFF'
                }}
              >
                <Share2 className="w-3 h-3 mr-2" />
                Share
              </Button>
            )}
            
            <Button
              size="sm"
              onClick={onPublish}
              disabled={isPublishing}
              className="h-8 px-4 rounded-lg font-light text-white hover:opacity-90 transition-all duration-200 text-xs flex items-center"
              style={{ backgroundColor: '#D5765B' }}
            >
              {isPublishing ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="w-3 h-3 mr-2" />
                  Publish Job
                </>
              )}
            </Button>
          </div>
          
          <p 
            className="text-xs font-light mt-3 opacity-75"
            style={{ color: '#66615C' }}
          >
            Review and publish your job to start attracting mission-aligned candidates.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}